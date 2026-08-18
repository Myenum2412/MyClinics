import type { Db } from "mongodb";
import { MT_COLLECTIONS } from "@/mt/core/collections";
import type { TenantContext } from "@/mt/core/tenant-context";

/**
 * Read-only access to the audit trail of the caller's clinic.
 * Audit entries are written by the audit service; this repository only
 * queries them — always tenant-scoped.
 */
export class AuditLogRepository {
  constructor(
    private readonly db: Db,
    private readonly ctx: TenantContext
  ) {}

  private collection() {
    return this.db.collection(MT_COLLECTIONS.auditLogs);
  }

  async list(
    filter: Record<string, unknown>,
    options: { skip: number; limit: number }
  ): Promise<{ items: Record<string, unknown>[]; total: number }> {
    const scoped = { clinicId: this.ctx.clinicId, ...filter };
    const [items, total] = await Promise.all([
      this.collection()
        .find(scoped)
        .sort({ createdAt: -1 })
        .skip(options.skip)
        .limit(options.limit)
        .toArray(),
      this.collection().countDocuments(scoped),
    ]);
    return { items, total };
  }
}

export function mapAuditLog(doc: Record<string, unknown>) {
  return {
    id: (doc._id as { toString(): string }).toString(),
    clinicId: doc.clinicId,
    actorId: doc.actorId,
    actorRole: doc.actorRole,
    action: doc.action,
    entity: doc.entity,
    entityId: doc.entityId ?? null,
    metadata: doc.metadata ?? null,
    ip: doc.ip ?? null,
    userAgent: doc.userAgent ?? null,
    createdAt: doc.createdAt,
  };
}