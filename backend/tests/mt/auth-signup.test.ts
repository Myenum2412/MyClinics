import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createFakeDb } from "../helpers/fake-db";
import { AuthService } from "@/mt/modules/auth/auth.service";
import { verifyTenantToken } from "@/mt/core/jwt";
import { AuthRepository } from "@/mt/modules/auth/auth.repository";
import { isValidClinicId } from "@/mt/core/jwt";

const TEST_SECRET = "mt-test-secret-0123456789abcdef";

describe("clinic signup (Clinic ID generation)", () => {
  beforeAll(() => {
    process.env.MT_JWT_SECRET = TEST_SECRET;
  });
  afterAll(() => {
    delete process.env.MT_JWT_SECRET;
  });

  it("creates a clinic with a generated clinicId and a clinic_admin user", async () => {
    const { db, dump } = createFakeDb();
    const service = new AuthService(db);

    const result = await service.signup({
      clinicName: "Sunrise Family Clinic",
      adminName: "Dr. Amina Rao",
      email: "admin@sunrise.test",
      password: "StrongPass123",
      phone: "+919876543210",
    });

    // Clinic ID is generated, prefixed, and returned to the client.
    expect(isValidClinicId(result.clinicId)).toBe(true);
    expect(result.clinicId.startsWith("clc_")).toBe(true);
    expect(result.role).toBe("clinic_admin");

    const clinics = dump("mt_clinics");
    expect(clinics).toHaveLength(1);
    expect(clinics[0].clinicId).toBe(result.clinicId);
    expect(clinics[0].status).toBe("active");
    expect(clinics[0].slug).toBe("sunrise-family-clinic");

    const users = dump("mt_users");
    expect(users).toHaveLength(1);
    expect(users[0].clinicId).toBe(result.clinicId);
    expect(users[0].role).toBe("clinic_admin");
    expect(users[0].email).toBe("admin@sunrise.test");
    expect(users[0].passwordHash).not.toContain("StrongPass123");
  });

  it("issues a JWT carrying clinicId + role claims", async () => {
    const { db } = createFakeDb();
    const service = new AuthService(db);
    const result = await service.signup({
      clinicName: "Hope Clinic",
      adminName: "Dr. B",
      email: "admin@hope.test",
      password: "StrongPass123",
      phone: null,
    });

    const verified = await verifyTenantToken(result.token);
    expect(verified.clinicId).toBe(result.clinicId);
    expect(verified.role).toBe("clinic_admin");
    expect(verified.userId).toBe(result.userId);
    expect(verified.email).toBe("admin@hope.test");
  });

  it("rejects duplicate emails across clinics", async () => {
    const { db } = createFakeDb();
    const service = new AuthService(db);
    await service.signup({
      clinicName: "Clinic One",
      adminName: "A",
      email: "dup@test.local",
      password: "StrongPass123",
      phone: null,
    });

    await expect(
      service.signup({
        clinicName: "Clinic Two",
        adminName: "B",
        email: "dup@test.local",
        password: "StrongPass123",
        phone: null,
      })
    ).rejects.toThrow(/already exists/);
  });

  it("logs a patient in with their clinic scoped token", async () => {
    const { db } = createFakeDb();
    const service = new AuthService(db);
    const signup = await service.signup({
      clinicName: "Care Clinic",
      adminName: "Dr. C",
      email: "admin@care.test",
      password: "StrongPass123",
      phone: null,
    });

    // Simulate staff creating a patient portal account (real bcrypt hash).
    const bcrypt = await import("bcryptjs");
    const repo = new AuthRepository(db);
    await repo.createUser({
      clinicId: signup.clinicId,
      userId: "usr_patient1",
      name: "Patient One",
      email: "patient@care.test",
      passwordHash: await bcrypt.hash("PatientPass123", 4),
      role: "patient",
      patientId: "pat_own",
      phone: "919999999999",
      status: "active",
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const login = await service.login(
      { email: "patient@care.test", password: "PatientPass123" },
      { ip: "1.2.3.4", userAgent: "vitest" }
    );
    expect(login.clinicId).toBe(signup.clinicId);
    expect(login.role).toBe("patient");
    expect(login.patientId).toBe("pat_own");

    const verified = await verifyTenantToken(login.token);
    expect(verified.clinicId).toBe(signup.clinicId);
    expect(verified.role).toBe("patient");
    expect(verified.patientId).toBe("pat_own");

    // Wrong password is rejected and never leaks a clinic id.
    const failed = await service.login(
      { email: "patient@care.test", password: "wrong-password" },
      { ip: "1.2.3.4", userAgent: "vitest" }
    ).catch((e: Error) => e);
    expect(failed).toBeInstanceOf(Error);
    expect((failed as Error).message).toMatch(/Invalid email or password/);
  });
});