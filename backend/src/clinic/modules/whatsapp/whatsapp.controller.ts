import type { FastifyReply, FastifyRequest } from "fastify";
import type { Db } from "mongodb";
import { getDb } from "@/lib/db";
import { UnauthorizedError } from "@/clinic/core/errors";
import { WhatsappService } from "@/clinic/modules/whatsapp/whatsapp.service";

export class WhatsappController {
  private service(db: Db): WhatsappService {
    return new WhatsappService(db);
  }

  async getSession(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const db = await getDb();
    const session = await this.service(db).getSession(ctx);
    return reply.send(session);
  }

  async connect(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const db = await getDb();
    await this.service(db).requestConnectionChange(ctx, "connect");
    return reply.code(202).send({ ok: true, status: "connecting" });
  }

  async disconnect(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const body = (request.body ?? {}) as { logout?: boolean };
    const db = await getDb();
    await this.service(db).requestConnectionChange(ctx, body.logout ? "logout" : "disconnect");
    return reply.code(202).send({ ok: true, status: body.logout ? "logging_out" : "disconnecting" });
  }
}
