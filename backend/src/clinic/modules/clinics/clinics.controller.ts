import type { FastifyReply, FastifyRequest } from "fastify";
import type { Db } from "mongodb";
import { getDb } from "@/lib/db-pools";
import {
  BadRequestError,
  ForbiddenError,
  UnauthorizedError,
} from "@/clinic/core/errors";
import { parsePagination } from "@/clinic/core/pagination";
import { createClinicSchema, updateClinicSchema } from "@/clinic/modules/clinics/clinics.dto";
import { ClinicService } from "@/clinic/modules/clinics/clinics.service";

export class ClinicController {
  private service(db: Db): ClinicService {
    return new ClinicService(db);
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const query = request.query as { status?: string; q?: string };
    const { skip, limit } = parsePagination(query as Record<string, unknown>);
    const db = await getDb();
    const result = await this.service(db).listClinics(
      { status: query.status, q: query.q, skip, limit },
      ctx
    );
    return reply.send(result);
  }

  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = createClinicSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid clinic data");
    }
    const db = await getDb();
    const clinic = await this.service(db).createClinic(parsed.data, ctx);
    return reply.code(201).send(clinic);
  }

  async getById(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { clinicId } = request.params as { clinicId: string };

    const db = await getDb();
    // Clinic members may only read their OWN clinic; platform admins may
    // read any clinic (requireClinicAccess has already enforced this).
    if (ctx.role !== "platform_admin") {
      if (ctx.clinicId !== clinicId) throw new ForbiddenError();
      const clinic = await this.service(db).getOwnClinic(ctx);
      return reply.send(clinic);
    }
    const clinic = await this.service(db).getClinic(clinicId);
    return reply.send(clinic);
  }

  async updateById(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { clinicId } = request.params as { clinicId: string };
    const parsed = updateClinicSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid clinic data");
    }
    const db = await getDb();
    const clinic =
      ctx.role === "platform_admin"
        ? await this.service(db).updateClinic(clinicId, parsed.data, ctx)
        : await this.service(db).updateOwnClinic(ctx, parsed.data);
    return reply.send(clinic);
  }

  async suspend(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { clinicId } = request.params as { clinicId: string };
    const db = await getDb();
    await this.service(db).setClinicStatus(clinicId, "suspended", ctx);
    return reply.send({ ok: true });
  }

  async activate(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { clinicId } = request.params as { clinicId: string };
    const db = await getDb();
    await this.service(db).setClinicStatus(clinicId, "active", ctx);
    return reply.send({ ok: true });
  }

  async getOwn(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const db = await getDb();
    const clinic = await this.service(db).getOwnClinic(ctx);
    return reply.send(clinic);
  }

  async updateOwn(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = updateClinicSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid clinic data");
    }
    const db = await getDb();
    const clinic = await this.service(db).updateOwnClinic(ctx, parsed.data);
    return reply.send(clinic);
  }
}