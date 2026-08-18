import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import { vi } from "vitest";
import type { Db } from "mongodb";
import { createFakeDb } from "../helpers/fake-db";
import { applyTenantScope, allowStaffOrOwnPatient } from "@/mt/core/tenant-scope";
import { signTenantToken } from "@/mt/core/jwt";
import type { MtUserDoc } from "@/mt/modules/auth/auth.schema";

const TEST_SECRET = "mt-test-secret-0123456789abcdef";

const fakeDbRef = vi.hoisted(() => ({ db: null as unknown as Db }));
vi.mock("@/lib/db", () => ({
  getDb: async () => fakeDbRef.db,
}));

function seedUser(clinicId: string, userId: string, role: string, overrides = {}) {
  const user: MtUserDoc = {
    clinicId,
    userId,
    name: "Test User",
    email: "user@test.local",
    passwordHash: "x",
    role: role as MtUserDoc["role"],
    patientId: null,
    phone: null,
    status: "active",
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
  return user;
}

async function buildApp() {
  const app = Fastify();
  app.register(async (tenantApi) => {
    applyTenantScope(tenantApi);
    tenantApi.get("/ping", async (request) => {
      const tenant = request.tenant;
      return {
        clinicId: tenant?.clinicId ?? null,
        role: tenant?.role ?? null,
        userId: tenant?.userId ?? null,
        patientId: tenant?.patientId ?? null,
      };
    });
    tenantApi.get(
      "/guarded/:patientId",
      { preHandler: allowStaffOrOwnPatient },
      async (request) => ({ ok: true, patientId: (request.params as { patientId: string }).patientId })
    );
  });
  await app.ready();
  return app;
}

describe("tenant-scope middleware", () => {
  beforeAll(() => {
    process.env.MT_JWT_SECRET = TEST_SECRET;
  });

  afterAll(() => {
    delete process.env.MT_JWT_SECRET;
  });

  it("rejects requests without a token (401)", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/ping" });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it("rejects requests with an invalid token (401)", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/ping",
      headers: { authorization: "Bearer not-a-real-token" },
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it("rejects tokens for suspended clinics (401)", async () => {
    const fake = createFakeDb({
      mt_users: [seedUser("clc_S", "usr_susp", "staff")],
      mt_clinics: [{ clinicId: "clc_S", status: "suspended" }],
    });
    fakeDbRef.db = fake.db;
    const token = await signTenantToken({
      userId: "usr_susp",
      clinicId: "clc_S",
      role: "staff",
      name: null,
      email: null,
      patientId: null,
    });

    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/ping",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it("injects the tenant context for a valid token", async () => {
    const fake = createFakeDb({
      mt_users: [seedUser("clc_A", "usr_1", "patient", { patientId: "pat_own" })],
      mt_clinics: [{ clinicId: "clc_A", status: "active" }],
    });
    fakeDbRef.db = fake.db;
    const token = await signTenantToken({
      userId: "usr_1",
      clinicId: "clc_A",
      role: "patient",
      name: "Patient One",
      email: "p1@test.local",
      patientId: "pat_own",
    });

    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/ping",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.clinicId).toBe("clc_A");
    expect(body.role).toBe("patient");
    expect(body.userId).toBe("usr_1");
    expect(body.patientId).toBe("pat_own");
    await app.close();
  });

  it("allows staff through an ownership-guarded route (regression: sync route hooks must never hang the request)", async () => {
    const fake = createFakeDb({
      mt_users: [seedUser("clc_A", "usr_staff", "staff")],
      mt_clinics: [{ clinicId: "clc_A", status: "active" }],
    });
    fakeDbRef.db = fake.db;
    const token = await signTenantToken({
      userId: "usr_staff",
      clinicId: "clc_A",
      role: "staff",
      name: null,
      email: null,
      patientId: null,
    });

    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/guarded/pat_anyone",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().patientId).toBe("pat_anyone");
    await app.close();
  });

  it("lets a patient through only for their own patientId, 404 otherwise", async () => {
    const fake = createFakeDb({
      mt_users: [seedUser("clc_A", "usr_p", "patient", { patientId: "pat_own" })],
      mt_clinics: [{ clinicId: "clc_A", status: "active" }],
    });
    fakeDbRef.db = fake.db;
    const token = await signTenantToken({
      userId: "usr_p",
      clinicId: "clc_A",
      role: "patient",
      name: "Patient One",
      email: "p1@test.local",
      patientId: "pat_own",
    });

    const app = await buildApp();

    const own = await app.inject({
      method: "GET",
      url: "/guarded/pat_own",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(own.statusCode).toBe(200);

    const other = await app.inject({
      method: "GET",
      url: "/guarded/pat_someone_else",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(other.statusCode).toBe(404);
    await app.close();
  });
});