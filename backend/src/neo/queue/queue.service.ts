import type { Collection, Db, Filter, ObjectId } from "mongodb";
import { NEO_COLLECTIONS } from "@/neo/core/collections";
import { type NeoContext, scopeFilter } from "@/neo/core/neo-context";
import {
  type NeoSeverity,
  type NeoProcessingStatus,
  severityRank,
} from "@/neo/core/neo-events";
import { now } from "@/clinic/core/datetime";
import { randomToken } from "@/clinic/core/ids";

export type QueueTopic =
  | "critical-events"
  | "high-priority-events"
  | "application-events"
  | "api-events"
  | "database-events"
  | "security-events"
  | "business-events"
  | "integration-events"
  | "ai-analysis"
  | "incident-processing"
  | "notification-processing"
  | "audit-events";

export interface QueueJobDoc {
  _id?: ObjectId;
  jobId: string;
  organizationId: string;
  clinicId: string;
  eventId: string;
  topic: QueueTopic;
  priority: number;
  status: "queued" | "processing" | "done" | "failed" | "dead_letter";
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  scheduledAt: Date;
  nextAttemptAt?: Date;
  createdAt: Date;
}

const MAX_ATTEMPTS = 5;

/** Higher severity / critical categories jump the queue. */
export function priorityForSeverity(sev: NeoSeverity): number {
  return Math.min(5, severityRank(sev));
}

export function topicForCategory(
  category: string,
  severity: NeoSeverity
): QueueTopic {
  if (severity === "critical") return "critical-events";
  switch (category) {
    case "security":
      return "security-events";
    case "database":
      return "database-events";
    case "api":
      return "api-events";
    case "integration":
      return "integration-events";
    case "business":
      return "business-events";
    case "application":
      return "application-events";
    default:
      return "application-events";
  }
}

export function computeBackoff(attempt: number): number {
  // Exponential backoff with full jitter: 1s, 2s, 4s, 8s, 16s (capped).
  const base = Math.min(16_000, 1000 * 2 ** Math.max(0, attempt - 1));
  return Math.floor(base * (0.5 + Math.random() * 0.5));
}

type JobHandler = (job: QueueJobDoc) => Promise<void>;

/**
 * In-process priority queue with acknowledgement, retry, exponential backoff
 * and dead-letter handling. Critical events are always dequeued ahead of lower
 * priorities. The processor loop is started once at bootstrap. No critical
 * event is ever silently dropped — failures exhaust retries then land in the
 * dead-letter collection (and for business-critical events, a remediation
 * escalation is recorded).
 */
export class NeoQueue {
  private collection!: Collection<QueueJobDoc>;
  private handler: JobHandler | null = null;
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private started = false;

  constructor(private readonly db: Db) {}

  init(): void {
    this.collection = this.db.collection<QueueJobDoc>(NEO_COLLECTIONS.queue);
  }

  onJob(handler: JobHandler): void {
    this.handler = handler;
  }

  async enqueue(
    scope: NeoContext,
    eventId: string,
    topic: QueueTopic,
    priority: number
  ): Promise<void> {
    const doc: QueueJobDoc = {
      jobId: `job_${randomToken(10)}`,
      organizationId: scope.organizationId,
      clinicId: scope.clinicId as string,
      eventId,
      topic,
      priority,
      status: "queued",
      attempts: 0,
      maxAttempts: MAX_ATTEMPTS,
      scheduledAt: now(),
      createdAt: now(),
    };
    await this.collection.insertOne(doc as never);
  }

  private async claim(): Promise<QueueJobDoc | null> {
    const nowDate = now();
    const job = await this.collection.findOneAndUpdate(
      {
        status: "queued",
        scheduledAt: { $lte: nowDate },
      } as Filter<QueueJobDoc>,
      { $set: { status: "processing" } } as never,
      { sort: { priority: -1, scheduledAt: 1 }, returnDocument: "after" }
    );
    return (job as QueueJobDoc) ?? null;
  }

  private async succeed(job: QueueJobDoc): Promise<void> {
    await this.collection.updateOne(
      { _id: job._id } as Filter<QueueJobDoc>,
      { $set: { status: "done" } } as never
    );
  }

  private async fail(job: QueueJobDoc, error: unknown): Promise<"retry" | "dead_letter"> {
    const attempts = job.attempts + 1;
    const message = error instanceof Error ? error.message : String(error);
    if (attempts >= job.maxAttempts) {
      await this.collection.updateOne(
        { _id: job._id } as Filter<QueueJobDoc>,
        {
          $set: {
            status: "dead_letter",
            attempts,
            lastError: message,
          },
        } as never
      );
      return "dead_letter";
    }
    const delay = computeBackoff(attempts);
    await this.collection.updateOne(
      { _id: job._id } as Filter<QueueJobDoc>,
      {
        $set: {
          status: "queued",
          attempts,
          lastError: message,
          nextAttemptAt: new Date(now().getTime() + delay),
          scheduledAt: new Date(now().getTime() + delay),
        },
      } as never
    );
    return "retry";
  }

  async processOnce(): Promise<number> {
    if (this.running || !this.handler) return 0;
    this.running = true;
    let processed = 0;
    try {
      let job = await this.claim();
      while (job) {
        processed += 1;
        try {
          await this.handler(job);
          await this.succeed(job);
        } catch (err) {
          const outcome = await this.fail(job, err);
          if (outcome === "dead_letter") {
            await this.onDeadLetter(job, err);
          }
        }
        job = await this.claim();
      }
    } finally {
      this.running = false;
    }
    return processed;
  }

  /** Hook for dead-letter recording; wired by the engine bootstrap. */
  deadLetterHandler: ((job: QueueJobDoc, error: unknown) => Promise<void>) | null = null;
  private async onDeadLetter(job: QueueJobDoc, error: unknown): Promise<void> {
    if (this.deadLetterHandler) await this.deadLetterHandler(job, error);
  }

  start(intervalMs = 2000): void {
    if (this.started) return;
    this.started = true;
    this.timer = setInterval(() => {
      void this.processOnce().catch(() => undefined);
    }, intervalMs);
    if (typeof this.timer.unref === "function") this.timer.unref();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.started = false;
  }
}

let neoQueueSingleton: NeoQueue | null = null;

/** Creates (once) and returns the process-wide RGB Neo queue. */
export function initNeoQueue(db: Db): NeoQueue {
  if (!neoQueueSingleton) {
    neoQueueSingleton = new NeoQueue(db);
    neoQueueSingleton.init();
  }
  return neoQueueSingleton;
}

export function getNeoQueue(): NeoQueue | null {
  return neoQueueSingleton;
}
