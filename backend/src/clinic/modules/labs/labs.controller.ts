import type { FastifyReply, FastifyRequest } from "fastify";
import type { Db } from "mongodb";
import { getDb } from "@/lib/db-pools";
import { BadRequestError, UnauthorizedError } from "@/clinic/core/errors";
import { parsePagination } from "@/clinic/core/pagination";
import { createLabSchema, updateLabSchema } from "@/clinic/modules/labs/labs.dto";
import { labToPublic } from "@/clinic/modules/labs/labs.schema";
import { LabService } from "@/clinic/modules/labs/labs.service";

export class LabController {
  private service(db: Db): LabService { return new LabService(db); }
  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = createLabSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid lab data");
    const db = await getDb();
    const lab = await this.service(db).createLab(ctx, parsed.data);
    return reply.code(201).send(labToPublic(lab));
  }
  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const query = request.query as { q?: string; status?: string };
    const { skip, limit } = parsePagination(query as Record<string, unknown>);
    const db = await getDb();
    const result = await this.service(db).listLabs(ctx, { q: query.q, status: query.status, skip, limit });
    return reply.send({ items: result.items.map(labToPublic), total: result.total });
  }
  async getById(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { labId } = request.params as { labId: string };
    const db = await getDb();
    const lab = await this.service(db).getLab(ctx, labId);
    return reply.send(labToPublic(lab));
  }
  async updateById(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { labId } = request.params as { labId: string };
    const parsed = updateLabSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid lab data");
    const db = await getDb();
    const lab = await this.service(db).updateLab(ctx, labId, parsed.data);
    return reply.send(labToPublic(lab));
  }
  async delete(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { labId } = request.params as { labId: string };
    const db = await getDb();
    await this.service(db).deleteLab(ctx, labId);
    return reply.send({ ok: true });
  }
}
