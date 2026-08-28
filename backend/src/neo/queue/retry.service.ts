import {
  type NeoEventType,
  EVENT_TYPE_CATEGORY,
} from "@/neo/core/neo-events";

/**
 * Idempotency + business-critical classification helpers. Business-critical
 * events (payments, appointments, prescriptions, registrations) must never be
 * duplicated into billing/notification/operational side-effects during retries,
 * so they carry an idempotency key and are flagged for safe reprocessing.
 */
const BUSINESS_CRITICAL: NeoEventType[] = [
  "PAYMENT_FAILURE",
  "PAYMENT_GATEWAY_FAILURE",
  "BILLING_FAILURE",
  "APPOINTMENT_FAILURE",
  "PRESCRIPTION_FAILURE",
  "PATIENT_REGISTRATION_FAILURE",
  "LAB_FAILURE",
  "PHARMACY_FAILURE",
];

export function isBusinessCritical(eventType: NeoEventType): boolean {
  return BUSINESS_CRITICAL.includes(eventType);
}

/** A deterministic idempotency key derived from event semantics. */
export function deriveIdempotencyKey(parts: {
  clinicId: string;
  eventType: NeoEventType;
  correlationId?: string;
  requestId?: string;
}): string {
  const seed = [
    parts.clinicId,
    parts.eventType,
    parts.correlationId ?? parts.requestId ?? "",
  ]
    .filter(Boolean)
    .join(":");
  return `idem_${Buffer.from(seed).toString("base64url").slice(0, 160)}`;
}

export function categoryOf(eventType: NeoEventType) {
  return EVENT_TYPE_CATEGORY[eventType];
}
