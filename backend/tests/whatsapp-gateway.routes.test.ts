import type { Db } from "mongodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb } from "./helpers/fake-db";
import { signedHeaders } from "@/services/whatsapp/gateway/signature";

const mockDbHolder: { db: Db | null } = { db: null };
vi.mock("@/lib/db", () => ({ getDb: async () => mockDbHolder.db }));
vi.mock("@/lib/db-pools", () => ({
  getDb: async () => mockDbHolder.db,
  getPoolDb: async () => mockDbHolder.db,
  getMedicalRecordsDb: async () => mockDbHolder.db,
  getAppointmentsDb: async () => mockDbHolder.db,
  getWhatsAppDb: async () => mockDbHolder.db,
  getCronDb: async () => mockDbHolder.db,
  getAIDb: async () => mockDbHolder.db,
}));

import { buildServer } from "@/app";
import { resetInboundRateLimiter } from "@/services/whatsapp/menu/service";

const SECRET = "test-gateway-secret-long-enough";
const CLINIC = "clc_aaaaaaaaaaaaaaaaaa";
let dump: (n: string) => Record<string, unknown>[];
let app: ReturnType<typeof buildServer>;

const inbound = { clinicId: CLINIC, messageId: "M1", jid: "919876543210@s.whatsapp.net", from: "919876543210", lid: false, pushName: "Asha", type: "text", text: "Hi", timestamp: 1 };

function post(url: string, payload: unknown, headers: Record<string, string> | "sign" = "sign") {
  const body = typeof payload === "string" ? payload : JSON.stringify(payload);
  return app.inject({
    method: "POST",
    url,
    payload: body,
    headers: { "content-type": "application/json", ...(headers === "sign" ? signedHeaders(SECRET, body) : headers) },
  });
}

beforeEach(async () => {
  process.env.GATEWAY_URL = "http://gateway.local";
  process.env.GATEWAY_SECRET = SECRET;
  const f = createFakeDb({
    clc_clinics: [{ clinicId: CLINIC, name: "Smile Dental", status: "active", settings: { workingHours: { open: "09:00", close: "12:00" }, slotMinutes: 30 } }],
    clc_settings: [],
  });
  mockDbHolder.db = f.db;
  dump = f.dump;
  resetInboundRateLimiter();
  app = buildServer();
  await app.ready();
});
afterEach(async () => {
  await app.close();
  delete process.env.GATEWAY_URL;
  delete process.env.GATEWAY_SECRET;
});

describe("POST /api/whatsapp/inbound", () => {
  it("rejects requests without a signature", async () => {
    const res = await post("/api/whatsapp/inbound", inbound, {});
    expect(res.statusCode).toBe(401);
  });

  it("rejects a wrong secret, a tampered body and a stale timestamp", async () => {
    const body = JSON.stringify(inbound);
    const wrong = await post("/api/whatsapp/inbound", body, signedHeaders("some-other-secret-value-xx", body));
    expect(wrong.statusCode).toBe(401);

    const tampered = await post("/api/whatsapp/inbound", JSON.stringify({ ...inbound, text: "1" }), signedHeaders(SECRET, body));
    expect(tampered.statusCode).toBe(401);

    const stale = await post("/api/whatsapp/inbound", body, signedHeaders(SECRET, body, Date.now() - 10 * 60_000));
    expect(stale.statusCode).toBe(401);
  });

  it("returns 503 when the gateway is not configured", async () => {
    delete process.env.GATEWAY_SECRET;
    const res = await post("/api/whatsapp/inbound", inbound, {});
    expect(res.statusCode).toBe(503);
  });

  it("answers a signed 'Hi' with the menu", async () => {
    const res = await post("/api/whatsapp/inbound", inbound);
    expect(res.statusCode).toBe(200);
    const { replies } = res.json() as { replies: { text: string }[] };
    expect(replies).toHaveLength(1);
    expect(replies[0].text).toContain("Hello Asha! 👋 Welcome to Smile Dental");
  });

  it("validates the payload", async () => {
    const res = await post("/api/whatsapp/inbound", { clinicId: CLINIC });
    expect(res.statusCode).toBe(400);
  });
});

describe("POST /api/whatsapp/status", () => {
  const status = (s: string, phone: string | null = null) => post("/api/whatsapp/status", { clinicId: CLINIC, status: s, phone, at: 1 });

  it("rejects unsigned requests", async () => {
    expect((await post("/api/whatsapp/status", { clinicId: CLINIC, status: "READY" }, {})).statusCode).toBe(401);
  });

  it("records the connected number on READY, and clears it on LOGGED_OUT", async () => {
    expect((await status("READY", "919876500000")).statusCode).toBe(200);
    expect(dump("wa_clinic_sessions")[0]).toMatchObject({ clinicId: CLINIC, enabled: true, phone: "919876500000" });

    await status("DISCONNECTED");
    expect(dump("wa_clinic_sessions")[0]).toMatchObject({ enabled: true, phone: "919876500000" }); // auto-reconnects: stays enabled
    expect(dump("wa_clinic_sessions")[0].lastDisconnectedAt).toBeInstanceOf(Date);

    await status("LOGGED_OUT");
    expect(dump("wa_clinic_sessions")[0]).toMatchObject({ enabled: false, phone: null });
  });

  it("STOPPED disables auto-start but keeps the number", async () => {
    await status("READY", "919876500000");
    await status("STOPPED");
    expect(dump("wa_clinic_sessions")[0]).toMatchObject({ enabled: false, phone: "919876500000" });
  });

  it("ignores transient states and rejects unknown ones", async () => {
    expect((await status("QR_REQUIRED")).statusCode).toBe(200);
    expect(dump("wa_clinic_sessions")).toHaveLength(0);
    expect((await status("BANANA")).statusCode).toBe(400);
  });
});
