import type { FastifyReply, FastifyRequest } from "fastify";
import { getDb } from "@/lib/db";
import { ForbiddenError, NotFoundError, ValidationError } from "@/mt/core/errors";
import { mtPaged, parseMtPagination, queryParamsFromRecord } from "@/mt/core/pagination";
import {
  createUserSchema,
  updateUserSchema,
  userIdParamsSchema,
} from "@/mt/modules/users/users.dto";
import { UserService } from "@/mt/modules/users/users.service";
import { mapUser } from "@/mt/modules/users/users.repository";

export class UserController {
  private async service() {
    return new UserService(await getDb());
  }

  /** POST /api/mt/users — clinic_admin creates staff; staff creates patients. */
  async create(request: FastifyRequest, reply: FastifyReply) {
    const ctx = request.tenant;
    if (!ctx) throw new ForbiddenError();

    const parsed = createUserSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((i) => i.message).join("; "));
    }

    if (parsed.data.role === "staff" && ctx.role !== "clinic_admin") {
      throw new ForbiddenError("Only the clinic admin can create staff accounts");
    }

    const user = await (await this.service()).createUser(ctx, parsed.data);
    return reply.code(201).send({ user: mapUser(user as never) });
  }

  /** GET /api/mt/users — staff + clinic_admin; patients never see the roster. */
  async list(request: FastifyRequest, reply: FastifyReply) {
    const ctx = request.tenant;
    if (!ctx) throw new ForbiddenError();
    if (ctx.role === "patient") {
      throw new ForbiddenError("Patients cannot list clinic users");
    }

    const pagination = parseMtPagination(
      queryParamsFromRecord(request.query as Record<string, unknown>)
    );
    const { items, total } = await (
      await this.service()
    ).listUsers(ctx, { skip: pagination.skip, limit: pagination.pageSize });
    return reply.send(mtPaged(items.map((u) => mapUser(u as never)), total, pagination));
  }

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const ctx = request.tenant;
    if (!ctx) throw new ForbiddenError();
    if (ctx.role === "patient") {
      throw new ForbiddenError("Patients cannot view other users");
    }

    const params = userIdParamsSchema.safeParse(request.params);
    if (!params.success) throw new ValidationError("Invalid user id");

    const user = await (await this.service()).getUserById(ctx, params.data.userId);
    return reply.send({ user: mapUser(user as never) });
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const ctx = request.tenant;
    if (!ctx) throw new ForbiddenError();
    if (ctx.role !== "clinic_admin") {
      throw new ForbiddenError("Only the clinic admin can update users");
    }

    const params = userIdParamsSchema.safeParse(request.params);
    if (!params.success) throw new ValidationError("Invalid user id");
    const parsed = updateUserSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((i) => i.message).join("; "));
    }

    const user = await (
      await this.service()
    ).updateUser(ctx, params.data.userId, parsed.data);
    return reply.send({ user: mapUser(user as never) });
  }

  async remove(request: FastifyRequest, reply: FastifyReply) {
    const ctx = request.tenant;
    if (!ctx) throw new ForbiddenError();
    if (ctx.role !== "clinic_admin") {
      throw new ForbiddenError("Only the clinic admin can delete users");
    }

    const params = userIdParamsSchema.safeParse(request.params);
    if (!params.success) throw new ValidationError("Invalid user id");

    await (await this.service()).deleteUser(ctx, params.data.userId);
    return reply.send({ ok: true });
  }
}