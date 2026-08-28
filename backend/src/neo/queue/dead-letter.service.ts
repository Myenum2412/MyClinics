import type { Collection, Db, Filter, ObjectId } from "mongodb";
import { NEO_COLLECTIONS } from "@/neo/core/collections";
import { type NeoContext, scopeFilter } from "@/neo/core/neo-context";
import { now } from "@/clinic/core/datetime";
import { randomToken } from "@/clinic/core/ids";
import { isBusinessCritical } from "@/neo/queue/retry.service";

export interface DeadLetterDoc {
  _id?: ObjectId;
  deadLetterId: string;
  organizationId: string;
  clinicId: string;
  eventId: string;
  jobId: string;
  source: string;
  service: string;
  eventType: string;
  category: string;
  severity: string;
  failureReason: string;
  retryCount: number;
  lastAttempt: Date;
  consumer: string;
  reprocessed: boolean;
  reprocessedAt?: Date;
  aiDiagnosis?: string;
  recommendedAction?: string;
  createdAt: Date;
}

/**
 * Dead-letter center. Captures events that exhausted all retries so they are
 * never silently discarded. Business-critical failures are explicitly flagged
 * for controlled, idempotency-protected reprocessing.
 */
export class NeoDeadLetterService {
  private readonly collection: Collection<DeadLetterDoc>;

  constructor(
    private readonly db: Db,
    private readonly scope: NeoContext
  ) {
    this.collection = db.collection<DeadLetterDoc>(NEO_COLLECTIONS.deadLetters);
  }

  private filter(extra: Filter<DeadLetterDoc> = {}): Filter<DeadLetterDoc> {
    return { ...scopeFilter(this.scope), ...extra } as Filter<DeadLetterDoc>;
  }

  async record(input: {
    jobId: string;
    eventId: string;
    source: string;
    service: string;
    eventType: string;
    category: string;
    severity: string;
    failureReason: string;
    retryCount: number;
    aiDiagnosis?: string;
    recommendedAction?: string;
  }): Promise<void> {
    const doc: DeadLetterDoc = {
      deadLetterId: `dl_${randomToken(10)}`,
      organizationId: this.scope.organizationId,
      clinicId: this.scope.clinicId as string,
      eventId: input.eventId,
      jobId: input.jobId,
      source: input.source,
      service: input.service,
      eventType: input.eventType,
      category: input.category,
      severity: input.severity,
      failureReason: input.failureReason,
      retryCount: input.retryCount,
      lastAttempt: now(),
      consumer: isBusinessCritical(input.eventType as never)
        ? "incident-engine"
        : "event-processor",
      reprocessed: false,
      aiDiagnosis: input.aiDiagnosis,
      recommendedAction: input.recommendedAction,
      createdAt: now(),
    };
    await this.collection.insertOne(doc as never);
  }

  async list(limit = 100, page = 1): Promise<{ items: DeadLetterDoc[]; total: number }> {
    const f = this.filter();
    const [items, total] = await Promise.all([
      this.collection
        .find(f)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      this.collection.countDocuments(f),
    ]);
    return { items, total };
  }

  async markReprocessed(deadLetterId: string): Promise<boolean> {
    const res = await this.collection.updateOne(this.filter({ deadLetterId } as Filter<DeadLetterDoc>), {
      $set: { reprocessed: true, reprocessedAt: now() },
    } as never);
    return res.matchedCount === 1;
  }
}
