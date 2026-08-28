import { z } from "zod";

/**
 * RGB Neo — standardized event model and catalogs.
 *
 * Every telemetry signal that enters RGB Neo is normalized into this shape so
 * that the correlation, incident, health and AI engines can treat all events
 * uniformly regardless of their source.
 */

export const ORGANIZATION_ID = "org_default";

export const EVENT_SEVERITY = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
] as const;
export type NeoSeverity = (typeof EVENT_SEVERITY)[number];

export const EVENT_CATEGORIES = [
  "application",
  "api",
  "database",
  "infrastructure",
  "security",
  "business",
  "integration",
] as const;
export type NeoEventCategory = (typeof EVENT_CATEGORIES)[number];

export const EVENT_TYPES = [
  // application
  "APPLICATION_ERROR",
  "APPLICATION_CRASH",
  "APPLICATION_TIMEOUT",
  "APPLICATION_SLOW",
  "UI_ERROR",
  "UI_LOADING_FAILURE",
  // api
  "API_ERROR",
  "API_TIMEOUT",
  "API_LATENCY",
  "API_RATE_LIMIT",
  "API_UNAVAILABLE",
  "API_AUTH_FAILURE",
  // database
  "DB_ERROR",
  "DB_TIMEOUT",
  "DB_SLOW_QUERY",
  "DB_CONNECTION_EXHAUSTED",
  "DB_DEADLOCK",
  "DB_STORAGE_WARNING",
  // infrastructure
  "SERVER_DOWN",
  "CPU_HIGH",
  "MEMORY_HIGH",
  "DISK_HIGH",
  "NETWORK_ERROR",
  "SERVICE_CRASH",
  "CONTAINER_UNHEALTHY",
  // security
  "AUTH_FAILURE",
  "SUSPICIOUS_LOGIN",
  "UNAUTHORIZED_ACCESS",
  "PRIVILEGE_ANOMALY",
  "SUSPICIOUS_API_ACTIVITY",
  // business
  "APPOINTMENT_FAILURE",
  "BILLING_FAILURE",
  "PAYMENT_FAILURE",
  "PATIENT_REGISTRATION_FAILURE",
  "PRESCRIPTION_FAILURE",
  "LAB_FAILURE",
  "PHARMACY_FAILURE",
  // integration
  "WHATSAPP_FAILURE",
  "SMS_FAILURE",
  "EMAIL_FAILURE",
  "PAYMENT_GATEWAY_FAILURE",
  "EXTERNAL_API_FAILURE",
] as const;
export type NeoEventType = (typeof EVENT_TYPES)[number];

/** Maps an event type to its owning category for downstream routing. */
export const EVENT_TYPE_CATEGORY: Record<NeoEventType, NeoEventCategory> = {
  APPLICATION_ERROR: "application",
  APPLICATION_CRASH: "application",
  APPLICATION_TIMEOUT: "application",
  APPLICATION_SLOW: "application",
  UI_ERROR: "application",
  UI_LOADING_FAILURE: "application",
  API_ERROR: "api",
  API_TIMEOUT: "api",
  API_LATENCY: "api",
  API_RATE_LIMIT: "api",
  API_UNAVAILABLE: "api",
  API_AUTH_FAILURE: "api",
  DB_ERROR: "database",
  DB_TIMEOUT: "database",
  DB_SLOW_QUERY: "database",
  DB_CONNECTION_EXHAUSTED: "database",
  DB_DEADLOCK: "database",
  DB_STORAGE_WARNING: "database",
  SERVER_DOWN: "infrastructure",
  CPU_HIGH: "infrastructure",
  MEMORY_HIGH: "infrastructure",
  DISK_HIGH: "infrastructure",
  NETWORK_ERROR: "infrastructure",
  SERVICE_CRASH: "infrastructure",
  CONTAINER_UNHEALTHY: "infrastructure",
  AUTH_FAILURE: "security",
  SUSPICIOUS_LOGIN: "security",
  UNAUTHORIZED_ACCESS: "security",
  PRIVILEGE_ANOMALY: "security",
  SUSPICIOUS_API_ACTIVITY: "security",
  APPOINTMENT_FAILURE: "business",
  BILLING_FAILURE: "business",
  PAYMENT_FAILURE: "business",
  PATIENT_REGISTRATION_FAILURE: "business",
  PRESCRIPTION_FAILURE: "business",
  LAB_FAILURE: "business",
  PHARMACY_FAILURE: "business",
  WHATSAPP_FAILURE: "integration",
  SMS_FAILURE: "integration",
  EMAIL_FAILURE: "integration",
  PAYMENT_GATEWAY_FAILURE: "integration",
  EXTERNAL_API_FAILURE: "integration",
};

export const ENVIRONMENTS = ["production", "staging", "development"] as const;
export type NeoEnvironment = (typeof ENVIRONMENTS)[number];

export const PROCESSING_STATUS = [
  "received",
  "processing",
  "acknowledged",
  "failed",
  "retrying",
  "dead_letter",
  "escalated",
] as const;
export type NeoProcessingStatus = (typeof PROCESSING_STATUS)[number];

/** Severity used when an event does not carry an explicit one. */
export const DEFAULT_SEVERITY_BY_EVENT: Partial<Record<NeoEventType, NeoSeverity>> = {
  APPLICATION_CRASH: "critical",
  APPLICATION_ERROR: "high",
  APPLICATION_TIMEOUT: "medium",
  APPLICATION_SLOW: "low",
  UI_ERROR: "low",
  UI_LOADING_FAILURE: "medium",
  API_ERROR: "high",
  API_TIMEOUT: "medium",
  API_LATENCY: "low",
  API_RATE_LIMIT: "medium",
  API_UNAVAILABLE: "critical",
  API_AUTH_FAILURE: "high",
  DB_ERROR: "high",
  DB_TIMEOUT: "medium",
  DB_SLOW_QUERY: "low",
  DB_CONNECTION_EXHAUSTED: "critical",
  DB_DEADLOCK: "high",
  DB_STORAGE_WARNING: "medium",
  SERVER_DOWN: "critical",
  CPU_HIGH: "medium",
  MEMORY_HIGH: "medium",
  DISK_HIGH: "high",
  NETWORK_ERROR: "high",
  SERVICE_CRASH: "critical",
  CONTAINER_UNHEALTHY: "high",
  AUTH_FAILURE: "medium",
  SUSPICIOUS_LOGIN: "high",
  UNAUTHORIZED_ACCESS: "critical",
  PRIVILEGE_ANOMALY: "critical",
  SUSPICIOUS_API_ACTIVITY: "high",
  APPOINTMENT_FAILURE: "high",
  BILLING_FAILURE: "high",
  PAYMENT_FAILURE: "critical",
  PATIENT_REGISTRATION_FAILURE: "medium",
  PRESCRIPTION_FAILURE: "medium",
  LAB_FAILURE: "medium",
  PHARMACY_FAILURE: "medium",
  WHATSAPP_FAILURE: "medium",
  SMS_FAILURE: "medium",
  EMAIL_FAILURE: "low",
  PAYMENT_GATEWAY_FAILURE: "critical",
  EXTERNAL_API_FAILURE: "high",
};

export function severityRank(sev: NeoSeverity): number {
  return { critical: 5, high: 4, medium: 3, low: 2, info: 1 }[sev];
}

export const ingestEventSchema = z.object({
  eventType: z.enum(EVENT_TYPES),
  source: z.string().min(1).max(160),
  service: z.string().min(1).max(160),
  module: z.string().max(160).optional(),
  severity: z.enum(EVENT_SEVERITY).optional(),
  environment: z.enum(ENVIRONMENTS).default("production"),
  message: z.string().max(4000).optional(),
  correlationId: z.string().max(160).optional(),
  traceId: z.string().max(160).optional(),
  requestId: z.string().max(160).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  metrics: z.record(z.string(), z.number()).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  eventVersion: z.number().int().min(1).max(10).default(1),
  idempotencyKey: z.string().min(1).max(200).optional(),
});
export type IngestEventInput = z.infer<typeof ingestEventSchema>;
