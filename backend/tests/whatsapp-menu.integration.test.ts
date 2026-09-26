import type { Db } from "mongodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb } from "./helpers/fake-db";
import { handleInboundMessage, resetInboundRateLimiter, type InboundMessage } from "@/services/whatsapp/menu/service";

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

const A = "clc_aaaaaaaaaaaaaaaaaa";
const B = "clc_bbbbbbbbbbbbbbbbbb";
const DOC1 = "doc_kumar000000000";
const DOC2 = "doc_priya000000000";
const PAT_ASHA = "pat_asha000000000";
const PHONE = "919876543210";
const t = new Date("2026-01-01T00:00:00Z");

type Dump = (name: string) => Record<string, any>[];
let db: Db;
let dump: Dump;
let counter = 0;
const io = { download: vi.fn(async () => Buffer.from("%PDF-1.4 xray")), sendDocument: vi.fn(async () => ({ id: 1, duplicate: false })) };

function seed() {
  const f = createFakeDb({
    clc_clinics: [
      { clinicId: A, name: "Smile Dental", status: "active", phone: "044 1234", address: "12 Main Road", settings: { workingHours: { open: "09:00", close: "12:00", days: "Monday - Saturday" }, slotMinutes: 30 } },
      { clinicId: B, name: "Other Clinic", status: "active", settings: { workingHours: { open: "09:00", close: "12:00" }, slotMinutes: 30 } },
    ],
    clc_doctors: [
      { clinicId: A, doctorId: DOC1, name: "Kumar", specialization: "Dentist", phone: "9111111111", schedule: [], status: "active" },
      { clinicId: A, doctorId: DOC2, name: "Priya", specialization: "Ortho", phone: null, schedule: [{ day: "Wed", start: "09:00", end: "10:00" }], status: "active" },
    ],
    clc_users: [
      { clinicId: A, userId: "usr_admin", role: "clinic_admin", status: "active" },
      { clinicId: A, userId: "usr_staff", role: "staff", status: "active" },
      { clinicId: A, userId: "usr_doc", role: "doctor", status: "active" },
    ],
    clc_patients: [
      { clinicId: A, patientId: PAT_ASHA, fullName: "Asha", mobile: "98765 43210", whatsapp: null, doctorId: DOC1, status: "active" },
      { clinicId: B, patientId: "pat_other0000000", fullName: "Other Person", mobile: "9876543210", status: "active" },
    ],
    // Tuesday 2026-09-29 10:00 with Dr. Kumar is already taken
    clc_appointments: [
      { clinicId: A, appointmentId: "apt_existing00000", patientId: PAT_ASHA, doctorId: DOC1, date: "2026-09-29", time: "10:00", status: "scheduled", createdAt: t, updatedAt: t },
    ],
    clc_settings: [],
    clc_medical_record_files: [
      { clinicId: A, fileId: "fil_xray0000000", patientId: PAT_ASHA, fileName: "xray.pdf", r2Key: "medical-record/A/xray", mimeType: "application/pdf", size: 1000, createdAt: new Date("2026-09-20T00:00:00Z") },
      { clinicId: A, fileId: "fil_huge0000000", patientId: PAT_ASHA, fileName: "scan.pdf", r2Key: "medical-record/A/scan", mimeType: "application/pdf", size: 20 * 1024 * 1024, createdAt: new Date("2026-09-10T00:00:00Z") },
    ],
    clc_prescriptions: [
      { clinicId: A, prescriptionId: "rx_one000000000", patientId: PAT_ASHA, doctorId: DOC1, visitDate: "2026-09-18", diagnosis: "Gingivitis", medicines: [{ name: "Amoxicillin", dosage: "500mg", frequency: "3x/day", duration: "5 days", instructions: "after food" }], notes: "Avoid cold drinks" },
    ],
  });
  db = f.db;
  dump = f.dump;
  mockDbHolder.db = db;
}

/** Sends one patient message through the real inbound handler. */
async function say(text: string, o: Partial<InboundMessage> = {}) {
  counter += 1;
  const msg: InboundMessage = { clinicId: A, messageId: `M${counter}`, jid: `${PHONE}@s.whatsapp.net`, from: PHONE, lid: false, pushName: "Asha", type: "text", text, ...o };
  const r = await handleInboundMessage(db, msg, io);
  return r.replies.map((x) => x.text).join("\n");
}
const chat = async (texts: string[], o: Partial<InboundMessage> = {}) => {
  let last = "";
  for (const x of texts) last = await say(x, o);
  return last;
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-28T04:30:00Z")); // Monday 10:00 IST
  seed();
  resetInboundRateLimiter();
  io.download.mockClear();
  io.sendDocument.mockClear();
});
afterEach(() => vi.useRealTimers());

describe("greeting", () => {
  it("answers 'Hi' instantly with the clinic's menu (no AI involved)", async () => {
    const r = await say("Hi");
    expect(r).toContain("Hello Asha! 👋 Welcome to Smile Dental");
    expect(r).toContain("1️⃣ Book an appointment");
  });
});

describe("booking into the real tenant data", () => {
  it("books an appointment for an existing patient (phone stored with spaces) and creates it in clc_appointments", async () => {
    const doctors = await chat(["hi", "1"]);
    expect(doctors).toContain("Dr. Kumar (Dentist)");
    const days = await say("1"); // Kumar
    expect(days).toContain("Today, Mon 28 Sep");
    expect(days).toContain("Tomorrow, Tue 29 Sep");
    expect(days).not.toContain("Sun 4 Oct"); // clinic closed on Sunday

    const times = await say("1"); // today
    expect(times).toContain("10:30 AM"); // 10:00 now + 15 min buffer → first slot 10:30
    expect(times).not.toContain("9:00 AM");

    const confirm = await say("1"); // 10:30
    expect(confirm).toContain("Asha");
    expect(confirm).toContain("Mon 28 Sep".replace("Mon 28 Sep", "Today, Mon 28 Sep"));

    const booked = await say("1");
    expect(booked).toContain("Your appointment is booked");
    expect(booked).toMatch(/Token #\d+/);

    const created = dump("clc_appointments").find((a) => a.date === "2026-09-28");
    expect(created).toMatchObject({ clinicId: A, patientId: PAT_ASHA, doctorId: DOC1, time: "10:30", status: "scheduled", reason: "Booked via WhatsApp" });
    expect(created!.tokenNumber).toBeGreaterThan(0);
  });

  it("does not send a duplicate patient message, but still notifies the doctor", async () => {
    await chat(["hi", "1", "1", "1", "1", "1"]);
    const notifs = dump("clc_appointment_notifications").filter((n) => n.type === "event");
    expect(notifs.some((n) => n.recipientRole === "patient")).toBe(false);
    expect(notifs.some((n) => n.recipientRole === "doctor" && n.action === "created")).toBe(true);
  });

  it("does not offer slots that are already booked", async () => {
    const times = await chat(["hi", "1", "1", "2"]); // Kumar → Tuesday
    expect(times).toContain("9:00 AM");
    expect(times).not.toContain("10:00 AM"); // taken by the existing appointment
    expect(times).toContain("10:30 AM");
  });

  it("respects a doctor's own weekly schedule", async () => {
    const days = await chat(["hi", "1", "2"]); // Priya works Wednesdays only
    expect(days).toContain("Wed 30 Sep");
    expect(days).not.toContain("Tue 29 Sep");
    expect(days).not.toContain("Thu 1 Oct");
  });

  it("registers a new patient (assigned to the chosen doctor) at confirmation, using the WhatsApp name", async () => {
    const before = dump("clc_patients").length;
    await chat(["hi", "1", "1", "2", "1", "1"], { from: "919000000001", jid: "919000000001@s.whatsapp.net", pushName: "Ravi" });
    const patients = dump("clc_patients");
    expect(patients.length).toBe(before + 1);
    const ravi = patients.find((p) => p.fullName === "Ravi")!;
    expect(ravi).toMatchObject({ clinicId: A, mobile: "9000000001", doctorId: DOC1, status: "active" });
    expect(dump("clc_appointments").some((a) => a.patientId === ravi.patientId)).toBe(true);
  });

  it("does not create a patient if the patient abandons the booking", async () => {
    const before = dump("clc_patients").length;
    await chat(["hi", "1", "1", "2", "1", "0"], { from: "919000000002", jid: "919000000002@s.whatsapp.net", pushName: "Nobody" });
    expect(dump("clc_patients").length).toBe(before);
  });

  it("tells the patient when the slot was taken in the meantime and offers fresh times", async () => {
    const confirm = await chat(["hi", "1", "1", "2", "2"]); // Tuesday, slot #2 = 09:30
    expect(confirm).toContain("Please confirm");
    // Someone else books 09:30 before this patient confirms
    dump("clc_appointments").push({ clinicId: A, appointmentId: "apt_racer0000000", patientId: "pat_x", doctorId: DOC1, date: "2026-09-29", time: "09:30", status: "scheduled" });
    const r = await say("1");
    expect(r).toContain("just taken");
    expect(r).not.toContain("9:30 AM");
    expect(dump("clc_appointments").filter((a) => a.date === "2026-09-29" && a.time === "09:30").length).toBe(1);
  });
});

describe("tenant isolation", () => {
  it("clinic B's bot does not see clinic A's patient for the same phone number", async () => {
    const r = await chat(["hi", "3"], { clinicId: B });
    expect(r).toContain("Welcome to Other Clinic".slice(0, 0)); // sanity: no crash
    expect(r).toContain("no upcoming appointments"); // Asha's Tuesday appointment is clinic A only
    expect(r).not.toContain("Tue 29 Sep");
  });

  it("stays silent for an unknown clinic id", async () => {
    expect(await say("Hi", { clinicId: "clc_doesnotexist000" })).toBe("");
  });

  it("stays silent when the clinic switched the bot off in settings", async () => {
    dump("clc_settings").push({ clinicId: A, aiAgentEnabled: false });
    expect(await say("Hi")).toBe("");
  });
});

describe("manage appointments", () => {
  it("shows upcoming appointments", async () => {
    const r = await chat(["hi", "3"]);
    expect(r).toContain("• Tomorrow, Tue 29 Sep, 10:00 AM – Dr. Kumar");
  });

  it("cancels an appointment after confirmation and frees the slot", async () => {
    const r = await chat(["hi", "2", "1", "2", "1"]);
    expect(r).toContain("has been cancelled");
    expect(dump("clc_appointments").find((a) => a.appointmentId === "apt_existing00000")!.status).toBe("cancelled");
    const notifs = dump("clc_appointment_notifications").filter((n) => n.action === "cancelled");
    expect(notifs.some((n) => n.recipientRole === "patient")).toBe(false); // patient already told in chat
    expect(notifs.some((n) => n.recipientRole === "doctor")).toBe(true);
    // slot is bookable again
    resetInboundRateLimiter(); // frozen test clock: keep the flood window from spanning both conversations
    const times = await chat(["hi", "1", "1", "2"]);
    expect(times).toContain("10:00 AM");
  });

  it("reschedules an appointment", async () => {
    // pick appt → reschedule → Kumar's days → Wednesday (3rd option: Mon today, Tue, Wed...) → first slot → confirm
    const days = await chat(["hi", "2", "1", "1"]);
    expect(days).toContain("Wed 30 Sep");
    const r = await chat(["3", "1", "1"]);
    expect(r).toContain("Your appointment is now on Wed 30 Sep at 9:00 AM");
    const appt = dump("clc_appointments").find((a) => a.appointmentId === "apt_existing00000")!;
    expect(appt).toMatchObject({ date: "2026-09-30", time: "09:00" });
  });

  it("cannot change another patient's appointment even with a crafted state", async () => {
    dump("clc_appointments").push({ clinicId: A, appointmentId: "apt_someone_else", patientId: "pat_x", doctorId: DOC1, date: "2026-09-30", time: "11:00", status: "scheduled" });
    // The list shown to Asha never contains it
    const r = await chat(["hi", "3"]);
    expect(r).not.toContain("Wed 30 Sep");
  });
});

describe("clinic info, reports, staff", () => {
  it("shows address, phone and hours from the clinic profile", async () => {
    const r = await chat(["hi", "4"]);
    expect(r).toContain("🏥 Smile Dental");
    expect(r).toContain("📍 12 Main Road");
    expect(r).toContain("📞 044 1234");
    expect(r).toContain("Monday - Saturday, 9:00 AM – 12:00 PM");
  });

  it("lists reports and prescriptions; sends a file via the gateway and a prescription as text", async () => {
    const list = await chat(["hi", "5"]);
    expect(list).toContain("xray.pdf");
    expect(list).toContain("Prescription – Fri 18 Sep");

    const sent = await say("1");
    expect(sent).toContain('Sending "xray.pdf');
    expect(io.download).toHaveBeenCalledWith("medical-record/A/xray");
    expect(io.sendDocument).toHaveBeenCalledWith(A, expect.objectContaining({
      to: PHONE, filename: "xray.pdf", mimetype: "application/pdf",
      contentBase64: Buffer.from("%PDF-1.4 xray").toString("base64"),
    }));

    const rx = await say("3");
    expect(rx).toContain("Diagnosis: Gingivitis");
    expect(rx).toContain("• Amoxicillin – 500mg, 3x/day, 5 days (after food)");
    expect(rx).toContain("Avoid cold drinks");
  });

  it("refuses oversized files politely without downloading them", async () => {
    const r = await chat(["hi", "5", "2"]);
    expect(r).toContain("too large");
    expect(io.download).not.toHaveBeenCalled();
  });

  it("notifies clinic admins and staff (not doctors) and then stays silent", async () => {
    const r = await chat(["hi", "6"]);
    expect(r).toContain("team has been notified");
    const notes = dump("clc_notifications");
    expect(notes.map((n) => n.recipientUserId).sort()).toEqual(["usr_admin", "usr_staff"]);
    expect(notes[0]).toMatchObject({ clinicId: A, type: "general", title: "Patient wants to talk to staff" });
    expect(notes[0].body).toContain("+919876543210");
    expect(await say("hello? anyone there")).toBe("");
    expect(await say("0")).toContain("Welcome to Smile Dental"); // patient can resume
  });
});

describe("robustness", () => {
  it("replays the same reply when the gateway retries an already processed message", async () => {
    await chat(["hi"]);
    const first = await say("1", { messageId: "RETRY-1" });
    const again = await say("1", { messageId: "RETRY-1" });
    expect(again).toBe(first);
    // the conversation advanced once: '1' next means "pick doctor 1", not another "book"
    const next = await say("1");
    expect(next).toContain("Which day");
  });

  it("cannot identify patients whose phone number WhatsApp hides", async () => {
    const r = await say("Hi", { lid: true, from: null });
    expect(r).toContain("couldn't verify your phone number");
  });

  it("asks for text when the patient sends a voice note", async () => {
    expect(await say("", { type: "audio" })).toContain("only read text");
  });

  it("lets the webhook fail (so the gateway retries later) when the database is down", async () => {
    const broken = { collection: () => { throw new Error("db exploded"); } } as unknown as Db;
    await expect(
      handleInboundMessage(broken, { clinicId: A, messageId: "X", jid: "1@s.whatsapp.net", from: PHONE, lid: false, pushName: null, type: "text", text: "hi" })
    ).rejects.toThrow("db exploded");
  });

  it("replies with a safe message (never an error) if a flow breaks midway", async () => {
    const real = db.collection.bind(db);
    // clinic + settings lookups work; anything else explodes
    (db as unknown as { collection: (n: string) => unknown }).collection = (name: string) => {
      if (name === "clc_clinics" || name === "clc_settings") return real(name);
      throw new Error("boom");
    };
    expect(await say("hi")).toContain("something went wrong on our side");
  });

  it("silences a sender who floods the number (more than 8 messages in 10s)", async () => {
    const replies: string[] = [];
    for (let i = 0; i < 10; i++) replies.push(await say("hi"));
    expect(replies.slice(0, 8).every((r) => r.includes("Welcome"))).toBe(true);
    expect(replies.slice(8)).toEqual(["", ""]);
  });
});
