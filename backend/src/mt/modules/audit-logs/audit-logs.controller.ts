import type { FastifyReply, FastifyRequest } from "fastify";
import { getDb } from "@/lib/db";
import { ForbiddenError, NotFoundError, ValidationError } from "@/mt/core/errors";
import { mtPaged, parseMtPagination, queryParamsFromRecord } from "@/mt/core/pagination";
import { requirePatientAccess } from "@/mt/core/tenant-scope";
import {
  auditLogsPatientQuerySchema,
  listAuditLogsQuerySchema,
} from "@/mt/modules/audit-logs/audit-logs.dto";
import { AuditLogRepository, mapAuditLog } from "@/mt/modules/audit-logs/audit-logs.repository";

export class AuditLogController {
  /**
   * GET /api/mt/audit-logs — clinic_admin only. Staff and patients have no
   * view of the audit trail.
   */
  async list(request: FastifyRequest, reply: FastifyReply) {
    const ctx = request.tenant;
    if (!ctx) throw new ForbiddenError();
    if (ctx.role !== "clinic_admin") {
      throw new ForbiddenError("Only the clinic admin can view audit logs");
    }

    const query = listAuditLogsQuerySchema.safeParse(request.query);
    if (!query.success) {
      throw new ValidationError("Invalid query parameters");
    }

    const filter: Record<string, unknown> = {};
    if (query.data.entity) filter.entity = query.data.entity;
    if (query.data.entityId) filter.entityId = query.data.entityId;
    if (query.data.actorId) filter.actorId = query.data.actorId;
    if (query.data.action) filter.action = query.data.action;
    if (query.data.from || query.data.to) {
      const range: Record<string, Date> = {};
      if (query.data.from) range.$gte = new Date(`${query.data.from}T00:00:00Z`);
      if (query.data.to) range.$lte = new Date(`${query.data.to}T23:59:59.999Z`);
      filter.createdAt = range;
    }

    const pagination = parseMtPagination(queryParamsFromRecord(query.data as never));

    const { items, total } = await new AuditLogRepository(await getDb(), ctx).list(filter, {
      skip: pagination.skip,
      limit: pagination.pageSize,
    });

    return reply.send(mtPaged(items.map(mapAuditLog), total, pagination));
  }

  /**
   * GET /api/mt/audit-logs/patient/:patientId — who accessed a patient's
   * records. clinic_admin/staff see any patient's trail; a patient may only
   * query their own (transparency feature).
   */
  async listForPatient(request: FastifyRequest, reply: FastifyReply) {
    const ctx = request.tenant;
    if (!ctx) throw new ForbiddenError();

    const query = auditLogsPatientQuerySchema.safeParse({
      ...(request.query as Record<string, unknown>),
      patientId: (request.params as { patientId?: string }).patientId,
    });
    if (!query.success) {
      throw new NotFoundError("Patient not found");
    }

    await requirePatientAccess(request, reply, query.data.patientId);

    const pagination = parseMtPagination(queryParamsFromRecord(query.data as never));

    const repo = new AuditLogRepository(await getDb(), ctx);

    // Entries about the patient directly (entityId) or where the patient is
    // referenced in metadata (e.g. access events on their records).
    const { items, total } = await repo.list(
      {
        $or: [
          { entityId: query.data.patientId },
          { "metadata.patientId": query.data.patientId },
        ],
      },
      { skip: pagination.skip, limit: pagination.pageSize }
    );

    return reply.send(mtPaged(items.map(mapAuditLog), total, pagination));
  }
}