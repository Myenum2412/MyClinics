import type { FastifyReply, FastifyRequest } from "fastify";
import type { Db } from "mongodb";
import { getDb } from "@/lib/db";
import {
  BadRequestError,
  UnauthorizedError,
} from "@/clinic/core/errors";
import { parsePagination } from "@/clinic/core/pagination";
import { createDoctorSchema, updateDoctorSchema } from "@/clinic/modules/doctors/doctors.dto";
import { doctorToPublic } from "@/clinic/modules/doctors/doctors.schema";
import { DoctorService } from "@/clinic/modules/doctors/doctors.service";

export class DoctorController {
  private service(db: Db): DoctorService {
    return new DoctorService(db);
  }

  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = createDoctorSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid doctor data");
    }
    const db = await getDb();
    const doctor = await this.service(db).createDoctor(ctx, parsed.data);
    return reply.code(201).send(doctorToPublic(doctor));
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const query = request.query as { q?: string; specialization?: string; status?: string };
    const { skip, limit } = parsePagination(query as Record<string, unknown>);
    const db = await getDb();
    const result = await this.service(db).listDoctors(ctx, {
      q: query.q,
      specialization: query.specialization,
      status: query.status,
      skip,
      limit,
    });
    return reply.send({ items: result.items.map(doctorToPublic), total: result.total });
  }

  async getById(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { doctorId } = request.params as { doctorId: string };
    const db = await getDb();
    const doctor = await this.service(db).getDoctor(ctx, doctorId);
    return reply.send(doctorToPublic(doctor));
  }

  async updateById(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { doctorId } = request.params as { doctorId: string };
    const parsed = updateDoctorSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid doctor data");
    }
    const db = await getDb();
    const doctor = await this.service(db).updateDoctor(ctx, doctorId, parsed.data);
    return reply.send(doctorToPublic(doctor));
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { doctorId } = request.params as { doctorId: string };
    const db = await getDb();
    await this.service(db).deleteDoctor(ctx, doctorId);
    return reply.send({ ok: true });
  }
}