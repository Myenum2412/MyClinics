import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";
import { ConflictError, UnauthorizedError } from "@/clinic/core/errors";
import { AuthService } from "@/clinic/modules/auth/auth.service";
import { createFakeDb } from "../helpers/fake-db";
import { CLINIC_A, USER_ADMIN_A, USER_PATIENT_A1 } from "./helpers/fixtures";

const t = new Date("2026-01-01T00:00:00Z");

async function hash(password: string): Promise<string> {
  return bcrypt.hash(password, 4);
}

describe("AuthService", () => {
  it("signup creates a clinic + first clinic_admin and returns a session token", async () => {
    const { db, dump } = createFakeDb();
    const service = new AuthService(db);
    const result = await service.signup({
      clinicName: "Sunrise Clinic",
      adminName: "Ravi",
      email: "ravi@sunrise.test",
      password: "StrongPass#123",
    });

    expect(result.clinicId).toMatch(/^clc_/);
    expect(result.role).toBe("clinic_admin");
    expect(result.token).toBeTruthy();
    expect(dump("clc_clinics")).toHaveLength(1);
    expect(dump("clc_users")).toHaveLength(1);
    expect(dump("clc_users")[0].role).toBe("clinic_admin");
    expect(dump("clc_users")[0].clinicId).toBe(result.clinicId);
    expect(dump("clc_users")[0].passwordHash).not.toContain("StrongPass");
  });

  it("signup rejects a duplicate email", async () => {
    const { db } = createFakeDb({
      clc_users: [{ clinicId: CLINIC_A, userId: USER_ADMIN_A, email: "dup@test.com", passwordHash: await hash("x"), role: "clinic_admin", status: "active" }],
    });
    const service = new AuthService(db);
    await expect(
      service.signup({ clinicName: "X", adminName: "Y", email: "DUP@test.com", password: "StrongPass#123" })
    ).rejects.toThrow(ConflictError);
  });

  it("login succeeds with valid credentials and returns clinic context", async () => {
    const { db } = createFakeDb({
      clc_clinics: [{ clinicId: CLINIC_A, name: "Clinic A", status: "active", slug: "clinic-a" }],
      clc_users: [{ clinicId: CLINIC_A, userId: USER_ADMIN_A, email: "admina@test.com", passwordHash: await hash("secret"), role: "clinic_admin", status: "active" }],
    });
    const service = new AuthService(db);
    const result = await service.login({ email: "admina@test.com", password: "secret" }, { ip: "1.2.3.4", userAgent: "vitest" });
    expect(result.clinicId).toBe(CLINIC_A);
    expect(result.role).toBe("clinic_admin");
    expect(result.token).toBeTruthy();
  });

  it("login is case-insensitive on email and rejects wrong password", async () => {
    const { db } = createFakeDb({
      clc_clinics: [{ clinicId: CLINIC_A, status: "active" }],
      clc_users: [{ clinicId: CLINIC_A, userId: USER_ADMIN_A, email: "admina@test.com", passwordHash: await hash("secret"), role: "clinic_admin", status: "active" }],
    });
    const service = new AuthService(db);
    await expect(
      service.login({ email: "ADMINA@test.com", password: "wrong" }, { ip: null, userAgent: null })
    ).rejects.toThrow(UnauthorizedError);
  });

  it("login rejects a deactivated account", async () => {
    const { db } = createFakeDb({
      clc_clinics: [{ clinicId: CLINIC_A, status: "active" }],
      clc_users: [{ clinicId: CLINIC_A, userId: USER_PATIENT_A1, email: "pa1@test.com", passwordHash: await hash("secret"), role: "patient", status: "inactive" }],
    });
    const service = new AuthService(db);
    await expect(
      service.login({ email: "pa1@test.com", password: "secret" }, { ip: null, userAgent: null })
    ).rejects.toThrow(UnauthorizedError);
  });

  it("login rejects when the clinic is suspended", async () => {
    const { db } = createFakeDb({
      clc_clinics: [{ clinicId: CLINIC_A, status: "suspended" }],
      clc_users: [{ clinicId: CLINIC_A, userId: USER_ADMIN_A, email: "admina@test.com", passwordHash: await hash("secret"), role: "clinic_admin", status: "active" }],
    });
    const service = new AuthService(db);
    await expect(
      service.login({ email: "admina@test.com", password: "secret" }, { ip: null, userAgent: null })
    ).rejects.toThrow(UnauthorizedError);
  });

  it("refresh re-issues a token for an active session", async () => {
    const { db } = createFakeDb({
      clc_clinics: [{ clinicId: CLINIC_A, status: "active" }],
      clc_users: [{ clinicId: CLINIC_A, userId: USER_ADMIN_A, email: "admina@test.com", passwordHash: await hash("secret"), role: "clinic_admin", status: "active" }],
    });
    const service = new AuthService(db);
    const login = await service.login({ email: "admina@test.com", password: "secret" }, { ip: null, userAgent: null });
    const refreshed = await service.refresh(login.token);
    expect(typeof refreshed).toBe("string");
    expect(refreshed.length).toBeGreaterThan(0);
    expect(refreshed).not.toBe(login.token);
  });

  it("refresh rejects a token whose clinic no longer matches the user record", async () => {
    const { db } = createFakeDb({
      clc_clinics: [{ clinicId: CLINIC_A, status: "active" }],
      clc_users: [{ clinicId: CLINIC_A, userId: USER_ADMIN_A, email: "admina@test.com", passwordHash: await hash("secret"), role: "clinic_admin", status: "active" }],
    });
    const service = new AuthService(db);
    const login = await service.login({ email: "admina@test.com", password: "secret" }, { ip: null, userAgent: null });
    // simulate the user being moved to another clinic in the DB
    await db.collection("clc_users").updateOne({ userId: USER_ADMIN_A }, { $set: { clinicId: "clc_other_clinic" } });
    await expect(service.refresh(login.token)).rejects.toThrow(UnauthorizedError);
  });

  it("refresh rejects garbage tokens", async () => {
    const { db } = createFakeDb();
    const service = new AuthService(db);
    await expect(service.refresh("not-a-jwt")).rejects.toThrow(UnauthorizedError);
  });

  it("stores the audit trail on signup and login", async () => {
    const { db, dump } = createFakeDb();
    const service = new AuthService(db);
    await service.signup({ clinicName: "Audit Clinic", adminName: "A", email: "a@audit.test", password: "StrongPass#123" });
    await service.login({ email: "a@audit.test", password: "StrongPass#123" }, { ip: "9.9.9.9", userAgent: "curl" });
    const logs = dump("clc_audit_logs");
    expect(logs.some((l) => l.action === "signup")).toBe(true);
    expect(logs.some((l) => l.action === "login" && l.actorId === logs.find((x) => x.action === "signup")?.metadata?.actorUserId)).toBe(true);
    void t;
  });
});