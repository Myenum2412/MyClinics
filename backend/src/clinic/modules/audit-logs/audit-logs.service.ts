import type { Db, WithId } from "mongodb";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import type { ClinicContext } from "@/clinic/core/context";
import { ForbiddenError } from "@/clinic/core/errors";

export interface AuditLogQuery {
  entity?: string;
  action?: string;
  actorId?: string;
  from?: string;
  to?: string;
  skip: number;
  limit: number;
}

export interface AuditLogEntry extends WithId<Record<string, unknown>> {
  clinicId: string | null;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export class AuditLogService {
  constructor(private readonly db: Db) {}

  async list(
    ctx: ClinicContext,
    clinicId: string,
    query: AuditLogQuery
  ): Promise<{ items: AuditLogEntry[]; total: number }> {
    // Clinic admins may only read their own clinic's audit trail.
    if (ctx.role !== "platform_admin" && ctx.clinicId !== clinicId) {
      throw new ForbiddenError();
    }

    const filter: Record<string, unknown> = { clinicId };
    if (query.entity) filter.entity = query.entity;
    if (query.action) filter.action = query.action;
    if (query.actorId) filter.actorId = query.actorId;
    if (query.from || query.to) {
      filter.createdAt = {
        ...(query.from ? { $gte: new Date(`${query.from}T00:00:00Z`) } : {}),
        ...(query.to ? { $lte: new Date(`${query.to}T23:59:59Z`) } : {}),
      };
    }

    const collection = this.db.collection(CLINIC_COLLECTIONS.auditLogs);
    const [items, total] = await Promise.all([
      collection
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .toArray(),
      collection.countDocuments(filter),
    ]);
    return { items: items as unknown as AuditLogEntry[], total };
  }
}