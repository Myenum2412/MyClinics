import type { Db } from "mongodb";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import type { ClinicContext } from "@/clinic/core/context";
import { now as nowFn } from "@/clinic/core/datetime";
import { randomToken } from "@/clinic/core/ids";

export interface AuditEntryInput {
  action: string;
  entity: string;
  entityId: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Appends an audit entry. `ctx` may be null for tenantless system events
 * (e.g. failed logins before a session exists); clinic-scoped entries always
 * carry the clinicId so logs can never leak across tenants.
 */
export async function writeAudit(
  db: Db,
  ctx: ClinicContext | null,
  input: AuditEntryInput
): Promise<void> {
  const now = nowFn();
  await db.collection(CLINIC_COLLECTIONS.auditLogs).insertOne({
    auditId: `aud_${randomToken(12)}`,
    clinicId: ctx?.clinicId ?? null,
    actorId: ctx?.userId ?? null,
    actorRole: ctx?.role ?? null,
    actorDoctorId: ctx?.doctorId ?? null,
    actorPatientId: ctx?.patientId ?? null,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId ?? null,
    metadata: input.metadata ?? {},
    ip: input.ip ?? ctx?.ip ?? null,
    userAgent: input.userAgent ?? ctx?.userAgent ?? null,
    createdAt: now,
  });
}
