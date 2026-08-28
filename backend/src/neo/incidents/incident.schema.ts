import type { ObjectId } from "mongodb";
import {
  type NeoSeverity,
  type NeoEventCategory,
  type NeoEventType,
} from "@/neo/core/neo-events";
import { now } from "@/clinic/core/datetime";
import { randomToken } from "@/clinic/core/ids";

export const INCIDENT_STATUSES = [
  "DETECTED",
  "TRIAGED",
  "INVESTIGATING",
  "ROOT_CAUSE_IDENTIFIED",
  "ACTION_RECOMMENDED",
  "REMEDIATION",
  "MONITORING",
  "RECOVERED",
  "RESOLVED",
  "CLOSED",
] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const INCIDENT_SEVERITY_TO_PRIORITY: Record<NeoSeverity, string> = {
  critical: "P0",
  high: "P1",
  medium: "P2",
  low: "P3",
  info: "P5",
};

export interface TimelineEntry {
  ts: Date;
  label: string;
}

export interface BlastRadius {
  clinics: number;
  services: number;
  modules: number;
  users: number;
  requests: number;
  transactions: number;
}

export interface BusinessImpact {
  patients: number;
  staff: number;
  transactions: number;
  revenueRisk: number;
  level: "none" | "low" | "medium" | "high" | "critical";
  summary: string;
}

export interface RootCauseAnalysis {
  observed: string;
  probableRootCause: string;
  evidence: string[];
  alternativeCauses: string[];
  confidence: number;
  classification:
    | "Very High"
    | "High"
    | "Medium"
    | "Low"
    | "Insufficient Evidence";
  recommendedVerification: string;
  technical: string;
  business: string;
  disclaimer: string;
}

export interface NeoIncidentDoc {
  _id?: ObjectId;
  incidentId: string;
  organizationId: string;
  clinicId: string;
  title: string;
  severity: NeoSeverity;
  priority: string;
  status: IncidentStatus;
  category: NeoEventCategory;
  sourceEventTypes: NeoEventType[];
  correlationId?: string;
  correlationKey: string;
  affectedServices: string[];
  affectedModules: string[];
  eventCount: number;
  firstEventAt: Date;
  lastEventAt: Date;
  blastRadius: BlastRadius;
  businessImpact: BusinessImpact;
  rootCause: RootCauseAnalysis | null;
  rcaGeneratedAt?: Date;
  timeline: TimelineEntry[];
  relatedEventIds: string[];
  assignedTo?: string;
  resolutionVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function correlationKeyFor(
  clinicId: string,
  service: string,
  category: NeoEventCategory
): string {
  return `${clinicId}::${service}::${category}`;
}

export function buildIncidentDoc(params: {
  scope: { organizationId: string; clinicId: string };
  title: string;
  severity: NeoSeverity;
  category: NeoEventCategory;
  eventType: NeoEventType;
  correlationKey: string;
  service: string;
  correlationId?: string;
  firstEventAt: Date;
  message: string;
}): NeoIncidentDoc {
  const ts = now();
  return {
    incidentId: `INC-${ts.getUTCFullYear()}-${randomToken(6).toUpperCase()}`,
    organizationId: params.scope.organizationId,
    clinicId: params.scope.clinicId,
    title: params.title,
    severity: params.severity,
    priority: INCIDENT_SEVERITY_TO_PRIORITY[params.severity],
    status: "DETECTED",
    category: params.category,
    sourceEventTypes: [params.eventType],
    correlationId: params.correlationId,
    correlationKey: params.correlationKey,
    affectedServices: [params.service],
    affectedModules: [],
    eventCount: 1,
    firstEventAt: params.firstEventAt,
    lastEventAt: params.firstEventAt,
    blastRadius: {
      clinics: 1,
      services: 1,
      modules: 0,
      users: 0,
      requests: 0,
      transactions: 0,
    },
    businessImpact: {
      patients: 0,
      staff: 0,
      transactions: 0,
      revenueRisk: 0,
      level: "low",
      summary: params.message,
    },
    rootCause: null,
    timeline: [{ ts, label: "Incident detected from incoming event" }],
    relatedEventIds: [],
    resolutionVerified: false,
    createdAt: ts,
    updatedAt: ts,
  };
}

export interface PublicIncident {
  incidentId: string;
  clinicId: string;
  title: string;
  severity: NeoSeverity;
  priority: string;
  status: IncidentStatus;
  category: NeoEventCategory;
  affectedServices: string[];
  eventCount: number;
  blastRadius: BlastRadius;
  businessImpact: BusinessImpact;
  rootCause: RootCauseAnalysis | null;
  timeline: { ts: string; label: string }[];
  firstEventAt: string;
  lastEventAt: string;
  createdAt: string;
}

export function incidentToPublic(doc: NeoIncidentDoc): PublicIncident {
  return {
    incidentId: doc.incidentId,
    clinicId: doc.clinicId,
    title: doc.title,
    severity: doc.severity,
    priority: doc.priority,
    status: doc.status,
    category: doc.category,
    affectedServices: doc.affectedServices,
    eventCount: doc.eventCount,
    blastRadius: doc.blastRadius,
    businessImpact: doc.businessImpact,
    rootCause: doc.rootCause,
    timeline: doc.timeline.map((t) => ({ ts: t.ts.toISOString(), label: t.label })),
    firstEventAt: doc.firstEventAt.toISOString(),
    lastEventAt: doc.lastEventAt.toISOString(),
    createdAt: doc.createdAt.toISOString(),
  };
}
