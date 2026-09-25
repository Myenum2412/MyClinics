import type { FastifyReply, FastifyRequest } from "fastify";
import type { Db } from "mongodb";
import { getDb } from "@/lib/db-pools";
import { BadRequestError, UnauthorizedError } from "@/clinic/core/errors";
import { parsePagination } from "@/clinic/core/pagination";
import {
  createInvestigationSchema,
  listInvestigationsSchema,
  updateInvestigationSchema,
} from "@/clinic/modules/investigations/investigations.dto";
import { investigationToPublic } from "@/clinic/modules/investigations/investigations.schema";
import { InvestigationService } from "@/clinic/modules/investigations/investigations.service";

export class InvestigationController {
  private service(db: Db): InvestigationService {
    return new InvestigationService(db);
  }

  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = createInvestigationSchema.safeParse(request.body);
    if (!parsed.success) {
      const d = parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      throw new BadRequestError(d || "Invalid investigation data");
    }
    const db = await getDb();
    const investigation = await this.service(db).createInvestigation(
      ctx,
      parsed.data
    );
    return reply.code(201).send(investigationToPublic(investigation));
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = listInvestigationsSchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      const d = parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      throw new BadRequestError(d || "Invalid query");
    }
    const { skip, limit } = parsePagination(
      request.query as Record<string, unknown>
    );
    const db = await getDb();
    const result = await this.service(db).listInvestigations(ctx, {
      ...parsed.data,
      skip,
      limit,
    });
    return reply.send({
      items: result.items.map(investigationToPublic),
      total: result.total,
    });
  }

  async getById(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { investigationId } = request.params as { investigationId: string };
    const db = await getDb();
    const investigation = await this.service(db).getInvestigation(
      ctx,
      investigationId
    );
    return reply.send(investigationToPublic(investigation));
  }

  async updateById(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { investigationId } = request.params as { investigationId: string };
    const parsed = updateInvestigationSchema.safeParse(request.body);
    if (!parsed.success) {
      const d = parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      throw new BadRequestError(d || "Invalid investigation data");
    }
    const db = await getDb();
    const investigation = await this.service(db).updateInvestigation(
      ctx,
      investigationId,
      parsed.data
    );
    return reply.send(investigationToPublic(investigation));
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { investigationId } = request.params as { investigationId: string };
    const db = await getDb();
    await this.service(db).deleteInvestigation(ctx, investigationId);
    return reply.send({ ok: true });
  }
}
