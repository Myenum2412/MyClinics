import type { FastifyReply, FastifyRequest } from "fastify";
import { getDb } from "@/lib/db-pools";
import { BadRequestError, UnauthorizedError } from "@/clinic/core/errors";
import { writeAudit } from "@/clinic/core/audit";
import { NeoIncidentService } from "@/neo/incidents/incident.service";
import {
  type IncidentStatus,
  INCIDENT_STATUSES,
} from "@/neo/incidents/incident.schema";

export class NeoIncidentController {
  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const q = request.query as Record<string, unknown>;
    const statusRaw = q.status as string | undefined;
    const severityRaw = q.severity as string | undefined;
    const status = INCIDENT_STATUSES.includes(statusRaw as IncidentStatus)
      ? (statusRaw as IncidentStatus)
      : undefined;
    const db = await getDb();
    const { items, total } = await new NeoIncidentService(db, ctx).list({
      status,
      severity: severityRaw,
      clinicId: (request.params as { clinicId?: string }).clinicId,
      limit: Number(q.limit ?? 50),
      page: Number(q.page ?? 1),
    });
    return reply.send({ items, total });
  }

  async getById(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { incidentId } = request.params as { incidentId: string };
    const db = await getDb();
    const incident = await new NeoIncidentService(db, ctx).getById(incidentId);
    if (!incident) throw new BadRequestError("Incident not found");
    await writeAudit(db, ctx, {
      action: "neo_incident_viewed",
      entity: "neo_incident",
      entityId: incidentId,
    });
    return reply.send(incident);
  }

  async transition(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { incidentId } = request.params as { incidentId: string };
    const { status } = (request.body ?? {}) as { status?: string };
    if (!status || !INCIDENT_STATUSES.includes(status as IncidentStatus)) {
      throw new BadRequestError("Invalid incident status");
    }
    const db = await getDb();
    const incident = await new NeoIncidentService(db, ctx).transition(
      incidentId,
      status as IncidentStatus
    );
    if (!incident) throw new BadRequestError("Incident not found");
    await writeAudit(db, ctx, {
      action: "neo_incident_status_changed",
      entity: "neo_incident",
      entityId: incidentId,
      metadata: { status },
    });
    return reply.send(incident);
  }

  async resolve(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { incidentId } = request.params as { incidentId: string };
    const { verified } = (request.body ?? {}) as { verified?: boolean };
    const db = await getDb();
    const incident = await new NeoIncidentService(db, ctx).resolveWithVerification(
      incidentId,
      Boolean(verified)
    );
    if (!incident) throw new BadRequestError("Incident not found");
    await writeAudit(db, ctx, {
      action: "neo_incident_resolved",
      entity: "neo_incident",
      entityId: incidentId,
      metadata: { verified: Boolean(verified) },
    });
    return reply.send(incident);
  }
}
