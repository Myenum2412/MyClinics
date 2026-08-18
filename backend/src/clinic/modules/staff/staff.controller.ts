import type { FastifyReply, FastifyRequest } from "fastify";
import type { Db } from "mongodb";
import { getDb } from "@/lib/db";
import {
  BadRequestError,
  UnauthorizedError,
} from "@/clinic/core/errors";
import { parsePagination } from "@/clinic/core/pagination";
import { createStaffSchema, updateStaffSchema } from "@/clinic/modules/staff/staff.dto";
import { staffToPublic } from "@/clinic/modules/staff/staff.schema";
import { StaffService } from "@/clinic/modules/staff/staff.service";

export class StaffController {
  private service(db: Db): StaffService {
    return new StaffService(db);
  }

  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = createStaffSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid staff data");
    }
    const db = await getDb();
    const staff = await this.service(db).createStaff(ctx, parsed.data);
    return reply.code(201).send(staffToPublic(staff));
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const query = request.query as { q?: string; position?: string; status?: string };
    const { skip, limit } = parsePagination(query as Record<string, unknown>);
    const db = await getDb();
    const result = await this.service(db).listStaff(ctx, {
      q: query.q,
      position: query.position,
      status: query.status,
      skip,
      limit,
    });
    return reply.send({ items: result.items.map(staffToPublic), total: result.total });
  }

  async getById(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { staffId } = request.params as { staffId: string };
    const db = await getDb();
    const staff = await this.service(db).getStaff(ctx, staffId);
    return reply.send(staffToPublic(staff));
  }

  async updateById(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { staffId } = request.params as { staffId: string };
    const parsed = updateStaffSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid staff data");
    }
    const db = await getDb();
    const staff = await this.service(db).updateStaff(ctx, staffId, parsed.data);
    return reply.send(staffToPublic(staff));
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { staffId } = request.params as { staffId: string };
    const db = await getDb();
    await this.service(db).deleteStaff(ctx, staffId);
    return reply.send({ ok: true });
  }
}