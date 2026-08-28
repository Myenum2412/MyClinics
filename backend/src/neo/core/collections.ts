/**
 * RGB Neo collection names. All collections carry `organizationId` and
 * `clinicId` and are never queried without at least one of them (enforced in
 * the repository layer). Naming uses a `neo_` prefix to stay distinct from the
 * clinic (`clc_`) and platform collections.
 */
export const NEO_COLLECTIONS = {
  events: "neo_events",
  incidents: "neo_incidents",
  correlations: "neo_event_correlations",
  metrics: "neo_metrics",
  alerts: "neo_alerts",
  predictions: "neo_predictions",
  status: "neo_status",
  dependencies: "neo_dependencies",
  healthSnapshots: "neo_health_snapshots",
  auditLogs: "neo_audit_logs",
  remediationActions: "neo_remediation_actions",
  deadLetters: "neo_dead_letters",
  queue: "neo_queue",
} as const;

export type NeoCollectionName = (typeof NEO_COLLECTIONS)[keyof typeof NEO_COLLECTIONS];
