import type { Db } from "mongodb";
import {
  resolveNeoContext,
  type NeoContext,
} from "@/neo/core/neo-context";
import { NEO_COLLECTIONS } from "@/neo/core/collections";
import { NeoHealthService, type ClinicHealth } from "@/neo/health/health.service";
import { NeoIncidentService } from "@/neo/incidents/incident.service";
import { NeoEventRepository } from "@/neo/events/event.repository";
import { computePredictions } from "@/neo/ai/prediction.service";
import { daysAgo } from "@/clinic/core/datetime";
import type { ClinicContext } from "@/clinic/core/context";

function clinicScope(base: NeoContext, clinicId: string): NeoContext {
  return { ...base, clinicId, role: "platform_admin" };
}

export interface ClinicOverview {
  clinicId: string;
  health: ClinicHealth;
  openIncidents: number;
  criticalIncidents: number;
  events24h: number;
  criticalEvents24h: number;
  services: { service: string; status: string }[];
  predictions: Awaited<ReturnType<typeof computePredictions>>;
  slo: { target: number; current: number; errorBudget: number };
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

/**
 * Aggregates real RGB Neo telemetry into organization and clinic command-center
 * views. All numbers are computed from stored events/incidents/health — never
 * synthesized.
 */
export class NeoMonitoringService {
  constructor(
    private readonly db: Db,
    private readonly ctx: ClinicContext
  ) {}

  private scope(): NeoContext {
    return resolveNeoContext(this.ctx);
  }

  async clinicOverview(clinicId: string): Promise<ClinicOverview> {
    const orgScope = this.scope();
    const cScope = clinicScope(orgScope, clinicId);
    const healthSvc = new NeoHealthService(this.db, cScope);
    const health = await healthSvc.computeScore(clinicId);
    const incidentSvc = new NeoIncidentService(this.db, this.ctx);
    const [open, criticalList, eventCounts, statuses, predictions] = await Promise.all([
      incidentSvc.list({ clinicId, limit: 1, page: 1 }),
      incidentSvc.list({ clinicId, severity: "critical", limit: 1, page: 1 }),
      new NeoEventRepository(this.db, cScope).countBySeverity(clinicId, daysAgo(1)),
      healthSvc.repo.getStatuses(),
      computePredictions(this.db, cScope),
    ]);
    const events24hTotal =
      Object.values(eventCounts).reduce((a, b) => a + b, 0);
    return {
      clinicId,
      health,
      openIncidents: open.total,
      criticalIncidents: criticalList.total,
      events24h: events24hTotal,
      criticalEvents24h: eventCounts.critical ?? 0,
      services: statuses.map((s) => ({ service: s.service, status: s.status })),
      predictions: await predictions,
      slo: {
        target: 99.9,
        current: Number(health.score.toFixed(2)),
        errorBudget: Number(Math.max(0, health.score - (100 - 99.9)).toFixed(2)),
      },
    };
  }

  async orgOverview(): Promise<OrgOverview> {
    const scope = this.scope();
    const eventsCol = this.db.collection(NEO_COLLECTIONS.events);
    const since = daysAgo(30);

    const clinicRows = await eventsCol
      .aggregate([
        { $match: { organizationId: scope.organizationId, timestamp: { $gte: since } } },
        { $group: { _id: "$clinicId" } },
      ])
      .toArray();
    const clinicIds = clinicRows.map((r) => String(r._id)).filter(Boolean);

    let healthy = 0;
    let warning = 0;
    let critical = 0;
    for (const cid of clinicIds.slice(0, 300)) {
      const health = await new NeoHealthService(this.db, clinicScope(scope, cid)).computeScore(cid);
      if (!health.hasData) continue;
      if (health.score >= 90) healthy += 1;
      else if (health.score >= 70) warning += 1;
      else critical += 1;
    }

    const incidentSvc = new NeoIncidentService(this.db, this.ctx);
    const stats = await incidentSvc.orgStats();
    const predictions = await computePredictions(this.db, scope);
    const events24h = Object.values(
      await new NeoEventRepository(this.db, scope).countBySeverity("", daysAgo(1))
    ).reduce((a, b) => a + b, 0);

    return {
      organizationId: scope.organizationId,
      monitoredClinics: clinicIds.length,
      healthy,
      warning,
      critical,
      activeIncidents: stats.open,
      criticalIncidents: stats.critical,
      predictedRisks: predictions.length,
      events24h,
      totalClinics: clinicIds.length,
    };
  }
}
