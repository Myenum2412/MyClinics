import type { FastifyReply, FastifyRequest } from "fastify";
import type { Db } from "mongodb";
import { getDb } from "@/lib/db-pools";
import { BadRequestError, UnauthorizedError } from "@/clinic/core/errors";
import { parsePagination } from "@/clinic/core/pagination";
import {
  createExaminationSchema,
  listExaminationsSchema,
  updateExaminationSchema,
} from "@/clinic/modules/examinations/examinations.dto";
import { examinationToPublic } from "@/clinic/modules/examinations/examinations.schema";
import { ExaminationService } from "@/clinic/modules/examinations/examinations.service";

export class ExaminationController {
  private service(db: Db): ExaminationService {
    return new ExaminationService(db);
  }

  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = createExaminationSchema.safeParse(request.body);
    if (!parsed.success) {
      const d = parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      throw new BadRequestError(d || "Invalid examination data");
    }
    const db = await getDb();
    const examination = await this.service(db).createExamination(
      ctx,
      parsed.data
    );
    return reply.code(201).send(examinationToPublic(examination));
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = listExaminationsSchema.safeParse(request.query ?? {});
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
    const result = await this.service(db).listExaminations(ctx, {
      ...parsed.data,
      skip,
      limit,
    });
    return reply.send({
      items: result.items.map(examinationToPublic),
      total: result.total,
    });
  }

  async getById(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { examinationId } = request.params as { examinationId: string };
    const db = await getDb();
    const examination = await this.service(db).getExamination(
      ctx,
      examinationId
    );
    return reply.send(examinationToPublic(examination));
  }

  async updateById(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { examinationId } = request.params as { examinationId: string };
    const parsed = updateExaminationSchema.safeParse(request.body);
    if (!parsed.success) {
      const d = parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      throw new BadRequestError(d || "Invalid examination data");
    }
    const db = await getDb();
    const examination = await this.service(db).updateExamination(
      ctx,
      examinationId,
      parsed.data
    );
    return reply.send(examinationToPublic(examination));
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { examinationId } = request.params as { examinationId: string };
    const db = await getDb();
    await this.service(db).deleteExamination(ctx, examinationId);
    return reply.send({ ok: true });
  }
}
