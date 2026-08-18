import type { FastifyReply, FastifyRequest } from "fastify";
import type { Db } from "mongodb";
import { getDb } from "@/lib/db";
import {
  BadRequestError,
  UnauthorizedError,
} from "@/clinic/core/errors";
import { parsePagination } from "@/clinic/core/pagination";
import { notificationToPublic } from "@/clinic/modules/notifications/notifications.schema";
import { NotificationService } from "@/clinic/modules/notifications/notifications.service";

export class NotificationController {
  private service(db: Db): NotificationService {
    return new NotificationService(db);
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const query = request.query as { unreadOnly?: string };
    const { skip, limit } = parsePagination(request.query as Record<string, unknown>);
    const db = await getDb();
    const result = await this.service(db).listMine(ctx, {
      unreadOnly: query.unreadOnly === "true",
      skip,
      limit,
    });
    return reply.send({
      items: result.items.map(notificationToPublic),
      total: result.total,
      unread: result.unread,
    });
  }

  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const body = (request.body ?? {}) as Record<string, unknown>;
    const parsed = {
      recipientUserId:
        typeof body.recipientUserId === "string" ? body.recipientUserId : null,
      type: typeof body.type === "string" ? body.type : null,
      title: typeof body.title === "string" ? body.title : null,
      body: typeof body.body === "string" ? body.body : null,
      link: typeof body.link === "string" ? body.link : null,
    };
    if (!parsed.recipientUserId || !parsed.type || !parsed.title) {
      throw new BadRequestError("recipientUserId, type and title are required");
    }
    const db = await getDb();
    const notification = await this.service(db).create(ctx, parsed as never);
    return reply.code(201).send(notificationToPublic(notification));
  }

  async markRead(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { notificationId } = request.params as { notificationId: string };
    const db = await getDb();
    await this.service(db).markRead(ctx, notificationId);
    return reply.send({ ok: true });
  }

  async markAllRead(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const db = await getDb();
    const modified = await this.service(db).markAllRead(ctx);
    return reply.send({ ok: true, modified });
  }
}