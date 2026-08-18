import type { FastifyReply, FastifyRequest } from "fastify";
import type { Db } from "mongodb";
import { getDb } from "@/lib/db";
import {
  BadRequestError,
  UnauthorizedError,
} from "@/clinic/core/errors";
import { parsePagination } from "@/clinic/core/pagination";
import { createUserSchema, updateUserSchema } from "@/clinic/modules/users/users.dto";
import { userToPublic, UsersService } from "@/clinic/modules/users/users.service";

export class UsersController {
  private service(db: Db): UsersService {
    return new UsersService(db);
  }

  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = createUserSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid user data");
    }
    const db = await getDb();
    const user = await this.service(db).createUser(ctx, parsed.data);
    return reply.code(201).send(userToPublic(user));
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const query = request.query as { q?: string; role?: string; status?: string };
    const { skip, limit } = parsePagination(query as Record<string, unknown>);
    const db = await getDb();
    const result = await this.service(db).listUsers(ctx, {
      q: query.q,
      role: query.role,
      status: query.status,
      skip,
      limit,
    });
    return reply.send({
      items: result.items.map(userToPublic),
      total: result.total,
    });
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { userId } = request.params as { userId: string };
    const parsed = updateUserSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid user data");
    }
    const db = await getDb();
    const user = await this.service(db).updateUser(ctx, userId, parsed.data);
    return reply.send(userToPublic(user));
  }

  async deactivate(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { userId } = request.params as { userId: string };
    const db = await getDb();
    await this.service(db).deactivateUser(ctx, userId);
    return reply.send({ ok: true });
  }
}