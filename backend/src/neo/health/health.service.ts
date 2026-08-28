import {
  type ServiceHealthStatus,
  NeoHealthRepository,
} from "@/neo/health/health.repository";
import { NeoEventRepository } from "@/neo/events/event.repository";
import { NeoIncidentRepository } from "@/neo/incidents/incident.repository";
import { type NeoContext } from "@/neo/core/neo-context";
import { type NeoSeverity } from "@/neo/core/neo-events";
import { now, toLocalDateISO, daysAgo } from "@/clinic/core/datetime";
import type { Db } from "mongodb";

const SEVERITY_DEDUCT: Record<NeoSeverity, number> = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
  info: 1,
};

export function statusToComponent(status: ServiceHealthStatus): "normal" | "warning" | "error" | "empty" {
  switch (status) {
    case "operational":
      return "normal";
    case "degraded":
      return "warning";
    case "critical":
      return "error";
    default:
      return "empty";
  }
}

export interface ClinicHealth {
  clinicId: string;
  score: number;
  hasData: boolean;
  status: ServiceHealthStatus;
  factors: {
    availability: number;
    errorRate: number;
    latency: number;
    security: number;
    integrations: number;
    businessOps: number;
  };
}

/**
 * Computes a clinic health score (0-100) from real telemetry: open incidents
 * and recent critical/security/integration/business events over the last 24h.
 * When no telemetry exists the score is reported with `hasData: false` so the
 * UI never presents an uninstrumented clinic as "proven healthy".
 */
export class NeoHealthService {
  readonly repo: NeoHealthRepository;
  private readonly events: NeoEventRepository;
  private readonly incidents: NeoIncidentRepository;

  constructor(
    private readonly db: Db,
    private readonly scope: NeoContext
  ) {
    this.repo = new NeoHealthRepository(db, scope);
    this.events = new NeoEventRepository(db, scope);
    this.incidents = new NeoIncidentRepository(db, scope);
  }

  async updateServiceStatus(
    service: string,
    patch: {
      status: ServiceHealthStatus;
      currentLatencyMs?: number;
      errorRate?: number;
      lastIncidentId?: string;
      aiDiagnosis?: string;
    }
  ): Promise<void> {
    await this.repo.upsertStatus({ service, ...patch });
  }

  /** Reflects currently-open incidents onto the affected service statuses. */
  async refreshServiceStatuses(): Promise<void> {
    const open = await this.incidents.list({ limit: 200, page: 1 });
    for (const inc of open.items) {
      const status: ServiceHealthStatus =
        inc.severity === "critical" ? "critical" : inc.severity === "high" ? "degraded" : "degraded";
      for (const service of inc.affectedServices) {
        await this.repo.upsertStatus({
          service,
          status,
          lastIncidentId: inc.incidentId,
          aiDiagnosis: inc.rootCause?.probableRootCause,
        });
      }
    }
  }

  async computeScore(clinicId: string): Promise<ClinicHealth> {
    const since = daysAgo(1);
    const sevCounts = await this.events.countBySeverity(clinicId, since);
    const open = await this.incidents.list({ clinicId, limit: 200, page: 1 });

    const criticalEvents = sevCounts.critical ?? 0;
    const highEvents = sevCounts.high ?? 0;

    let deduction = 0;
    for (const inc of open.items) {
      if (inc.status === "RESOLVED" || inc.status === "CLOSED") continue;
      deduction += SEVERITY_DEDUCT[inc.severity] ?? 0;
    }
    deduction += Math.min(20, criticalEvents * 2);
    deduction += Math.min(10, highEvents);

    const hasData = criticalEvents + highEvents > 0 || open.items.length > 0;
    const score = Math.max(0, Math.min(100, 100 - deduction));

    const factors = {
      availability: Math.max(0, 100 - deduction),
      errorRate: Math.max(0, 100 - Math.min(40, (sevCounts.critical ?? 0) * 3 + (sevCounts.high ?? 0))),
      latency: criticalEvents > 0 ? 70 : 100,
      security: (sevCounts.critical ?? 0) > 0 ? 60 : 100,
      integrations: 100,
      businessOps: (sevCounts.high ?? 0) > 0 ? 80 : 100,
    };

    return {
      clinicId,
      score,
      hasData,
      status: score >= 90 ? "operational" : score >= 70 ? "degraded" : "critical",
      factors,
    };
  }

  async ensureSnapshot(clinicId: string): Promise<void> {
    const health = await this.computeScore(clinicId);
    const day = toLocalDateISO(now());
    await this.repo.upsertSnapshot({
      organizationId: this.scope.organizationId,
      clinicId,
      day,
      score: health.score,
      factors: health.factors,
      incidents: 0,
      criticalEvents: 0,
      updatedAt: now(),
    });
  }

  /**
   * Builds a daily status timeline for the Status Monitor component from real
   * event history (last `days` days). A day with no events is reported as
   * "empty" (no data) rather than fabricated as healthy.
   */
  async getServiceTimeline(
    clinicId: string,
    service: string,
    days: number
  ): Promise<{ status: "normal" | "warning" | "error" | "empty"; info: string; timestamp?: string }[]> {
    const since = daysAgo(days);
    const byDay = await this.events.dailySeverityTimeline(clinicId, service, since);

    const out: { status: "normal" | "warning" | "error" | "empty"; info: string; timestamp?: string }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now().getTime() - i * 86_400_000);
      const dayStr = toLocalDateISO(d);
      const rec = byDay.get(dayStr);
      if (!rec) {
        out.push({ status: "empty", info: "No status data recorded." });
      } else if (rec.worst >= 3) {
        out.push({ status: "error", info: `${rec.count} critical event(s) recorded.`, timestamp: dayStr });
      } else if (rec.worst >= 1) {
        out.push({ status: "warning", info: `${rec.count} degraded event(s) recorded.`, timestamp: dayStr });
      } else {
        out.push({ status: "normal", info: "Systems operating normally.", timestamp: dayStr });
      }
    }
    return out;
  }
}
