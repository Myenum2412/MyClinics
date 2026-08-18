import { describe, it, expect } from "vitest";
import { createFakeDb } from "../helpers/fake-db";
import { writeAudit } from "@/mt/core/audit";
import type { TenantContext } from "@/mt/core/tenant-context";

const ctx: TenantContext = {
  userId: "usr_staff1",
  clinicId: "clc_A",
  role: "staff",
  name: "Staff",
  email: "staff@test.local",
  patientId: null,
  tokenId: "jti-1",
  ip: "10.0.0.1",
  userAgent: "curl/8",
};

describe("audit logging", () => {
  it("writes create/update/delete/access events with clinicId", async () => {
    const { db, dump } = createFakeDb();

    await writeAudit(db, ctx, {
      action: "create",
      entity: "patient",
      entityId: "pat_alice",
      metadata: { fullName: "Alice" },
    });
    await writeAudit(db, ctx, {
      action: "access",
      entity: "medical_record",
      entityId: "mrc_1",
      metadata: { patientId: "pat_alice" },
    });

    const logs = dump("mt_audit_logs");
    expect(logs).toHaveLength(2);
    expect(logs[0].clinicId).toBe("clc_A");
    expect(logs[0].actorId).toBe("usr_staff1");
    expect(logs[0].actorRole).toBe("staff");
    expect(logs[0].action).toBe("create");
    expect(logs[0].entityId).toBe("pat_alice");
    expect(logs[0].createdAt).toBeInstanceOf(Date);
  });

  it("never throws — audit failures do not break business operations", async () => {
    const { db } = createFakeDb();
    // Force a failure by passing an unusable db.
    await expect(
      writeAudit(null as never, ctx, { action: "create", entity: "patient", entityId: "x" })
    ).resolves.toBeUndefined();
  });

  it("tracks actor identity and request metadata", async () => {
    const { db, dump } = createFakeDb();
    await writeAudit(db, ctx, {
      action: "delete",
      entity: "prescription",
      entityId: "prx_1",
      ip: "10.0.0.1",
      userAgent: "curl/8",
    });

    const [log] = dump("mt_audit_logs");
    expect(log.ip).toBe("10.0.0.1");
    expect(log.userAgent).toBe("curl/8");
    expect(log.actorId).toBe("usr_staff1");
  });
});