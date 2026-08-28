import { describe, it, expect } from "vitest";
import {
  severityRank,
  ingestEventSchema,
  EVENT_TYPES,
} from "@/neo/core/neo-events";
import { computeBackoff, priorityForSeverity, topicForCategory } from "@/neo/queue/queue.service";
import { classifyConfidence } from "@/neo/ai/rca.service";
import { isBusinessCritical, deriveIdempotencyKey } from "@/neo/queue/retry.service";
import { statusToComponent } from "@/neo/health/health.service";

describe("neo-events severity", () => {
  it("ranks severity in descending order", () => {
    expect(severityRank("critical")).toBe(5);
    expect(severityRank("high")).toBe(4);
    expect(severityRank("medium")).toBe(3);
    expect(severityRank("low")).toBe(2);
    expect(severityRank("info")).toBe(1);
  });
});

describe("ingestEventSchema", () => {
  it("accepts a minimal valid event", () => {
    const parsed = ingestEventSchema.safeParse({
      eventType: "DB_TIMEOUT",
      source: "scheduler",
      service: "db",
      eventVersion: 1,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.environment).toBe("production");
    }
  });

  it("rejects an unknown event type", () => {
    const parsed = ingestEventSchema.safeParse({
      eventType: "TOTALLY_FAKE_EVENT",
      source: "x",
      service: "y",
      eventVersion: 1,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a missing required field", () => {
    const parsed = ingestEventSchema.safeParse({
      eventType: "DB_TIMEOUT",
      service: "db",
      eventVersion: 1,
    });
    expect(parsed.success).toBe(false);
  });

  it("exposes a non-empty event-type catalogue", () => {
    expect(EVENT_TYPES.length).toBeGreaterThan(0);
  });
});

describe("queue backoff & priority", () => {
  it("computes jittered backoff within bounds and caps at 16s", () => {
    for (let i = 0; i < 20; i += 1) {
      expect(computeBackoff(1)).toBeGreaterThanOrEqual(0);
      expect(computeBackoff(1)).toBeLessThanOrEqual(1000);
      expect(computeBackoff(10)).toBeLessThanOrEqual(16_000);
    }
  });

  it("maps critical severity to highest priority", () => {
    expect(priorityForSeverity("critical")).toBe(5);
    expect(priorityForSeverity("info")).toBe(1);
  });

  it("routes security critical events to the critical topic", () => {
    expect(topicForCategory("security", "critical")).toBe("critical-events");
    expect(topicForCategory("database", "high")).toBe("database-events");
    expect(topicForCategory("business", "low")).toBe("business-events");
  });
});

describe("rca confidence classification", () => {
  it("classifies confidence thresholds", () => {
    expect(classifyConfidence(96)).toBe("Very High");
    expect(classifyConfidence(85)).toBe("High");
    expect(classifyConfidence(70)).toBe("Medium");
    expect(classifyConfidence(50)).toBe("Low");
    expect(classifyConfidence(10)).toBe("Insufficient Evidence");
  });
});

describe("business-critical detection", () => {
  it("flags revenue/clinical blocking failures", () => {
    expect(isBusinessCritical("PAYMENT_GATEWAY_FAILURE")).toBe(true);
    expect(isBusinessCritical("APPOINTMENT_FAILURE")).toBe(true);
    expect(isBusinessCritical("PRESCRIPTION_FAILURE")).toBe(true);
  });

  it("does not flag infrastructure-only failures", () => {
    expect(isBusinessCritical("DB_TIMEOUT")).toBe(false);
    expect(isBusinessCritical("WHATSAPP_FAILURE")).toBe(false);
    expect(isBusinessCritical("AUTH_FAILURE")).toBe(false);
  });
});

describe("idempotency key derivation", () => {
  it("is stable for identical inputs", () => {
    const a = deriveIdempotencyKey({ clinicId: "c1", eventType: "DB_TIMEOUT", correlationId: "x" });
    const b = deriveIdempotencyKey({ clinicId: "c1", eventType: "DB_TIMEOUT", correlationId: "x" });
    expect(a).toBe(b);
  });

  it("differs across clinics or events", () => {
    const a = deriveIdempotencyKey({ clinicId: "c1", eventType: "DB_TIMEOUT" });
    const b = deriveIdempotencyKey({ clinicId: "c2", eventType: "DB_TIMEOUT" });
    const c = deriveIdempotencyKey({ clinicId: "c1", eventType: "AUTH_FAILURE" });
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });
});

describe("health status mapping", () => {
  it("maps service status to component status", () => {
    expect(statusToComponent("operational")).toBe("normal");
    expect(statusToComponent("degraded")).toBe("warning");
    expect(statusToComponent("critical")).toBe("error");
    expect(statusToComponent("unknown")).toBe("empty");
  });
});
