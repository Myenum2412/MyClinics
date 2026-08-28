import type { ObjectId } from "mongodb";
import {
  type NeoEnvironment,
  type NeoEventCategory,
  type NeoEventType,
  type NeoSeverity,
  type NeoProcessingStatus,
  EVENT_TYPE_CATEGORY,
  DEFAULT_SEVERITY_BY_EVENT,
} from "@/neo/core/neo-events";
import type { NeoContext } from "@/neo/core/neo-context";
import type { IngestEventInput } from "@/neo/core/neo-events";
import { now } from "@/clinic/core/datetime";
import { randomToken } from "@/clinic/core/ids";

export interface NeoEventDoc {
  _id?: ObjectId;
  eventId: string;
  organizationId: string;
  clinicId: string;
  environment: NeoEnvironment;
  source: string;
  service: string;
  module?: string;
  eventType: NeoEventType;
  category: NeoEventCategory;
  severity: NeoSeverity;
  message?: string;
  correlationId?: string;
  traceId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
  metrics?: Record<string, number>;
  payload?: Record<string, unknown>;
  eventVersion: number;
  idempotencyKey?: string;
  processingStatus: NeoProcessingStatus;
  retryCount: number;
  lastError?: string;
  incidentId?: string;
  timestamp: Date;
  createdAt: Date;
  nextAttemptAt?: Date;
}

export function buildEventDoc(
  input: IngestEventInput,
  scope: NeoContext,
  timestamp?: Date
): NeoEventDoc {
  const ts = timestamp ?? now();
  return {
    eventId: `evt_${randomToken(12)}`,
    organizationId: scope.organizationId,
    clinicId: scope.clinicId as string,
    environment: input.environment,
    source: input.source,
    service: input.service,
    module: input.module,
    eventType: input.eventType,
    category: EVENT_TYPE_CATEGORY[input.eventType],
    severity: input.severity ?? DEFAULT_SEVERITY_BY_EVENT[input.eventType] ?? "medium",
    message: input.message,
    correlationId: input.correlationId,
    traceId: input.traceId,
    requestId: input.requestId,
    metadata: input.metadata,
    metrics: input.metrics,
    payload: input.payload,
    eventVersion: input.eventVersion,
    idempotencyKey: input.idempotencyKey,
    processingStatus: "received",
    retryCount: 0,
    timestamp: ts,
    createdAt: now(),
  };
}

export interface PublicEvent {
  eventId: string;
  clinicId: string;
  environment: NeoEnvironment;
  source: string;
  service: string;
  module?: string;
  eventType: NeoEventType;
  category: NeoEventCategory;
  severity: NeoSeverity;
  message?: string;
  correlationId?: string;
  traceId?: string;
  requestId?: string;
  metrics?: Record<string, number>;
  processingStatus: NeoProcessingStatus;
  retryCount: number;
  incidentId?: string;
  timestamp: string;
}

export function eventToPublic(doc: NeoEventDoc): PublicEvent {
  return {
    eventId: doc.eventId,
    clinicId: doc.clinicId,
    environment: doc.environment,
    source: doc.source,
    service: doc.service,
    module: doc.module,
    eventType: doc.eventType,
    category: doc.category,
    severity: doc.severity,
    message: doc.message,
    correlationId: doc.correlationId,
    traceId: doc.traceId,
    requestId: doc.requestId,
    metrics: doc.metrics,
    processingStatus: doc.processingStatus,
    retryCount: doc.retryCount,
    incidentId: doc.incidentId,
    timestamp: doc.timestamp.toISOString(),
  };
}
