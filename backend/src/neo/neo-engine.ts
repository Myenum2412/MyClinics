import type { Db } from "mongodb";
import { getDb } from "@/lib/db-pools";
import { initNeoQueue, getNeoQueue, type NeoQueue, type QueueJobDoc } from "@/neo/queue/queue.service";
import { NeoEventRepository } from "@/neo/events/event.repository";
import { NeoIncidentService } from "@/neo/incidents/incident.service";
import { NeoDeadLetterService } from "@/neo/queue/dead-letter.service";
import { resolveNeoContext, type NeoContext } from "@/neo/core/neo-context";
import type { ClinicContext } from "@/clinic/core/context";

/** Synthetic context for background processing (no request/session). */
const ENGINE_CONTEXT: ClinicContext = {
  userId: "neo-engine",
  clinicId: null,
  role: "platform_admin",
  name: "RGB Neo Engine",
  email: null,
  doctorId: null,
  patientId: null,
  tokenId: "neo-engine",
  ip: null,
  userAgent: null,
};

let engineStarted = false;

async function handleJob(db: Db, job: QueueJobDoc): Promise<void> {
  const orgScope: NeoContext = resolveNeoContext(ENGINE_CONTEXT);
  const eventRepo = new NeoEventRepository(db, orgScope);
  const event = await eventRepo.findById(job.eventId);
  if (!event) {
    throw new Error(`Event ${job.eventId} not found for job ${job.jobId}`);
  }
  const engine = new NeoIncidentService(db, ENGINE_CONTEXT);
  const incident = await engine.processEvent(event);
  await eventRepo.updateByEventId(job.eventId, {
    processingStatus: "acknowledged",
    incidentId: incident.incidentId,
  });
}

async function handleDeadLetter(db: Db, job: QueueJobDoc, error: unknown): Promise<void> {
  const orgScope: NeoContext = resolveNeoContext(ENGINE_CONTEXT);
  const dead = new NeoDeadLetterService(db, orgScope);
  const eventRepo = new NeoEventRepository(db, orgScope);
  const event = await eventRepo.findById(job.eventId);
  const reason = error instanceof Error ? error.message : String(error);
  await dead.record({
    jobId: job.jobId,
    eventId: job.eventId,
    source: event?.source ?? "unknown",
    service: event?.service ?? "unknown",
    eventType: event?.eventType ?? "unknown",
    category: event?.category ?? "unknown",
    severity: event?.severity ?? "unknown",
    failureReason: reason,
    retryCount: job.attempts,
  });
}

/**
 * Starts the RGB Neo background engine: initializes the priority queue, wires
 * the event→incident processor and dead-letter capture, then starts draining.
 * Safe to call once at server bootstrap.
 */
export async function startNeoEngine(db?: Db): Promise<NeoQueue | null> {
  if (engineStarted) return getNeoQueue();
  const database = db ?? (await getDb());
  if (!database) return null;
  const queue = initNeoQueue(database);
  queue.onJob((job) => handleJob(database, job));
  queue.deadLetterHandler = (job, err) => handleDeadLetter(database, job, err);
  queue.start(2000);
  engineStarted = true;
  return queue;
}

export function stopNeoEngine(): void {
  const queue = getNeoQueue();
  if (queue) queue.stop();
  engineStarted = false;
}
