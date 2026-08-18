import type { Db } from "mongodb";
import { MT_COLLECTIONS } from "@/mt/core/collections";
import type { TenantContext } from "@/mt/core/tenant-context";

/**
 * Audit event types. `create` / `update` / `delete` are written by the
 * repositories on every mutation; `access` is written by controllers for
 * sensitive reads (patient records, medical history); `signup` / `login` /
 * `logout` / `refresh` are written by the auth service.
 */
export const AUDIT_ACTIONS = [
  "signup",
  "login",
  "logout",
  "refresh",
  "create",
  "update",
  "delete",
  "access",
  "login_failed",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditEntry {
  clinicId: string;
  actorId: string;
  actorRole: string;
  action: AuditAction;
  entity: string;
  entityId: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
  createdAt: Date;
}

export type AuditInput = Omit<AuditEntry, "clinicId" | "actorId" | "actorRole" | "createdAt">;

/**
 * Appends an audit entry. Never throws: audit failures must not break the
 * business operation that triggered them. Entries are written to
 * `mt_audit_logs` with clinicId so admins can audit their tenant and the
 * platform can analyze across tenants.
 */
export async function writeAudit(
  db: Db,
  ctx: TenantContext | Pick<TenantContext, "userId" | "clinicId" | "role"> | null,
  input: AuditInput
): Promise<void> {
  try {
    const entry: AuditEntry = {
      clinicId: ctx?.clinicId ?? "unknown",
      actorId: ctx?.userId ?? "system",
      actorRole: ctx?.role ?? "system",
      ...input,
      createdAt: new Date(),
    };
    await db.collection(MT_COLLECTIONS.auditLogs).insertOne(entry);
  } catch (error) {
    console.error("[mt-audit] failed to write audit entry", error);
  }
}
