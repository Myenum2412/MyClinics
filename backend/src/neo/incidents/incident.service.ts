import type { Db } from "mongodb";
import {
  type NeoContext,
  resolveNeoContext,
} from "@/neo/core/neo-context";
import {
  type NeoSeverity,
  severityRank,
} from "@/neo/core/neo-events";
import { NeoEventRepository } from "@/neo/events/event.repository";
import { type NeoEventDoc } from "@/neo/events/event.schema";
import { NeoIncidentRepository } from "@/neo/incidents/incident.repository";
import {
  type NeoIncidentDoc,
  type IncidentStatus,
  buildIncidentDoc,
  correlationKeyFor,
  incidentToPublic,
} from "@/neo/incidents/incident.schema";
import { NeoHealthService } from "@/neo/health/health.service";
import { analyzeIncident } from "@/neo/ai/rca.service";
import { correlationWindowStart } from "@/neo/correlation/correlation.service";
import { now } from "@/clinic/core/datetime";
import type { ClinicContext } from "@/clinic/core/context";

const SERVICE_STATUS: Record<NeoSeverity, "critical" | "degraded"> = {
  critical: "critical",
  high: "degraded",
  medium: "degraded",
  low: "degraded",
  info: "degraded",
};

function clinicScoped(base: NeoContext, clinicId: string): NeoContext {
  return { ...base, clinicId, role: "platform_admin" };
}

/**
 * The incident engine. Turns a single ingested event into correlated incident
 * intelligence:
 *  - deduplicates: events sharing a (clinic, service, category) correlation key
 *    within the correlation window attach to the same open incident instead of
 *    spawning thousands of alerts (alert fatigue prevention);
 *  - escalates severity when a worse event arrives;
 *  - reflects the incident onto live service status;
 *  - runs AI root-cause analysis (with confidence) exactly once per incident.
 */
export class NeoIncidentService {
  constructor(
    private readonly db: Db,
    private readonly ctx: ClinicContext
  ) {}

  private scope(): NeoContext {
    return resolveNeoContext(this.ctx);
  }

  /** Main entry used by the queue processor for each ingested event. */
  async processEvent(event: NeoEventDoc): Promise<NeoIncidentDoc> {
    const scope = this.scope();
    const clinicEventScope = clinicScoped(scope, event.clinicId);
    const eventRepo = new NeoEventRepository(this.db, clinicEventScope);
    const incidentRepo = new NeoIncidentRepository(this.db, clinicEventScope);
    const health = new NeoHealthService(this.db, clinicEventScope);

    const key = correlationKeyFor(event.clinicId, event.service, event.category);
    const existing = await incidentRepo.findOpenByKey(key, correlationWindowStart());

    if (existing) {
      const mergedServices = Array.from(
        new Set([...existing.affectedServices, event.service])
      );
      const escalated =
        severityRank(event.severity) > severityRank(existing.severity);
      const relatedEventIds = Array.from(
        new Set([...existing.relatedEventIds, event.eventId])
      ).slice(-500);
      const update: Partial<NeoIncidentDoc> = {
        eventCount: existing.eventCount + 1,
        lastEventAt: event.timestamp,
        affectedServices: mergedServices,
        relatedEventIds,
        timeline: [
          ...existing.timeline,
          { ts: now(), label: `Correlated ${event.eventType} (${event.severity})` },
        ].slice(-200),
      };
      if (escalated) {
        update.severity = event.severity;
        update.priority = { critical: "P0", high: "P1", medium: "P2", low: "P3", info: "P5" }[event.severity];
        update.timeline = [
          ...update.timeline!,
          { ts: now(), label: `Severity escalated to ${event.severity}` },
        ];
      }
      await incidentRepo.updateByIncidentId(existing.incidentId, update);
      await health.updateServiceStatus(event.service, {
        status: SERVICE_STATUS[event.severity],
        aiDiagnosis: existing.rootCause?.probableRootCause,
        lastIncidentId: existing.incidentId,
      });
      return (await incidentRepo.findById(existing.incidentId)) as NeoIncidentDoc;
    }

    const incident = buildIncidentDoc({
      scope: { organizationId: event.organizationId, clinicId: event.clinicId },
      title: `${event.service}: ${event.eventType}`,
      severity: event.severity,
      category: event.category,
      eventType: event.eventType,
      correlationKey: key,
      service: event.service,
      correlationId: event.correlationId,
      firstEventAt: event.timestamp,
      message: event.message ?? event.eventType,
    });
    const created = await incidentRepo.insert(incident);

    await health.updateServiceStatus(event.service, {
      status: SERVICE_STATUS[event.severity],
      lastIncidentId: created.incidentId,
    });

    // AI root-cause analysis (guarded; never blocks the pipeline fatally).
    try {
      const related = await eventRepo.recentForCorrelation(
        event.clinicId,
        event.service,
        correlationWindowStart()
      );
      const rca = await analyzeIncident(created, related);
      await incidentRepo.updateByIncidentId(created.incidentId, {
        rootCause: rca,
        rcaGeneratedAt: now(),
        status: "ROOT_CAUSE_IDENTIFIED",
        timeline: [
          ...created.timeline,
          { ts: now(), label: `Root cause identified (${rca.classification}, ${rca.confidence}%)` },
        ],
      });
    } catch {
      // RCA failure must not fail ingestion — the incident still exists.
    }

    return (await incidentRepo.findById(created.incidentId)) as NeoIncidentDoc;
  }

  async list(query: {
    status?: IncidentStatus;
    severity?: string;
    clinicId?: string;
    limit: number;
    page: number;
  }) {
    const scope = this.scope();
    const incidentRepo = new NeoIncidentRepository(this.db, scope);
    const { items, total } = await incidentRepo.list(query);
    return { items: items.map(incidentToPublic), total };
  }

  async getById(incidentId: string) {
    const scope = this.scope();
    const incidentRepo = new NeoIncidentRepository(this.db, scope);
    const doc = await incidentRepo.findById(incidentId);
    return doc ? incidentToPublic(doc) : null;
  }

  async transition(incidentId: string, next: IncidentStatus) {
    const scope = this.scope();
    const incidentRepo = new NeoIncidentRepository(this.db, scope);
    const doc = await incidentRepo.findById(incidentId);
    if (!doc) return null;
    await incidentRepo.updateByIncidentId(incidentId, {
      status: next,
      timeline: [
        ...doc.timeline,
        { ts: now(), label: `Status changed to ${next}` },
      ].slice(-200),
    });
    return incidentRepo.findById(incidentId);
  }

  /** Resolution requires explicit recovery verification (never auto-close). */
  async resolveWithVerification(incidentId: string, verified: boolean) {
    const scope = this.scope();
    const incidentRepo = new NeoIncidentRepository(this.db, scope);
    const doc = await incidentRepo.findById(incidentId);
    if (!doc) return null;
    const status: IncidentStatus = verified ? "RESOLVED" : "MONITORING";
    await incidentRepo.updateByIncidentId(incidentId, {
      status,
      resolutionVerified: verified,
      timeline: [
        ...doc.timeline,
        {
          ts: now(),
          label: verified
            ? "Resolved after recovery verification"
            : "Recovery unverified — kept in monitoring",
        },
      ].slice(-200),
    });
    if (verified) {
      const health = new NeoHealthService(this.db, clinicScoped(scope, doc.clinicId));
      for (const service of doc.affectedServices) {
        await health.updateServiceStatus(service, { status: "operational" });
      }
    }
    return incidentRepo.findById(incidentId);
  }

  async orgStats() {
    const scope = this.scope();
    const incidentRepo = new NeoIncidentRepository(this.db, scope);
    return incidentRepo.orgStats();
  }
}
