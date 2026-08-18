import type { FastifyReply, FastifyRequest } from "fastify";
import type { Db } from "mongodb";
import { getDb } from "@/lib/db";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "@/clinic/core/errors";
import { parsePagination } from "@/clinic/core/pagination";
import { createReportSchema, listReportsSchema, updateReportSchema } from "@/clinic/modules/reports/reports.dto";
import { reportToPublic } from "@/clinic/modules/reports/reports.schema";
import { ReportService } from "@/clinic/modules/reports/reports.service";

export class ReportController {
  private service(db: Db): ReportService {
    return new ReportService(db);
  }

  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = createReportSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid report data");
    }
    const db = await getDb();
    const report = await this.service(db).createReport(ctx, parsed.data);
    return reply.code(201).send(reportToPublic(report));
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = listReportsSchema.safeParse(request.query);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid query");
    }
    const { skip, limit } = parsePagination(request.query as Record<string, unknown>);
    const db = await getDb();
    const result = await this.service(db).listReports(ctx, { ...parsed.data, skip, limit });
    return reply.send({ items: result.items.map(reportToPublic), total: result.total });
  }

  async getById(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { reportId } = request.params as { reportId: string };
    const db = await getDb();
    const report = await this.service(db).getReport(ctx, reportId);
    return reply.send(reportToPublic(report));
  }

  async updateById(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { reportId } = request.params as { reportId: string };
    const parsed = updateReportSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid report data");
    }
    const db = await getDb();
    const report = await this.service(db).updateReport(ctx, reportId, parsed.data);
    return reply.send(reportToPublic(report));
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { reportId } = request.params as { reportId: string };
    const db = await getDb();
    await this.service(db).deleteReport(ctx, reportId);
    return reply.send({ ok: true });
  }
  /** Patient portal: lists only the caller's OWN reports (scoped in the service). */
  async getMine(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    if (!ctx.patientId) throw new NotFoundError("Patient account not found");
    const { skip, limit } = parsePagination(request.query as Record<string, unknown>);
    const db = await getDb();
    const result = await this.service(db).listReports(ctx, { skip, limit });
    return reply.send({ items: result.items.map(reportToPublic), total: result.total });
  }
}
