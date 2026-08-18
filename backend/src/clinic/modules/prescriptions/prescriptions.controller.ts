import type { FastifyReply, FastifyRequest } from "fastify";
import type { Db } from "mongodb";
import { getDb } from "@/lib/db";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "@/clinic/core/errors";
import { parsePagination } from "@/clinic/core/pagination";
import {
  createPrescriptionSchema,
  listPrescriptionsSchema,
  updatePrescriptionSchema,
} from "@/clinic/modules/prescriptions/prescriptions.dto";
import { prescriptionToPublic } from "@/clinic/modules/prescriptions/prescriptions.schema";
import { PrescriptionService } from "@/clinic/modules/prescriptions/prescriptions.service";

export class PrescriptionController {
  private service(db: Db): PrescriptionService {
    return new PrescriptionService(db);
  }

  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = createPrescriptionSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid prescription data");
    }
    const db = await getDb();
    const prescription = await this.service(db).createPrescription(ctx, parsed.data);
    return reply.code(201).send(prescriptionToPublic(prescription));
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = listPrescriptionsSchema.safeParse(request.query);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid query");
    }
    const { skip, limit } = parsePagination(request.query as Record<string, unknown>);
    const db = await getDb();
    const result = await this.service(db).listPrescriptions(ctx, { ...parsed.data, skip, limit });
    return reply.send({ items: result.items.map(prescriptionToPublic), total: result.total });
  }

  async getById(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { prescriptionId } = request.params as { prescriptionId: string };
    const db = await getDb();
    const prescription = await this.service(db).getPrescription(ctx, prescriptionId);
    return reply.send(prescriptionToPublic(prescription));
  }

  async updateById(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { prescriptionId } = request.params as { prescriptionId: string };
    const parsed = updatePrescriptionSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid prescription data");
    }
    const db = await getDb();
    const prescription = await this.service(db).updatePrescription(ctx, prescriptionId, parsed.data);
    return reply.send(prescriptionToPublic(prescription));
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { prescriptionId } = request.params as { prescriptionId: string };
    const db = await getDb();
    await this.service(db).deletePrescription(ctx, prescriptionId);
    return reply.send({ ok: true });
  }
  /** Patient portal: lists only the caller's OWN prescriptions (scoped in the service). */
  async getMine(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    if (!ctx.patientId) throw new NotFoundError("Patient account not found");
    const { skip, limit } = parsePagination(request.query as Record<string, unknown>);
    const db = await getDb();
    const result = await this.service(db).listPrescriptions(ctx, { skip, limit });
    return reply.send({ items: result.items.map(prescriptionToPublic), total: result.total });
  }
}
