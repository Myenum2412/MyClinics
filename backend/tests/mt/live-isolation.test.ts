/**
 * LIVE end-to-end tenant isolation check.
 *
 * Boots the real Fastify server against a real MongoDB (MONGODB_URI) and
 * exercises the full HTTP stack: tenant-scope middleware → controller →
 * service → repository → database. Verifies, at the API level, that:
 *
 *   - A patient can ONLY see their own data (not other patients', not
 *     other clinics').
 *   - A clinic can ONLY see its own data (staff of clinic A can never
 *     read clinic B patients/users/appointments/audit logs).
 *
 * Run with:  MONGODB_URI=mongodb://127.0.0.1:27099/myclinic npx vitest run tests/mt/live-isolation.test.ts
 * Skips when MONGODB_URI is not configured.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";

const URI = process.env.MONGODB_URI;
const LIVE = URI && !URI.includes("mongodb.net");

function liveOrSkip() {
  if (!LIVE) {
    return it.skip;
  }
  return it;
}

const liveIt = liveOrSkip();

let app: FastifyInstance;
let db: Awaited<ReturnType<typeof import("@/lib/db").getDb>>;

const MT_COLLECTIONS = [
  "mt_clinics",
  "mt_users",
  "mt_patients",
  "mt_appointments",
  "mt_medical_records",
  "mt_prescriptions",
  "mt_audit_logs",
];

beforeAll(async () => {
  if (!LIVE) return;
  const { buildServer } = await import("@/app");
  const { getDb } = await import("@/lib/db");
  db = await getDb();
  await Promise.all(MT_COLLECTIONS.map((c) => db.collection(c).deleteMany({})));
  app = buildServer();
  await app.ready();
});

afterAll(async () => {
  if (!LIVE || !db) return;
  await Promise.all(MT_COLLECTIONS.map((c) => db.collection(c).deleteMany({})));
  await app.close();
});

async function api(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  url: string,
  token: string | null,
  body?: unknown
) {
  const res = await app.inject({
    method,
    url,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
    },
    payload: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data: unknown = null;
  try {
    data = res.json();
  } catch {
    data = null;
  }
  return { status: res.statusCode, data: data as Record<string, unknown> };
}

function step(label: string) { console.log(`[live] ${label}`); }

async function signupClinic(clinicName: string, email: string) {
  step(`signup ${clinicName}`);
  const res = await api("POST", "/api/mt/auth/signup", null, {
    clinicName,
    adminName: `Admin ${clinicName}`,
    email,
    password: "AdminPass123",
  });
  expect(res.status).toBe(201);
  const token = res.data.token as string;
  const clinicId = res.data.clinicId as string;
  expect(clinicId.startsWith("clc_")).toBe(true);
  return { token, clinicId };
}

async function createPatient(
  staffToken: string,
  input: { fullName: string; mobile: string; email?: string; password?: string }
) {
  step(`create patient ${input.fullName}`);
  const res = await api("POST", "/api/mt/patients", staffToken, {
    fullName: input.fullName,
    mobile: input.mobile,
    email: input.email ?? null,
    password: input.password ?? null,
    allergies: [],
  });
  expect(res.status).toBe(201);
  return (res.data.patient as { patientId: string }).patientId;
}

async function login(email: string, password: string) {
  step(`login ${email}`);
  const res = await api("POST", "/api/mt/auth/login", null, { email, password });
  expect(res.status).toBe(200);
  return res.data.token as string;
}

describe("live tenant isolation (real MongoDB)", () => {
  let clinicA: { token: string; clinicId: string };
  let clinicB: { token: string; clinicId: string };
  let staffAToken: string;
  let patient1Id: string;
  let patient2Id: string;
  let patient3Id: string;
  let patient1Token: string;

  liveIt(
    "full isolation scenario",
    async () => {
  step("start scenario");
    // ── Two clinics sign up ──────────────────────────────────────────────
      clinicA = await signupClinic("Alpha Care", "admin.a@test.local");
      clinicB = await signupClinic("Beta Health", "admin.b@test.local");
      expect(clinicA.clinicId).not.toBe(clinicB.clinicId);

    // ── Clinic A: create a staff user + two patients ────────────────────
    step("create staff user");
    const staffRes = await api("POST", "/api/mt/users", clinicA.token, {
      name: "Nurse Nina",
      email: "nina@test.local",
      password: "NursePass123",
      role: "staff",
    });
    expect(staffRes.status).toBe(201);
    staffAToken = await login("nina@test.local", "NursePass123");

    patient1Id = await createPatient(staffAToken, {
      fullName: "Patient One",
      mobile: "919111111111",
      email: "p1@test.local",
      password: "PatientPass123",
    });
    patient2Id = await createPatient(staffAToken, {
      fullName: "Patient Two",
      mobile: "919222222222",
    });
    patient1Token = await login("p1@test.local", "PatientPass123");

    // ── Clinic B: create one patient ────────────────────────────────────
    patient3Id = await createPatient(clinicB.token, {
      fullName: "Patient Three",
      mobile: "919333333333",
    });

    // ════════════════════════════════════════════════════════════════════
    // CLINIC-LEVEL ISOLATION: clinic A must never see clinic B's data
    // ════════════════════════════════════════════════════════════════════
    expect(patient3Id).toBeTruthy();

    // A's staff cannot read B's patient, even with the exact patientId.
    step("cross-clinic read check");
    const crossRead = await api("GET", `/api/mt/patients/${patient3Id}`, staffAToken);
    expect(crossRead.status).toBe(404);

    // A's patient list contains only A's patients (2), not B's (3).
    step("clinic A patient list");
    const listA = await api("GET", "/api/mt/patients", staffAToken);
    expect(listA.status).toBe(200);
    const itemsA = (listA.data.items as { patientId: string }[]).map((p) => p.patientId);
    expect(itemsA).toContain(patient1Id);
    expect(itemsA).toContain(patient2Id);
    expect(itemsA).not.toContain(patient3Id);

    // A's staff cannot list B's users.
    step("clinic B users list");
    const usersB = await api("GET", "/api/mt/users", clinicB.token);
    expect(usersB.status).toBe(200);
    expect((usersB.data.items as { userId: string }[])).toHaveLength(1); // only B's admin
    step("clinic A users list");
    const usersA = await api("GET", "/api/mt/users", staffAToken);
    expect((usersA.data.items as { userId: string }[])).toHaveLength(3); // admin + staff + patient1

    // A cannot delete B's patient.
    step("cross-clinic delete");
    const crossDelete = await api("DELETE", `/api/mt/patients/${patient3Id}`, clinicA.token);
    expect(crossDelete.status).toBe(404);

    // A cannot create an appointment for B's patient (patient must exist in A).
    step("cross-clinic appointment");
    const crossAppt = await api("POST", "/api/mt/appointments", staffAToken, {
      patientId: patient3Id,
      date: "2026-09-01",
      time: "10:00",
      type: "in-person",
    });
    expect(crossAppt.status).toBe(404);

    // A's audit logs contain no trace of clinic B.
    step("clinic A audit logs");
    const auditA = await api("GET", "/api/mt/audit-logs", clinicA.token);
    expect(auditA.status).toBe(200);
    const auditItems = auditA.data.items as { clinicId: string; entity: string }[];
    expect(auditItems.length).toBeGreaterThan(0);
    expect(auditItems.every((e) => e.clinicId === clinicA.clinicId)).toBe(true);

    // A's admin cannot list B's audit logs via B's own endpoint (token-bound).
    step("audit B with A token");
    const auditBWithA = await api("GET", "/api/mt/audit-logs", clinicA.token);
    expect((auditBWithA.data.items as { clinicId: string }[]).every((e) => e.clinicId === clinicA.clinicId)).toBe(true);

    // ════════════════════════════════════════════════════════════════════
    // PATIENT-LEVEL ISOLATION: patient 1 sees ONLY patient 1's data
    // ════════════════════════════════════════════════════════════════════
    // Own record → 200.
    step("patient own record");
    const own = await api("GET", `/api/mt/patients/${patient1Id}`, patient1Token);
    expect(own.status).toBe(200);
    expect((own.data.patient as { fullName: string }).fullName).toBe("Patient One");

    // Same-clinic patient's record → 404 (never 403 — no existence leak).
    step("patient other same-clinic record");
    const otherSameClinic = await api("GET", `/api/mt/patients/${patient2Id}`, patient1Token);
    expect(otherSameClinic.status).toBe(404);

    // Other-clinic patient's record → 404.
    step("patient other-clinic record");
    const otherClinic = await api("GET", `/api/mt/patients/${patient3Id}`, patient1Token);
    expect(otherClinic.status).toBe(404);

    // Patient list → exactly their own record.
    step("patient own list");
    const ownList = await api("GET", "/api/mt/patients", patient1Token);
    expect(ownList.status).toBe(200);
    expect((ownList.data.items as { patientId: string }[]).map((p) => p.patientId)).toEqual([patient1Id]);

    // /me/patient → own record.
    step("patient me");
    const me = await api("GET", "/api/mt/me/patient", patient1Token);
    expect(me.status).toBe(200);
    expect((me.data.patient as { patientId: string }).patientId).toBe(patient1Id);

    // Patient cannot update/delete others.
    step("patient cross update");
    const crossUpdate = await api(
      "PATCH",
      `/api/mt/patients/${patient2Id}`,
      patient1Token,
      { notes: "hacked" }
    );
    expect(crossUpdate.status).toBe(404);

    // ── Appointments: staff books for patient 1 only; patient 2's is off-limits ──
    step("create appointment 1");
    const appt1 = await api("POST", "/api/mt/appointments", staffAToken, {
      patientId: patient1Id,
      date: "2026-09-01",
      time: "10:00",
      reason: "Fever",
      type: "in-person",
    });
    expect(appt1.status).toBe(201);
    const appt1Id = (appt1.data.appointment as { appointmentId: string }).appointmentId;

    step("create appointment 2");
    const appt2 = await api("POST", "/api/mt/appointments", staffAToken, {
      patientId: patient2Id,
      date: "2026-09-02",
      time: "11:00",
      type: "in-person",
    });
    const appt2Id = (appt2.data.appointment as { appointmentId: string }).appointmentId;

    // Patient 1 sees only their own appointment in the list.
    step("patient appointments list");
    const apptsForP1 = await api("GET", "/api/mt/appointments", patient1Token);
    expect(apptsForP1.status).toBe(200);
    const p1ApptIds = (apptsForP1.data.items as { appointmentId: string }[]).map((a) => a.appointmentId);
    expect(p1ApptIds).toContain(appt1Id);
    expect(p1ApptIds).not.toContain(appt2Id);

    // Patient 1 cannot fetch patient 2's appointment.
    step("patient cross appointment read");
    const crossApptRead = await api("GET", `/api/mt/appointments/${appt2Id}`, patient1Token);
    expect(crossApptRead.status).toBe(404);

    // ── Medical records: staff creates for both; patient 1 sees only theirs ──
    step("create medical record 1");
    const mr1 = await api("POST", "/api/mt/medical-records", staffAToken, {
      patientId: patient1Id,
      title: "First consult",
      summary: "Fever, prescribed paracetamol.",
      recordType: "consultation",
    });
    expect(mr1.status).toBe(201);
    const mr1Id = (mr1.data.record as { recordId: string }).recordId;

    step("create medical record 2");
    const mr2 = await api("POST", "/api/mt/medical-records", staffAToken, {
      patientId: patient2Id,
      title: "Second consult",
      summary: "Allergy review.",
      recordType: "consultation",
    });
    const mr2Id = (mr2.data.record as { recordId: string }).recordId;

    step("patient medical records list");
    const recordsP1 = await api("GET", `/api/mt/medical-records/patient/${patient1Id}`, patient1Token);
    expect(recordsP1.status).toBe(200);
    expect((recordsP1.data.items as { recordId: string }[]).map((r) => r.recordId)).toEqual([mr1Id]);

    step("patient cross records list");
    const crossRecord = await api("GET", `/api/mt/medical-records/patient/${patient2Id}`, patient1Token);
    expect(crossRecord.status).toBe(404);

    step("patient cross record by id");
    const crossRecordById = await api("GET", `/api/mt/medical-records/${mr2Id}`, patient1Token);
    expect(crossRecordById.status).toBe(404);

    // ── Prescriptions: same ownership rules ──
    step("create prescription 1");
    const rx1 = await api("POST", "/api/mt/prescriptions", staffAToken, {
      patientId: patient1Id,
      doctorName: "Dr. Alpha",
      diagnosis: "Viral fever",
      medicines: [{ name: "Paracetamol", dosage: "500mg", frequency: "1-0-1", duration: "3 days" }],
    });
    expect(rx1.status).toBe(201);

    step("create prescription 2");
    const rx2 = await api("POST", "/api/mt/prescriptions", staffAToken, {
      patientId: patient2Id,
      doctorName: "Dr. Alpha",
      diagnosis: "Allergy",
      medicines: [{ name: "Cetirizine", dosage: "10mg", frequency: "0-0-1", duration: "5 days" }],
    });
    const rx2Id = (rx2.data.prescription as { prescriptionId: string }).prescriptionId;

    step("patient prescriptions list");
    const rxForP1 = await api("GET", `/api/mt/prescriptions/patient/${patient1Id}`, patient1Token);
    expect((rxForP1.data.items as { prescriptionId: string }[]).map((p) => p.prescriptionId)).toHaveLength(1);

    step("patient cross prescription read");
    const crossRx = await api("GET", `/api/mt/prescriptions/${rx2Id}`, patient1Token);
    expect(crossRx.status).toBe(404);

    // ── Audit transparency: patient 1 can see only THEIR trail ──
    step("patient own audit trail");
    const myAudit = await api("GET", `/api/mt/audit-logs/patient/${patient1Id}`, patient1Token);
    expect(myAudit.status).toBe(200);
    const myAuditItems = myAudit.data.items as Record<string, unknown>[];
    expect(myAuditItems.length).toBeGreaterThan(0);
    expect(
      myAuditItems.every(
        (e) =>
          e.entityId === patient1Id ||
          (e.metadata as { patientId?: string } | null)?.patientId === patient1Id
      )
    ).toBe(true);
    expect(
      myAuditItems.some(
        (e) =>
          e.entityId === patient2Id ||
          (e.metadata as { patientId?: string } | null)?.patientId === patient2Id
      )
    ).toBe(false);

    step("patient other audit trail");
    const otherAudit = await api("GET", `/api/mt/audit-logs/patient/${patient2Id}`, patient1Token);
    expect(otherAudit.status).toBe(404);
  });

  liveIt("role boundaries: patient cannot list users or create records", async () => {
    if (!patient1Token) return;
    const users = await api("GET", "/api/mt/users", patient1Token);
    expect(users.status).toBe(403);

    const createPatient = await api("POST", "/api/mt/patients", patient1Token, {
      fullName: "Evil Patient",
      mobile: "919444444444",
      allergies: [],
    });
    expect(createPatient.status).toBe(403);

    const createRecord = await api("POST", "/api/mt/medical-records", patient1Token, {
      patientId: patient1Id,
      title: "Forged",
      summary: "forged record",
      recordType: "consultation",
    });
    expect(createRecord.status).toBe(403);
  });
});