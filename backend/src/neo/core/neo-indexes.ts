import type { Db } from "mongodb";
import { NEO_COLLECTIONS } from "@/neo/core/collections";

/**
 * Creates the indexes RGB Neo needs. Called once on server start alongside the
 * other platform/clinic index creation logic.
 */
export async function ensureNeoIndexes(db: Db): Promise<void> {
  const events = db.collection(NEO_COLLECTIONS.events);
  await events.createIndex({ organizationId: 1, clinicId: 1, timestamp: -1 });
  await events.createIndex({ clinicId: 1, severity: 1, timestamp: -1 });
  await events.createIndex({ correlationId: 1 });
  await events.createIndex({ traceId: 1 });
  await events.createIndex({ eventType: 1, timestamp: -1 });
  await events.createIndex({ idempotencyKey: 1 }, { unique: true, sparse: true });
  await events.createIndex({ processingStatus: 1, nextAttemptAt: 1 });

  const incidents = db.collection(NEO_COLLECTIONS.incidents);
  await incidents.createIndex({ organizationId: 1, clinicId: 1, status: 1, createdAt: -1 });
  await incidents.createIndex({ clinicId: 1, severity: 1 });
  await incidents.createIndex({ correlationId: 1 });
  await incidents.createIndex({ status: 1, updatedAt: -1 });

  const metrics = db.collection(NEO_COLLECTIONS.metrics);
  await metrics.createIndex({ organizationId: 1, clinicId: 1, service: 1, timestamp: -1 });
  await metrics.createIndex({ clinicId: 1, capturedAt: -1 });

  const status = db.collection(NEO_COLLECTIONS.status);
  await status.createIndex({ organizationId: 1, clinicId: 1, service: 1 }, { unique: true });

  const predictions = db.collection(NEO_COLLECTIONS.predictions);
  await predictions.createIndex({ organizationId: 1, clinicId: 1, status: 1, riskScore: -1 });

  const dead = db.collection(NEO_COLLECTIONS.deadLetters);
  await dead.createIndex({ clinicId: 1, createdAt: -1 });

  const queue = db.collection(NEO_COLLECTIONS.queue);
  await queue.createIndex({ clinicId: 1, priority: -1, scheduledAt: 1 });
  await queue.createIndex({ status: 1, scheduledAt: 1 });
}
