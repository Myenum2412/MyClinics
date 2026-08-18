import bcrypt from "bcryptjs";
import type { Db } from "mongodb";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { invalidateCache } from "@/lib/cache";
import { API_LIMITER, AUTH_LIMITER } from "@/clinic/core/rate-limiter";
import { createFakeDb } from "../helpers/fake-db";
import { CLINIC_A, CLINIC_B, CLINIC_C, DOCTOR_A1, USER_ADMIN_A } from "./helpers/fixtures";

const mockDbHolder: { db: Db | null } = { db: null };
vi.mock("@/lib/db", () => ({
  getDb: async () => mockDbHolder.db,
}));

import { buildServer } from "@/app";

const t = new Date("2026-01-01T00:00:00Z");

let adminHash: string;
let patientHash: string;
beforeAll(async () => {
  adminHash = await bcrypt.hash("admin-secret", 4);
  patientHash = await bcrypt.hash("patient-secret", 4);
});

function seedDb() {
  const { db } = createFakeDb({
    clc_clinics: [
      { clinicId: CLINIC_A, slug: "clinic-a", name: "Clinic A", status: "active", createdAt: t, updatedAt: t },
      { clinicId: CLINIC_B, slug: "clinic-b", name: "Clinic B", status: "active", createdAt: t, updatedAt: t },
      { clinicId: CLINIC_C, slug: "clinic-c", name: "Clinic C", status: "active", createdAt: t, updatedAt: t },
    ],
    clc_users: [
      { clinicId: CLINIC_A, userId: USER_ADMIN_A, name: "Admin A", email: "api-admin-a@test.com", passwordHash: adminHash, role: "clinic_admin", status: "active", createdAt: t, updatedAt: t },
      { clinicId: CLINIC_A, userId: "usr_api_patient_a", name: "Patient A", email: "api-patient-a@test.com", passwordHash: patientHash, role: "patient", patientId: "pat_api_patient_a", status: "active", createdAt: t, updatedAt: t },
      { clinicId: CLINIC_B, userId: "usr_api_admin_b", name: "Admin B", email: "api-admin-b@test.com", passwordHash: adminHash, role: "clinic_admin", status: "active", createdAt: t, updatedAt: t },
      { clinicId: null, userId: "usr_platform", name: "Platform", email: "platform@test.com", passwordHash: adminHash, role: "platform_admin", status: "active", createdAt: t, updatedAt: t },
    ],
    clc_patients: [
      { clinicId: CLINIC_A, patientId: "pat_api_patient_a", doctorId: DOCTOR_A1, userId: "usr_api_patient_a", fullName: "Patient A", mobile: "9000000111", status: "active", createdAt: t, updatedAt: t },
      { clinicId: CLINIC_B, patientId: "pat_api_patient_b", doctorId: null, userId: null, fullName: "Patient B", mobile: "9000000222", status: "active", createdAt: t, updatedAt: t },
    ],
  });
  mockDbHolder.db = db;
  return db;
}

async function login(app: Awaited<ReturnType<typeof buildServer>>, email: string, password: string) {
  const res = await app.inject({
    method: "POST",
    url: "/api/clinics/auth/login",
    payload: { email, password },
  });
  expect(res.statusCode).toBe(200);
  return (res.json() as { token: string }).token;
}

describe("Clinic API over HTTP", () => {
  beforeEach(() => {
    invalidateCache("clc:user:");
    AUTH_LIMITER.clear();
    API_LIMITER.clear();
    seedDb();
  });

  it("returns 401 without a token on a tenant route", async () => {
    const app = buildServer();
    const res = await app.inject({ method: "GET", url: `/api/clinics/${CLINIC_A}/patients` });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ error: "Missing authentication token" });
  });

  it("returns 401 for a forged token", async () => {
    const app = buildServer();
    const res = await app.inject({
      method: "GET",
      url: `/api/clinics/${CLINIC_A}/patients`,
      headers: { authorization: "Bearer forged.token.value" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("login → token → clinic admin sees ONLY their clinic's patients", async () => {
    const app = buildServer();
    const token = await login(app, "api-admin-a@test.com", "admin-secret");
    const res = await app.inject({
      method: "GET",
      url: `/api/clinics/${CLINIC_A}/patients`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { items: { patientId: string }[] };
    expect(body.items.map((p) => p.patientId)).toEqual(["pat_api_patient_a"]);
  });

  it("IDOR: clinic A's token requesting clinic B's URL path returns 404", async () => {
    const app = buildServer();
    const token = await login(app, "api-admin-a@test.com", "admin-secret");
    const res = await app.inject({
      method: "GET",
      url: `/api/clinics/${CLINIC_B}/patients`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it("IDOR: clinic A's token requesting a NONEXISTENT clinic id also returns 404 (no probing)", async () => {
    const app = buildServer();
    const token = await login(app, "api-admin-a@test.com", "admin-secret");
    const res = await app.inject({
      method: "GET",
      url: "/api/clinics/clc_does_not_exist/patients",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it("patient role can read only their own patient record via the API", async () => {
    const app = buildServer();
    const token = await login(app, "api-patient-a@test.com", "patient-secret");
    const res = await app.inject({
      method: "GET",
      url: `/api/clinics/${CLINIC_A}/patients/pat_api_patient_a`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const other = await app.inject({
      method: "GET",
      url: `/api/clinics/${CLINIC_A}/patients/pat_api_patient_b`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(other.statusCode).toBe(404);
  });

  it("platform_admin can list every clinic and read any clinic's patients", async () => {
    const app = buildServer();
    const token = await login(app, "platform@test.com", "admin-secret");
    const res = await app.inject({
      method: "GET",
      url: "/api/clinics",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect((res.json() as { items: unknown[] }).items).toHaveLength(3);

    const cross = await app.inject({
      method: "GET",
      url: `/api/clinics/${CLINIC_B}/patients`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(cross.statusCode).toBe(200);
  });

  it("clinic admin CANNOT list all clinics (platform-only)", async () => {
    const app = buildServer();
    const token = await login(app, "api-admin-a@test.com", "admin-secret");
    const res = await app.inject({
      method: "GET",
      url: "/api/clinics",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it("staff role cannot read patients (clinical data)", async () => {
    const app = buildServer();
    // seed a staff user
    const db = mockDbHolder.db!;
    await db.collection("clc_users").insertOne({
      clinicId: CLINIC_A, userId: "usr_api_staff", name: "Staff", email: "api-staff@test.com",
      passwordHash: adminHash, role: "staff", status: "active", createdAt: t, updatedAt: t,
    });
    const token = await login(app, "api-staff@test.com", "admin-secret");
    const res = await app.inject({
      method: "GET",
      url: `/api/clinics/${CLINIC_A}/patients`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it("signup creates a clinic and returns a usable session", async () => {
    const app = buildServer();
    const res = await app.inject({
      method: "POST",
      url: "/api/clinics/auth/signup",
      payload: { clinicName: "New Clinic", adminName: "Neha", email: "neha@new.test", password: "StrongPass#123" },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json() as { clinicId: string; token: string };
    expect(body.clinicId).toMatch(/^clc_/);
    const me = await app.inject({
      method: "GET",
      url: "/api/clinics/auth/me",
      headers: { authorization: `Bearer ${body.token}` },
    });
    expect(me.statusCode).toBe(200);
    expect((me.json() as { role: string }).role).toBe("clinic_admin");
  });

  it("login with wrong password returns 401", async () => {
    const app = buildServer();
    const res = await app.inject({
      method: "POST",
      url: "/api/clinics/auth/login",
      payload: { email: "api-admin-a@test.com", password: "wrong" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("deactivated clinic returns 401 at the boundary", async () => {
    const app = buildServer();
    const token = await login(app, "api-admin-a@test.com", "admin-secret");
    await mockDbHolder.db!.collection("clc_clinics").updateOne({ clinicId: CLINIC_A }, { $set: { status: "suspended" } });
    invalidateCache("clc:user:");
    const res = await app.inject({
      method: "GET",
      url: `/api/clinics/${CLINIC_A}/patients`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(401);
  });

  it("wrong payload on create returns 400 validation error", async () => {
    const app = buildServer();
    const token = await login(app, "api-admin-a@test.com", "admin-secret");
    const res = await app.inject({
      method: "POST",
      url: `/api/clinics/${CLINIC_A}/patients`,
      headers: { authorization: `Bearer ${token}` },
      payload: { fullName: "" },
    });
    expect(res.statusCode).toBe(400);
  });
});