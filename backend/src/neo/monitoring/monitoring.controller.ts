import type { FastifyReply, FastifyRequest } from "fastify";
import { getDb } from "@/lib/db-pools";
import { BadRequestError, UnauthorizedError } from "@/clinic/core/errors";
import {
  resolveNeoContext,
  type NeoContext,
} from "@/neo/core/neo-context";
import { NeoMonitoringService } from "@/neo/monitoring/monitoring.service";
import { NeoIncidentService } from "@/neo/incidents/incident.service";
import { NeoHealthService, statusToComponent } from "@/neo/health/health.service";
import { computePredictions } from "@/neo/ai/prediction.service";
import { NeoEventService } from "@/neo/events/event.service";

function clinicScope(base: NeoContext, clinicId: string): NeoContext {
  return { ...base, clinicId, role: "platform_admin" };
}

export class NeoMonitoringController {
  private monitoring(db: Awaited<ReturnType<typeof getDb>>, ctx: NonNullable<unknown>) {
    return new NeoMonitoringService(db, ctx as never);
  }

  async clinicOverview(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { clinicId } = request.params as { clinicId: string };
    const db = await getDb();
    return reply.send(await new NeoMonitoringService(db, ctx).clinicOverview(clinicId));
  }

  async health(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { clinicId } = request.params as { clinicId: string };
    const db = await getDb();
    const scope = clinicScope(resolveNeoContext(ctx), clinicId);
    const health = await new NeoHealthService(db, scope).computeScore(clinicId);
    return reply.send(health);
  }

  async status(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { clinicId } = request.params as { clinicId: string };
    const db = await getDb();
    const scope = clinicScope(resolveNeoContext(ctx), clinicId);
    const statuses = await new NeoHealthService(db, scope).repo.getStatuses();
    const items = statuses.map((s) => ({
      service: s.service,
      status: s.status,
      component: statusToComponent(s.status),
      currentLatencyMs: s.currentLatencyMs,
      errorRate: s.errorRate,
      lastIncidentId: s.lastIncidentId,
      aiDiagnosis: s.aiDiagnosis,
    }));
    return reply.send({ items });
  }

  async statusTimeline(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { clinicId, service } = request.params as { clinicId: string; service: string };
    const days = Math.min(90, Number((request.query as Record<string, unknown>).days ?? 90));
    const db = await getDb();
    const scope = clinicScope(resolveNeoContext(ctx), clinicId);
    const timeline = await new NeoHealthService(db, scope).getServiceTimeline(clinicId, service, days);
    return reply.send({ service, timeline });
  }

  async predictions(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { clinicId } = request.params as { clinicId: string };
    const db = await getDb();
    const scope = clinicScope(resolveNeoContext(ctx), clinicId);
    return reply.send({ items: await computePredictions(db, scope) });
  }

  async orgOverview(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const db = await getDb();
    return reply.send(await new NeoMonitoringService(db, ctx).orgOverview());
  }

  async orgIncidents(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const q = request.query as Record<string, unknown>;
    const db = await getDb();
    const { items, total } = await new NeoIncidentService(db, ctx).list({
      limit: Number(q.limit ?? 50),
      page: Number(q.page ?? 1),
    });
    return reply.send({ items, total });
  }

  async orgPredictions(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const db = await getDb();
    const predictions = await computePredictions(db, resolveNeoContext(ctx));
    return reply.send({ items: predictions });
  }

  /**
   * Natural-language operations assistant. Translates a question into safe,
   * scoped backend queries and returns the REAL data — it never invents
   * incidents, metrics or root causes.
   */
  async ask(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { question } = (request.body ?? {}) as { question?: string };
    if (!question || !question.trim()) throw new BadRequestError("Question is required");
    const q = question.toLowerCase();
    const db = await getDb();
    const monitor = new NeoMonitoringService(db, ctx);
    const incidents = new NeoIncidentService(db, ctx);

    if (/critical/.test(q) && /incident/.test(q)) {
      const { items, total } = await incidents.list({ severity: "critical", limit: 50, page: 1 });
      return reply.send({
        interpretation: "Active critical incidents",
        data: { total, items },
      });
    }
    if (/predict|fail next|risk|likely/.test(q)) {
      const items = await computePredictions(db, resolveNeoContext(ctx));
      return reply.send({
        interpretation: "Predicted risks from telemetry trends",
        data: { total: items.length, items },
      });
    }
    if (/broken|what is wrong|unhealthy|status/.test(q)) {
      const overview = await monitor.orgOverview();
      return reply.send({
        interpretation: "Organization health and active incidents",
        data: overview,
      });
    }
    if (/clinic/.test(q) && /most|highest|top/.test(q)) {
      const overview = await monitor.orgOverview();
      return reply.send({
        interpretation: "Organization clinic rollup (most-affected first requires incident detail)",
        data: overview,
      });
    }
    // Default: organization summary.
    const overview = await monitor.orgOverview();
    return reply.send({
      interpretation: "Organization overview",
      data: overview,
    });
  }
}
