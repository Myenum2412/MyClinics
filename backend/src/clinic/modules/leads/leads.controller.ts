import type { FastifyReply, FastifyRequest } from "fastify";
import { getDb } from "@/lib/db-pools";
import { type ClinicContext } from "@/clinic/core/context";
import { UnauthorizedError, BadRequestError } from "@/clinic/core/errors";
import { requireClinicOf } from "@/clinic/core/context";
import { LeadService } from "@/clinic/modules/leads/leads.service";
import { MetaRepository } from "@/clinic/modules/meta/meta.repository";
import {
  leadToPublic,
  type LeadStatus,
} from "@/clinic/modules/leads/leads.schema";
import {
  metaAttributionToPublic,
  metaWhatsappFollowupToPublic,
} from "@/clinic/modules/meta/meta-schema";

export class LeadController {
  private async db() {
    return getDb();
  }

  private service(db: Awaited<ReturnType<typeof getDb>>) {
    return new LeadService(db);
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const db = await this.db();
    const query = request.query as { status?: string; assignedTo?: string };
    const leads = await this.service(db).listLeads(ctx, {
      status: query.status as LeadStatus | undefined,
      assignedTo: query.assignedTo,
    });
    return reply.send({ leads: leads.map(leadToPublic) });
  }

  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const body = (request.body ?? {}) as Record<string, unknown>;
    const db = await this.db();
    const lead = await this.service(db).createLead(ctx, {
      name: typeof body.name === "string" ? body.name : null,
      phone: typeof body.phone === "string" ? body.phone : null,
      email: typeof body.email === "string" ? body.email : null,
      source: "manual",
      department: typeof body.department === "string" ? body.department : null,
      service: typeof body.service === "string" ? body.service : null,
      team: typeof body.team === "string" ? body.team : null,
      assignedTo: typeof body.assignedTo === "string" ? body.assignedTo : null,
    });
    return reply.code(201).send(leadToPublic(lead));
  }

  async get(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic as ClinicContext;
    if (!ctx) throw new UnauthorizedError();
    const { leadId } = request.params as { leadId: string };
    const db = await this.db();
    const lead = await this.service(db).getLead(ctx, leadId);
    const repo = new MetaRepository(db);
    const clinicId = requireClinicOf(ctx);
    const [attribution, followup] = await Promise.all([
      repo.getAttributionByLead(clinicId, leadId),
      repo.getWhatsappFollowup(clinicId, leadId),
    ]);
    return reply.send({
      lead: leadToPublic(lead),
      attribution: attribution ? metaAttributionToPublic(attribution) : null,
      whatsappFollowup: followup ? metaWhatsappFollowupToPublic(followup) : null,
    });
  }

  async assign(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { leadId } = request.params as { leadId: string };
    const body = (request.body ?? {}) as Record<string, unknown>;
    if (typeof body.assignedTo !== "string") throw new BadRequestError("assignedTo required");
    const db = await this.db();
    await this.service(db).assign(ctx, leadId, body.assignedTo);
    return reply.send({ ok: true });
  }

  async markContacted(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { leadId } = request.params as { leadId: string };
    const db = await this.db();
    await this.service(db).markContacted(ctx, leadId);
    return reply.send({ ok: true });
  }

  async bookAppointment(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { leadId } = request.params as { leadId: string };
    const db = await this.db();
    await this.service(db).bookAppointment(ctx, leadId);
    return reply.send({ ok: true });
  }

  async convert(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { leadId } = request.params as { leadId: string };
    const db = await this.db();
    await this.service(db).convert(ctx, leadId);
    return reply.send({ ok: true });
  }

  async workflowStats(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const db = await this.db();
    const stats = await this.service(db).workflowStats(ctx);
    return reply.send(stats);
  }

  /** Section 40 — WhatsApp follow-up metadata (minimal, tenant-scoped). */
  async upsertWhatsappFollowup(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { leadId } = request.params as { leadId: string };
    const body = (request.body ?? {}) as Record<string, unknown>;
    const db = await this.db();
    const repo = new MetaRepository(db);
    await repo.upsertWhatsappFollowup(requireClinicOf(ctx), leadId, {
      waBusinessId: typeof body.waBusinessId === "string" ? body.waBusinessId : null,
      conversationRef: typeof body.conversationRef === "string" ? body.conversationRef : null,
      messageStatus: typeof body.messageStatus === "string" ? body.messageStatus : null,
      assignedStaffId: typeof body.assignedStaffId === "string" ? body.assignedStaffId : null,
      status: typeof body.status === "string" ? (body.status as never) : "pending",
      lastContactedAt:
        typeof body.lastContactedAt === "string" ? new Date(body.lastContactedAt) : null,
    });
    const followup = await repo.getWhatsappFollowup(requireClinicOf(ctx), leadId);
    return reply.send(followup ? metaWhatsappFollowupToPublic(followup) : { ok: true });
  }
}
