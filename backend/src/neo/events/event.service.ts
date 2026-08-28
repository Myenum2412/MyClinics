import type { Db } from "mongodb";
import { resolveNeoContext, type NeoContext } from "@/neo/core/neo-context";
import { ingestEventSchema, type IngestEventInput } from "@/neo/core/neo-events";
import { NeoEventRepository } from "@/neo/events/event.repository";
import {
  buildEventDoc,
  eventToPublic,
  type NeoEventDoc,
  type PublicEvent,
} from "@/neo/events/event.schema";
import { type ListEventsQuery } from "@/neo/events/event.dto";
import {
  priorityForSeverity,
  topicForCategory,
  NeoQueue,
  getNeoQueue,
} from "@/neo/queue/queue.service";
import type { ClinicContext } from "@/clinic/core/context";
import { BadRequestError, ConflictError } from "@/clinic/core/errors";

export class NeoEventService {
  constructor(
    private readonly db: Db,
    private readonly ctx: ClinicContext
  ) {}

  private scope(): NeoContext {
    return resolveNeoContext(this.ctx);
  }

  /**
   * Ingests a telemetry event. Enforces idempotency: a repeat event carrying
   * the same idempotencyKey (e.g. a retry of a business-critical action) is
   * acknowledged without creating duplicate incidents or side-effects.
   */
  async ingest(input: IngestEventInput): Promise<{
    event: PublicEvent;
    queued: boolean;
    duplicate: boolean;
  }> {
    const parsed = ingestEventSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestError(
        parsed.error.issues[0]?.message ?? "Invalid event payload"
      );
    }
    const data = parsed.data;
    const scope = this.scope();
    const repo = new NeoEventRepository(this.db, scope);

    if (data.idempotencyKey) {
      const prior = await repo.existsByIdempotencyKey(data.idempotencyKey);
      if (prior) {
        const full = await repo.findById(prior.eventId);
        return {
          event: full ? eventToPublic(full) : (prior as unknown as PublicEvent),
          queued: false,
          duplicate: true,
        };
      }
    }

    const doc: NeoEventDoc = buildEventDoc(data, scope);
    await repo.insert(doc);

    const queue = getNeoQueue();
    if (queue) {
      await queue.enqueue(
        scope,
        doc.eventId,
        topicForCategory(doc.category, doc.severity),
        priorityForSeverity(doc.severity)
      );
    }

    return { event: eventToPublic(doc), queued: true, duplicate: false };
  }

  async list(query: ListEventsQuery) {
    const scope = this.scope();
    const repo = new NeoEventRepository(this.db, scope);
    const { items, total } = await repo.list(query);
    return { items: items.map(eventToPublic), total };
  }

  async getById(eventId: string) {
    const scope = this.scope();
    const repo = new NeoEventRepository(this.db, scope);
    const doc = await repo.findById(eventId);
    return doc ? eventToPublic(doc) : null;
  }

  async recentStream(limit: number, clinicId?: string) {
    const scope = this.scope();
    const repo = new NeoEventRepository(this.db, scope);
    const items = await repo.recent(limit, clinicId);
    return items.map((e) => ({
      eventId: e.eventId,
      clinicId: e.clinicId,
      service: e.service,
      eventType: e.eventType,
      severity: e.severity,
      message: e.message,
      metrics: e.metrics,
      timestamp: e.timestamp.toISOString(),
    }));
  }
}
