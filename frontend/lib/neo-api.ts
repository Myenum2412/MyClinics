const BASE = "/api/clinics";

export type NeoSeverity = "critical" | "high" | "medium" | "low" | "info";
export type NeoEventCategory =
  | "infrastructure" | "application" | "database" | "api" | "security" | "business" | "integration";
export type NeoProcessingStatus =
  | "received" | "queued" | "processing" | "done" | "failed" | "dead_letter";

async function neoFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error?.message) message = body.error.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export type ServiceComponent = "normal" | "warning" | "error" | "empty";
export type ServiceHealthStatus = "operational" | "degraded" | "critical" | "unknown";
export type IncidentStatus =
  | "DETECTED" | "TRIAGED" | "INVESTIGATING" | "ROOT_CAUSE_IDENTIFIED"
  | "ACTION_RECOMMENDED" | "REMEDIATION" | "MONITORING" | "RECOVERED" | "RESOLVED" | "CLOSED";

export interface RootCauseAnalysis {
  observed: string;
  probableRootCause: string;
  evidence: string[];
  alternativeCauses: string[];
  confidence: number;
  classification: "Very High" | "High" | "Medium" | "Low" | "Insufficient Evidence";
  recommendedVerification: string;
  technical: string;
  business: string;
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
  level: "critical" | "high" | "medium" | "low";
  summary: string;
}

export interface TimelinePoint {
  ts: string;
  label: string;
}

export interface OrgOverview {
  organizationId: string;
  monitoredClinics: number;
  healthy: number;
  warning: number;
  critical: number;
  activeIncidents: number;
  criticalIncidents: number;
  predictedRisks: number;
  events24h: number;
  totalClinics: number;
}

export interface ClinicHealth {
  clinicId: string;
  score: number;
  hasData: boolean;
  status: ServiceHealthStatus;
  factors?: {
    availability: number;
    errorRate: number;
    latency: number;
    security: number;
    integrations: number;
    businessOps: number;
  };
}

export interface ClinicOverview {
  clinicId: string;
  health: ClinicHealth;
  openIncidents: number;
  criticalIncidents: number;
  events24h: number;
  criticalEvents24h: number;
  services: { service: string; status: string }[];
  predictions: Prediction[];
  slo: { target: number; current: number; errorBudget: number };
}

export interface ServiceStatus {
  service: string;
  status: ServiceHealthStatus;
  component: ServiceComponent;
  currentLatencyMs?: number;
  errorRate?: number;
  lastIncidentId?: string;
  aiDiagnosis?: string;
}

export interface TimelineEntry {
  status: ServiceComponent;
  info: string;
  timestamp?: string;
}

export type RiskLevel = "high" | "medium" | "low";

export interface Prediction {
  clinicId: string;
  service: string;
  risk: RiskLevel;
  riskScore: number;
  horizonDays: number | null;
  basis: string;
  recommendation: string;
  category: "error_rate" | "capacity" | "latency" | "integration";
}

export interface OrgIncidentItem {
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
  timeline: TimelinePoint[];
  firstEventAt: string;
  lastEventAt: string;
  createdAt: string;
}

export type IncidentDetail = OrgIncidentItem;

export interface StreamEvent {
  eventId: string;
  clinicId: string;
  environment?: string;
  source: string;
  service: string;
  module?: string;
  eventType: string;
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

export interface ListQuery {
  limit?: number;
  page?: number;
  severity?: string;
  status?: string;
}

// ---- Org-wide (platform_admin) ----

export async function getOrgOverview(): Promise<OrgOverview> {
  return neoFetch<OrgOverview>(`${BASE}/neo/org/overview`);
}

export async function getOrgIncidents(query: ListQuery = {}): Promise<{ items: OrgIncidentItem[]; total: number }> {
  const qs = new URLSearchParams();
  if (query.limit) qs.set("limit", String(query.limit));
  if (query.page) qs.set("page", String(query.page));
  if (query.severity) qs.set("severity", query.severity);
  if (query.status) qs.set("status", query.status);
  const q = qs.toString();
  return neoFetch<{ items: OrgIncidentItem[]; total: number }>(`${BASE}/neo/org/incidents${q ? `?${q}` : ""}`);
}

export async function getOrgPredictions(): Promise<{ items: Prediction[] }> {
  return neoFetch<{ items: Prediction[] }>(`${BASE}/neo/org/predictions`);
}

export async function getOrgEvents(query: ListQuery = {}): Promise<{ items: StreamEvent[]; total: number }> {
  const qs = new URLSearchParams();
  if (query.limit) qs.set("limit", String(query.limit));
  if (query.severity) qs.set("severity", query.severity);
  const q = qs.toString();
  return neoFetch<{ items: StreamEvent[]; total: number }>(`${BASE}/neo/org/events${q ? `?${q}` : ""}`);
}

export async function askNeo(question: string): Promise<{ interpretation: string; data: unknown }> {
  return neoFetch<{ interpretation: string; data: unknown }>(`${BASE}/neo/org/ask`, {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}

// ---- Clinic-scoped ----

export async function getClinicOverview(clinicId: string): Promise<ClinicOverview> {
  return neoFetch<ClinicOverview>(`${BASE}/${clinicId}/neo/overview`);
}

export async function getClinicHealth(clinicId: string): Promise<ClinicHealth> {
  return neoFetch<ClinicHealth>(`${BASE}/${clinicId}/neo/health`);
}

export async function getClinicStatus(clinicId: string): Promise<{ items: ServiceStatus[] }> {
  return neoFetch<{ items: ServiceStatus[] }>(`${BASE}/${clinicId}/neo/status`);
}

export async function getClinicTimeline(
  clinicId: string,
  service: string
): Promise<{ service: string; timeline: TimelineEntry[] }> {
  return neoFetch<{ service: string; timeline: TimelineEntry[] }>(
    `${BASE}/${clinicId}/neo/status/${encodeURIComponent(service)}/timeline`
  );
}

export async function getClinicPredictions(clinicId: string): Promise<{ items: Prediction[] }> {
  return neoFetch<{ items: Prediction[] }>(`${BASE}/${clinicId}/neo/predictions`);
}

export async function getClinicIncidents(
  clinicId: string,
  query: ListQuery = {}
): Promise<{ items: OrgIncidentItem[]; total: number }> {
  const qs = new URLSearchParams();
  if (query.limit) qs.set("limit", String(query.limit));
  if (query.severity) qs.set("severity", query.severity);
  const q = qs.toString();
  return neoFetch<{ items: OrgIncidentItem[]; total: number }>(
    `${BASE}/${clinicId}/neo/incidents${q ? `?${q}` : ""}`
  );
}

export async function getClinicEvents(
  clinicId: string,
  query: ListQuery = {}
): Promise<{ items: StreamEvent[]; total: number }> {
  const qs = new URLSearchParams();
  if (query.limit) qs.set("limit", String(query.limit));
  if (query.severity) qs.set("severity", query.severity);
  const q = qs.toString();
  return neoFetch<{ items: StreamEvent[]; total: number }>(
    `${BASE}/${clinicId}/neo/events${q ? `?${q}` : ""}`
  );
}

// Incident detail + lifecycle (clinic-scoped)
export async function getIncidentDetail(incidentId: string, clinicId: string): Promise<IncidentDetail> {
  return neoFetch<IncidentDetail>(`${BASE}/${clinicId}/neo/incidents/${incidentId}`);
}

export async function transitionIncident(
  incidentId: string,
  clinicId: string,
  status: IncidentStatus
): Promise<IncidentDetail> {
  return neoFetch<IncidentDetail>(`${BASE}/${clinicId}/neo/incidents/${incidentId}/transition`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

export async function resolveIncident(
  incidentId: string,
  clinicId: string,
  verified: boolean
): Promise<IncidentDetail> {
  return neoFetch<IncidentDetail>(`${BASE}/${clinicId}/neo/incidents/${incidentId}/resolve`, {
    method: "POST",
    body: JSON.stringify({ verified }),
  });
}
