import type { FastifyReply, FastifyRequest } from "fastify";
import type { Db } from "mongodb";
import { getDb } from "@/lib/db-pools";
import {
  BadRequestError,
  UnauthorizedError,
} from "@/clinic/core/errors";
import { parsePagination } from "@/clinic/core/pagination";
import { AuditLogService } from "@/clinic/modules/audit-logs/audit-logs.service";

export class AuditLogController {
  private service(db: Db): AuditLogService {
    return new AuditLogService(db);
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { clinicId } = request.params as { clinicId: string };
    const query = request.query as {
      entity?: string;
      action?: string;
      actorId?: string;
      from?: string;
      to?: string;
    };
    const { skip, limit } = parsePagination(request.query as Record<string, unknown>);
    const db = await getDb();
    const result = await this.service(db).list(ctx, clinicId, {
      entity: query.entity,
      action: query.action,
      actorId: query.actorId,
      from: query.from,
      to: query.to,
      skip,
      limit,
    });
    return reply.send(result);
  }
}