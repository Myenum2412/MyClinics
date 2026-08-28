import { z } from "zod";
import {
  EVENT_SEVERITY,
  EVENT_TYPES,
  ENVIRONMENTS,
  type NeoSeverity,
} from "@/neo/core/neo-events";

export const listEventsSchema = z.object({
  severity: z.enum(EVENT_SEVERITY).optional(),
  eventType: z.enum(EVENT_TYPES).optional(),
  category: z
    .enum(["application", "api", "database", "infrastructure", "security", "business", "integration"])
    .optional(),
  service: z.string().optional(),
  processingStatus: z.string().optional(),
  incidentId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  page: z.coerce.number().int().min(1).default(1),
});
export type ListEventsQuery = z.infer<typeof listEventsSchema>;

export const incidentSeveritySchema = z.enum(EVENT_SEVERITY);

export interface EventStreamItem {
  eventId: string;
  clinicId: string;
  service: string;
  eventType: string;
  severity: NeoSeverity;
  message?: string;
  metrics?: Record<string, number>;
  timestamp: string;
}

export function toEventStream(items: EventStreamItem[]) {
  return items;
}
