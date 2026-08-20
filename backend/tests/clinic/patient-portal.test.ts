import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import type { Db } from "mongodb";
import { invalidateCache } from "@/lib/cache";
import { API_LIMITER, AUTH_LIMITER } from "@/clinic/core/rate-limiter";
import { createFakeDb } from "../helpers/fake-db";
import { CLINIC_A, DOCTOR_A1 } from "./helpers/fixtures";

const mockDbHolder: { db: Db | null } = { db: null };
vi.mock("@/lib/db", () => ({
  getDb: async () => mockDbHolder.db,
}));

import { buildServer } from "@/app";

const t = new Date("2026-01-01T00:00:00Z");
let hash: string;
beforeAll(async () => {
  hash = await bcrypt.hash("patient-secret", 4);
});

const PATIENT_A1 = "pat_portal_a1";
const PATIENT_A2 = "pat_portal_a2";

function seedDb() {
  const { db } = createFakeDb({
    clc_clinics: [{ clinicId: CLINIC_A, slug: "clinic-a", name: "Clinic A", status: "active", createdAt: t, updatedAt: t }],
    clc_users: [
      { clinicId: CLINIC_A, userId: "usr_portal_a1", name: "P1", email: "p1@portal.test", passwordHash: hash, role: "patient", patientId: PATIENT_A1, status: "active", createdAt: t },
      { clinicId: CLINIC_A, userId: "usr_portal_a2", name: "P2", email: "p2@portal.test", passwordHash: hash, role: "patient", patientId: PATIENT_A2, status: "active", createdAt: t },
    ],
    clc_patients: [
      { clinicId: CLINIC_A, patientId: PATIENT_A1, doctorId: DOCTOR_A1, userId: "usr_portal_a1", fullName: "P1", mobile: "9000000001", status: "active", createdAt: t, updatedAt: t },
      { clinicId: CLINIC_A, patientId: PATIENT_A2, doctorId: DOCTOR_A1, userId: "usr_portal_a2", fullName: "P2", mobile: "9000000002", status: "active", createdAt: t, updatedAt: t },
    ],
    clc_appointments: [
      { clinicId: CLINIC_A, appointmentId: "apt_portal_a1", patientId: PATIENT_A1, doctorId: DOCTOR_A1, date: "2026-01-10", time: "10:00", status: "scheduled", createdAt: t, updatedAt: t },
      { clinicId: CLINIC_A, appointmentId: "apt_portal_a2", patientId: PATIENT_A2, doctorId: DOCTOR_A1, date: "2026-01-10", time: "11:00", status: "scheduled", createdAt: t, updatedAt: t },
    ],
    clc_medicine: [
      { clinicId: CLINIC_A, recordId: "mrc_portal_a1", patientId: PATIENT_A1, doctorId: DOCTOR_A1, diagnosis: "D1", visitDate: "2026-01-10", createdAt: t, updatedAt: t },
      { clinicId: CLINIC_A, recordId: "mrc_portal_a2", patientId: PATIENT_A2, doctorId: DOCTOR_A1, diagnosis: "D2", visitDate: "2026-01-10", createdAt: t, updatedAt: t },
    ],
    clc_prescriptions: [
      { clinicId: CLINIC_A, prescriptionId: "rx_portal_a1", patientId: PATIENT_A1, doctorId: DOCTOR_A1, visitDate: "2026-01-10", medicines: [], createdAt: t, updatedAt: t },
      { clinicId: CLINIC_A, prescriptionId: "rx_portal_a2", patientId: PATIENT_A2, doctorId: DOCTOR_A1, visitDate: "2026-01-10", medicines: [], createdAt: t, updatedAt: t },
    ],
    clc_bills: [
      { clinicId: CLINIC_A, billId: "bil_portal_a1", patientId: PATIENT_A1, total: 100, status: "paid", createdAt: t, updatedAt: t },
      { clinicId: CLINIC_A, billId: "bil_portal_a2", patientId: PATIENT_A2, total: 200, status: "issued", createdAt: t, updatedAt: t },
    ],
  });
  mockDbHolder.db = db;
  return db;
}

async function loginAs(app: Awaited<ReturnType<typeof buildServer>>, email: string) {
  const res = await app.inject({
    method: "POST",
    url: "/api/clinics/auth/login",
    payload: { email, password: "patient-secret" },
  });
  expect(res.statusCode).toBe(200);
  return (res.json() as { token: string }).token;
}

describe("Patient portal /me/* endpoints", () => {
  beforeEach(() => {
    invalidateCache("clc:user:");
    AUTH_LIMITER.clear();
    API_LIMITER.clear();
    seedDb();
  });

  it("patient A1 sees ONLY their own appointments", async () => {
    const app = buildServer();
    const token = await loginAs(app, "p1@portal.test");
    const res = await app.inject({
      method: "GET",
      url: `/api/clinics/${CLINIC_A}/me/appointments`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { items: { appointmentId: string }[] };
    expect(body.items.map((a) => a.appointmentId)).toEqual(["apt_portal_a1"]);
  });

  it("patient A1 sees ONLY their own records", async () => {
    const app = buildServer();
    const token = await loginAs(app, "p1@portal.test");
    const res = await app.inject({
      method: "GET",
      url: `/api/clinics/${CLINIC_A}/me/records`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect((res.json() as { items: { recordId: string }[] }).items.map((r) => r.recordId)).toEqual(["mrc_portal_a1"]);
  });

  it("patient A1 sees ONLY their own prescriptions", async () => {
    const app = buildServer();
    const token = await loginAs(app, "p1@portal.test");
    const res = await app.inject({
      method: "GET",
      url: `/api/clinics/${CLINIC_A}/me/prescriptions`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect((res.json() as { items: { prescriptionId: string }[] }).items.map((p) => p.prescriptionId)).toEqual(["rx_portal_a1"]);
  });

  it("patient A1 sees ONLY their own bills", async () => {
    const app = buildServer();
    const token = await loginAs(app, "p1@portal.test");
    const res = await app.inject({
      method: "GET",
      url: `/api/clinics/${CLINIC_A}/me/bills`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect((res.json() as { items: { billId: string }[] }).items.map((b) => b.billId)).toEqual(["bil_portal_a1"]);
  });

  it("patients are BLOCKED from the module routes (no bypass)", async () => {
    const app = buildServer();
    const token = await loginAs(app, "p1@portal.test");
    for (const path of [
      `/api/clinics/${CLINIC_A}/appointments`,
      `/api/clinics/${CLINIC_A}/medicine`,
      `/api/clinics/${CLINIC_A}/prescriptions`,
      `/api/clinics/${CLINIC_A}/billing`,
    ]) {
      const res = await app.inject({
        method: "GET",
        url: path,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode, path).toBe(403);
    }
  });

  it("staff are blocked from clinical module reads via requireRoles('doctor')", async () => {
    const app = buildServer();
    await mockDbHolder.db!.collection("clc_users").insertOne({
      clinicId: CLINIC_A, userId: "usr_portal_staff", name: "Staff", email: "staff@portal.test",
      passwordHash: hash, role: "staff", status: "active", createdAt: t, updatedAt: t,
    });
    const token = await loginAs(app, "staff@portal.test");
    for (const path of [
      `/api/clinics/${CLINIC_A}/appointments`,
      `/api/clinics/${CLINIC_A}/medicine`,
      `/api/clinics/${CLINIC_A}/prescriptions`,
    ]) {
      const res = await app.inject({
        method: "GET",
        url: path,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode, path).toBe(403);
    }
  });
});