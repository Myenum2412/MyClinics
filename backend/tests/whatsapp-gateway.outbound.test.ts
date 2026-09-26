import type { Db } from "mongodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb } from "./helpers/fake-db";
import { drainNotificationsViaGateway, phoneFromRemoteId, type GatewayApi } from "@/services/whatsapp/gateway/drain";
import { gateway, GatewayError } from "@/services/whatsapp/gateway/client";
import { signedHeaders, verifySignature } from "@/services/whatsapp/gateway/signature";
import { processDueReminders } from "@/services/reminder/reminder.service";
import { WhatsappService } from "@/clinic/modules/whatsapp/whatsapp.service";
import type { ClinicContext } from "@/clinic/core/context";

const SECRET = "test-gateway-secret-long-enough";
const CLINIC_A = "clc_aaaaaaaaaaaaaaaaaa";
const CLINIC_B = "clc_bbbbbbbbbbbbbbbbbb";

let db: Db;
let dump: (n: string) => Record<string, any>[];
const api = { getSession: vi.fn(), sendText: vi.fn(), sendDocument: vi.fn() };
const asApi = () => api as unknown as GatewayApi;
const ready = (clinics: string[]) =>
  api.getSession.mockImplementation(async (id: string) => (clinics.includes(id) ? { clinicId: id, status: "READY", phone: "1", qr: null } : null));

const notif = (over: Record<string, unknown> = {}) => ({
  type: "appointment", organizationId: CLINIC_A, clinicId: CLINIC_A, remoteId: "919876543210@c.us", message: "Hi Asha",
  status: "queued", attempts: 0, lastError: null, createdAt: new Date("2026-09-25T10:00:00Z"), sentAt: null, ...over,
});

beforeEach(() => {
  process.env.GATEWAY_URL = "http://gateway.local";
  process.env.GATEWAY_SECRET = SECRET;
  api.getSession.mockReset();
  api.sendText.mockReset().mockResolvedValue({ id: 1, duplicate: false });
  api.sendDocument.mockReset().mockResolvedValue({ id: 2, duplicate: false });
});
afterEach(() => {
  delete process.env.GATEWAY_URL;
  delete process.env.GATEWAY_SECRET;
  delete process.env.GATEWAY_LEGACY_SESSION_ID;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function seed(docs: Record<string, unknown>[]) {
  const f = createFakeDb({ wa_notifications: docs, reminders: [] });
  db = f.db;
  dump = f.dump;
}

describe("phoneFromRemoteId", () => {
  it("extracts digits", () => {
    expect(phoneFromRemoteId("919876543210@c.us")).toBe("919876543210");
    expect(phoneFromRemoteId("919876543210")).toBe("919876543210");
    expect(phoneFromRemoteId(null)).toBeNull();
    expect(phoneFromRemoteId("123@c.us")).toBeNull();
  });
});

describe("drainNotificationsViaGateway", () => {
  it("does nothing when the gateway is not configured", async () => {
    delete process.env.GATEWAY_URL;
    seed([notif()]);
    expect(await drainNotificationsViaGateway(db, asApi())).toEqual({ sent: 0, failed: 0, skipped: 0 });
    expect(dump("wa_notifications")[0].status).toBe("queued");
  });

  it("hands a text notification to the right clinic's session with an idempotency key, then marks it sent", async () => {
    seed([notif()]);
    ready([CLINIC_A]);
    const r = await drainNotificationsViaGateway(db, asApi());
    expect(r).toEqual({ sent: 1, failed: 0, skipped: 0 });
    const doc = dump("wa_notifications")[0];
    expect(api.sendText).toHaveBeenCalledWith(CLINIC_A, "919876543210", "Hi Asha", { dedupeKey: `notif:${doc._id}` });
    expect(doc).toMatchObject({ status: "sent", lastError: null });
    expect(doc.sentAt).toBeInstanceOf(Date);
  });

  it("sends media notifications as documents (reports / prescriptions)", async () => {
    seed([notif({ mediaFilename: "report.pdf", mediaMimetype: "application/pdf", mediaData: "JVBERi0=", message: "Your report" })]);
    ready([CLINIC_A]);
    await drainNotificationsViaGateway(db, asApi());
    expect(api.sendDocument).toHaveBeenCalledWith(CLINIC_A, expect.objectContaining({
      to: "919876543210", filename: "report.pdf", mimetype: "application/pdf", caption: "Your report", contentBase64: "JVBERi0=",
    }));
    expect(api.sendText).not.toHaveBeenCalled();
    expect(dump("wa_notifications")[0].status).toBe("sent");
  });

  it("routes each clinic through its own number and leaves rows of disconnected clinics queued", async () => {
    seed([notif({ clinicId: CLINIC_A, message: "A" }), notif({ clinicId: CLINIC_B, organizationId: CLINIC_B, message: "B" })]);
    ready([CLINIC_A]); // clinic B's WhatsApp is not connected
    const r = await drainNotificationsViaGateway(db, asApi());
    expect(r).toEqual({ sent: 1, failed: 0, skipped: 1 });
    expect(api.sendText).toHaveBeenCalledTimes(1);
    expect(dump("wa_notifications").find((d) => d.message === "B")!.status).toBe("queued");
    expect(dump("wa_notifications").find((d) => d.message === "B")!.attempts).toBe(0);
  });

  it("uses the platform session for notifications without a clinic", async () => {
    seed([notif({ clinicId: null })]);
    ready(["platform"]);
    await drainNotificationsViaGateway(db, asApi());
    expect(api.sendText).toHaveBeenCalledWith("platform", "919876543210", "Hi Asha", expect.anything());
    process.env.GATEWAY_LEGACY_SESSION_ID = "central";
    seed([notif({ clinicId: null })]);
    ready(["central"]);
    api.sendText.mockClear();
    await drainNotificationsViaGateway(db, asApi());
    expect(api.sendText).toHaveBeenCalledWith("central", expect.anything(), expect.anything(), expect.anything());
  });

  it("keeps rows queued WITHOUT burning retries when the gateway is down, and stops the tick", async () => {
    seed([notif({ message: "1" }), notif({ message: "2" })]);
    ready([CLINIC_A]);
    api.sendText.mockRejectedValue(new GatewayError(0, "gateway unreachable"));
    const r = await drainNotificationsViaGateway(db, asApi());
    expect(api.sendText).toHaveBeenCalledTimes(1); // did not hammer the dead gateway
    expect(r.sent).toBe(0);
    for (const d of dump("wa_notifications")) expect(d).toMatchObject({ status: "queued", attempts: 0 });
  });

  it("counts an attempt when the gateway rejects the message, failing it after 3", async () => {
    seed([notif({ attempts: 2, mediaFilename: "x.exe", mediaMimetype: "application/x-msdownload", mediaData: "AAAA" })]);
    ready([CLINIC_A]);
    api.sendDocument.mockRejectedValue(new GatewayError(400, "unsupported mimetype"));
    const r = await drainNotificationsViaGateway(db, asApi());
    expect(r.failed).toBe(1);
    expect(dump("wa_notifications")[0]).toMatchObject({ status: "failed", attempts: 3, lastError: "unsupported mimetype" });
  });

  it("fails rows with an unusable phone number instead of retrying forever", async () => {
    seed([notif({ remoteId: null })]);
    ready([CLINIC_A]);
    await drainNotificationsViaGateway(db, asApi());
    expect(dump("wa_notifications")[0]).toMatchObject({ status: "failed", lastError: "invalid phone number" });
  });

  it("does not resend rows that are already sent", async () => {
    seed([notif({ status: "sent" })]);
    ready([CLINIC_A]);
    await drainNotificationsViaGateway(db, asApi());
    expect(api.sendText).not.toHaveBeenCalled();
  });
});

describe("legacy reminders via the gateway", () => {
  const reminder = (over: Record<string, unknown> = {}) => ({
    appointmentId: "a1", organizationId: "org1", patientName: "Asha", phone: "9876543210", remoteId: "919876543210@c.us",
    date: "2026-09-25", time: "10:00", doctorName: "Dr. K", message: "Reminder!", status: "queued", attempts: 0, lastError: null, createdAt: new Date(), sentAt: null, ...over,
  });
  const seedReminders = (docs: Record<string, unknown>[]) => {
    const f = createFakeDb({ reminders: docs });
    db = f.db;
    dump = f.dump;
  };

  it("sends queued reminders through the platform session", async () => {
    seedReminders([reminder()]);
    ready(["platform"]);
    const r = await processDueReminders(db, "org1", asApi());
    expect(r.sent).toBe(1);
    expect(api.sendText).toHaveBeenCalledWith("platform", "919876543210", "Reminder!", { dedupeKey: expect.stringMatching(/^reminder:/) });
    expect(dump("reminders")[0].status).toBe("sent");
  });

  it("waits while the platform session is disconnected", async () => {
    seedReminders([reminder()]);
    ready([]);
    expect(await processDueReminders(db, "org1", asApi())).toEqual({ sent: 0, failed: 0, pending: 0 });
    expect(dump("reminders")[0].status).toBe("queued");
  });
});

describe("gateway client", () => {
  const okJson = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

  it("signs every request (verifiable by the gateway) and sends the body once", async () => {
    const fetchMock = vi.fn(async () => okJson({ id: 5, duplicate: false }, 202));
    vi.stubGlobal("fetch", fetchMock);
    const r = await gateway.sendText("clc_a", "919876543210", "Hello", { dedupeKey: "k1", priority: 0 });
    expect(r).toEqual({ id: 5, duplicate: false });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://gateway.local/sessions/clc_a/messages");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ to: "919876543210", text: "Hello", dedupeKey: "k1", priority: 0 });
    const h = init.headers as Record<string, string>;
    expect(verifySignature(SECRET, { timestamp: h["x-gateway-timestamp"], signature: h["x-gateway-signature"] }, init.body as string)).toBe(true);
  });

  it("signs bodiless requests over an empty string", async () => {
    const fetchMock = vi.fn(async () => okJson({ clinicId: "c", status: "READY", phone: "1", qr: null }));
    vi.stubGlobal("fetch", fetchMock);
    await gateway.getSession("c");
    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    const h = init.headers as Record<string, string>;
    expect(init.body).toBeUndefined();
    expect(verifySignature(SECRET, { timestamp: h["x-gateway-timestamp"], signature: h["x-gateway-signature"] }, "")).toBe(true);
  });

  it("url-encodes the clinic id", async () => {
    const fetchMock = vi.fn(async () => okJson({}));
    vi.stubGlobal("fetch", fetchMock);
    await gateway.startSession("a/b");
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe("http://gateway.local/sessions/a%2Fb/start");
  });

  it("maps 404 to null for getSession, other errors to GatewayError", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okJson({ error: "unknown clinic" }, 404)));
    expect(await gateway.getSession("nope")).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => okJson({ error: "invalid signature" }, 401)));
    await expect(gateway.getSession("x")).rejects.toMatchObject({ name: "GatewayError", status: 401, message: "invalid signature" });
  });

  it("reports an unreachable gateway as status 0", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("ECONNREFUSED"); }));
    await expect(gateway.getSession("x")).rejects.toMatchObject({ status: 0 });
  });

  it("refuses to run unconfigured", async () => {
    delete process.env.GATEWAY_URL;
    await expect(gateway.getSession("x")).rejects.toThrow("not configured");
  });

  it("signature helpers reject tampering", () => {
    const h = signedHeaders(SECRET, "body");
    const parts = { timestamp: h["x-gateway-timestamp"], signature: h["x-gateway-signature"] };
    expect(verifySignature(SECRET, parts, "body")).toBe(true);
    expect(verifySignature(SECRET, parts, "bodY")).toBe(false);
    expect(verifySignature("other-secret-value-1234", parts, "body")).toBe(false);
  });
});

describe("dashboard WhatsappService (per-clinic connection)", () => {
  const ctx = (clinicId = CLINIC_A): ClinicContext => ({ userId: "u", clinicId, role: "clinic_admin", name: null, email: null, doctorId: null, patientId: null, tokenId: "t", ip: null, userAgent: null });
  const make = () => {
    const f = createFakeDb({ wa_clinic_sessions: [{ clinicId: CLINIC_A, enabled: true, phone: "919876500000", lastConnectedAt: new Date("2026-09-20T00:00:00Z") }] });
    db = f.db;
    dump = f.dump;
    return new WhatsappService(db);
  };

  it("shows the QR while the gateway waits for a scan", async () => {
    vi.spyOn(gateway, "getSession").mockResolvedValue({ clinicId: CLINIC_A, status: "QR_REQUIRED", phone: null, qr: "data:image/png;base64,AAA" });
    const s = await make().getSession(ctx());
    expect(s).toMatchObject({ stage: "qr", connected: false, enabled: true });
    expect(s.qr?.dataUrl).toBe("data:image/png;base64,AAA");
  });

  it("reports ready with the connected number and no QR", async () => {
    vi.spyOn(gateway, "getSession").mockResolvedValue({ clinicId: CLINIC_A, status: "READY", phone: "919876500000", qr: null });
    const s = await make().getSession(ctx());
    expect(s).toMatchObject({ stage: "ready", connected: true, phone: "919876500000", qr: null });
  });

  it("treats a clinic unknown to the gateway as not started", async () => {
    vi.spyOn(gateway, "getSession").mockResolvedValue(null);
    expect((await make().getSession(ctx())).stage).toBe("disconnected"); // has a config row, no live session
  });

  it("never throws when the gateway is unreachable - reports an error stage", async () => {
    vi.spyOn(gateway, "getSession").mockRejectedValue(new GatewayError(0, "unreachable"));
    const s = await make().getSession(ctx());
    expect(s).toMatchObject({ stage: "error", connected: false });
  });

  it("connect enables the clinic and starts its gateway session", async () => {
    const start = vi.spyOn(gateway, "startSession").mockResolvedValue({ clinicId: CLINIC_B, status: "STARTING", phone: null, qr: null });
    const svc = make();
    await svc.requestConnectionChange(ctx(CLINIC_B), "connect");
    expect(start).toHaveBeenCalledWith(CLINIC_B);
    expect(dump("wa_clinic_sessions").find((d) => d.clinicId === CLINIC_B)).toMatchObject({ enabled: true });
  });

  it("disconnect stops but keeps the number; logout wipes it; unknown clinics are fine", async () => {
    const stop = vi.spyOn(gateway, "stopSession").mockRejectedValue(new GatewayError(404, "unknown clinic"));
    const logout = vi.spyOn(gateway, "logoutSession").mockResolvedValue({ ok: true });
    const svc = make();
    await svc.requestConnectionChange(ctx(), "disconnect");
    expect(stop).toHaveBeenCalledWith(CLINIC_A);
    expect(dump("wa_clinic_sessions")[0]).toMatchObject({ enabled: false, phone: "919876500000" });
    await svc.requestConnectionChange(ctx(), "logout");
    expect(logout).toHaveBeenCalledWith(CLINIC_A);
    expect(dump("wa_clinic_sessions")[0]).toMatchObject({ enabled: false, phone: null });
  });

  it("reports a 502 when the gateway cannot be reached for a command", async () => {
    vi.spyOn(gateway, "startSession").mockRejectedValue(new GatewayError(0, "unreachable"));
    await expect(make().requestConnectionChange(ctx(), "connect")).rejects.toMatchObject({ statusCode: 502, code: "GATEWAY_UNAVAILABLE" });
  });
});
