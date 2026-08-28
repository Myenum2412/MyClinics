import type { FastifyReply, FastifyRequest } from "fastify";
import { getDb } from "@/lib/db-pools";
import { BadRequestError, UnauthorizedError } from "@/clinic/core/errors";
import { writeAudit } from "@/clinic/core/audit";
import { NeoEventService } from "@/neo/events/event.service";
import { listEventsSchema } from "@/neo/events/event.dto";

export class NeoEventController {
  async ingest(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const db = await getDb();
    const body = request.body as unknown;
    const items = Array.isArray(body) ? body : [body];
    if (items.length === 0) throw new BadRequestError("No events provided");
    const svc = new NeoEventService(db, ctx);
    const results = [];
    for (const it of items) {
      results.push(await svc.ingest(it));
    }
    await writeAudit(db, ctx, {
      action: "neo_event_ingest",
      entity: "neo_event",
      entityId: null,
      metadata: { count: items.length },
    });
    return reply.code(201).send(Array.isArray(body) ? results : results[0]);
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = listEventsSchema.safeParse(request.query);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid query");
    }
    const db = await getDb();
    const result = await new NeoEventService(db, ctx).list(parsed.data);
    return reply.send(result);
  }

  async getById(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { eventId } = request.params as { eventId: string };
    const db = await getDb();
    const event = await new NeoEventService(db, ctx).getById(eventId);
    if (!event) throw new BadRequestError("Event not found");
    return reply.send(event);
  }

  async stream(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const limit = Math.min(200, Number((request.query as Record<string, unknown>).limit ?? 50));
    const db = await getDb();
    const items = await new NeoEventService(db, ctx).recentStream(limit);
    return reply.send({ items });
  }
}
