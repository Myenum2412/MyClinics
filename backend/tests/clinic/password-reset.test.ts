import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestError } from "@/clinic/core/errors";
import { AuthService } from "@/clinic/modules/auth/auth.service";
import { createFakeDb } from "../helpers/fake-db";
import { CLINIC_A, USER_ADMIN_A } from "./helpers/fixtures";

const sent: { to: string; name: string; token: string }[] = vi.hoisted(() => []);

vi.mock("@/services/email/password-reset-email", () => ({
  sendPasswordResetEmail: async (input: { to: string; name: string; token: string }) => {
    sent.push(input);
    return true;
  },
}));

vi.mock("@/services/email/welcome-email", () => ({
  sendSignupWelcomeEmail: async () => true,
}));

async function hash(password: string): Promise<string> {
  return bcrypt.hash(password, 4);
}

async function setup(overrides: Record<string, unknown> = {}) {
  const { db, dump } = createFakeDb({
    clc_clinics: [
      { clinicId: CLINIC_A, name: "Clinic A", slug: "clinic-a", status: "active" },
    ],
    clc_users: [
      {
        clinicId: CLINIC_A,
        userId: USER_ADMIN_A,
        name: "Admin A",
        email: "admina@test.com",
        passwordHash: await hash("OldPass#123"),
        authProvider: "password",
        role: "clinic_admin",
        doctorId: null,
        staffId: null,
        patientId: null,
        phone: null,
        status: "active",
        lastLoginAt: null,
        ...overrides,
      },
    ],
  });
  return { db, dump, service: new AuthService(db) };
}

beforeEach(() => {
  sent.length = 0;
});

describe("password reset", () => {
  it("emails a reset link and stores only a hash of the token", async () => {
    const { service, dump } = await setup();

    await service.requestPasswordReset({ email: "ADMINA@test.com" });

    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("admina@test.com");

    const resets = dump("clc_password_resets");
    expect(resets).toHaveLength(1);
    expect(resets[0].userId).toBe(USER_ADMIN_A);
    expect(resets[0].tokenHash).not.toBe(sent[0].token);
    expect(String(resets[0].usedAt)).toBe("null");
  });

  it("resets the password and the link can only be used once", async () => {
    const { service, dump } = await setup();

    await service.requestPasswordReset({ email: "admina@test.com" });
    const token = sent[0].token;

    await service.resetPassword({ token, password: "NewPass#123" });

    const user = dump("clc_users")[0];
    expect(await bcrypt.compare("NewPass#123", user.passwordHash)).toBe(true);
    expect(dump("clc_password_resets")).toHaveLength(0);

    await expect(
      service.resetPassword({ token, password: "Another#123" })
    ).rejects.toThrow(BadRequestError);
  });

  it("does not reveal unknown emails and sends nothing", async () => {
    const { service, dump } = await setup();

    await expect(
      service.requestPasswordReset({ email: "nobody@test.com" })
    ).resolves.toEqual({ ok: true });
    expect(sent).toHaveLength(0);
    expect(dump("clc_password_resets")).toHaveLength(0);
  });

  it("skips Google-only accounts", async () => {
    const { service, dump } = await setup({ authProvider: "google", passwordHash: null });

    await expect(
      service.requestPasswordReset({ email: "admina@test.com" })
    ).resolves.toEqual({ ok: true });
    expect(sent).toHaveLength(0);
    expect(dump("clc_password_resets")).toHaveLength(0);
  });

  it("supports mobile / WhatsApp number lookup (patient-style login)", async () => {
    const { service } = await setup({
      role: "patient",
      phone: "9876543210",
      email: "patient@example.com",
    });

    await service.requestPasswordReset({ identifier: "98765 43210" });

    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("patient@example.com");
  });

  it("never emails placeholder @patient.mc addresses", async () => {
    const { service, dump } = await setup({
      role: "patient",
      phone: "9876543210",
      email: "9876543210@patient.mc",
    });

    await expect(
      service.requestPasswordReset({ identifier: "9876543210" })
    ).resolves.toEqual({ ok: true });

    expect(sent).toHaveLength(0);
    expect(dump("clc_password_resets")).toHaveLength(0);
  });

  it("resets works for a doctor account", async () => {
    const { service, dump } = await setup({
      role: "doctor",
      userId: "usr_doc_test",
      email: "doctor@clinic.test",
      name: "Dr. Meera",
    });

    await service.requestPasswordReset({ identifier: "doctor@clinic.test" });
    expect(sent.at(-1)?.to).toBe("doctor@clinic.test");

    await service.resetPassword({ token: sent.at(-1)!.token, password: "DoctorPass#123" });
    expect(await bcrypt.compare("DoctorPass#123", dump("clc_users")[0].passwordHash)).toBe(true);
  });

  it("rejects an invalid token", async () => {
    const { service } = await setup();
    await expect(
      service.resetPassword({ token: "not-a-real-token-value-123", password: "NewPass#123" })
    ).rejects.toThrow(BadRequestError);
  });

  it("invalidates older links when a new one is requested", async () => {
    const { service } = await setup();

    await service.requestPasswordReset({ email: "admina@test.com" });
    const firstToken = sent[0].token;
    await service.requestPasswordReset({ email: "admina@test.com" });
    const secondToken = sent[1].token;

    await expect(
      service.resetPassword({ token: firstToken, password: "NewPass#123" })
    ).rejects.toThrow(BadRequestError);

    await expect(
      service.resetPassword({ token: secondToken, password: "NewPass#123" })
    ).resolves.toMatchObject({ ok: true });
  });
});
