import type { Db, WithId } from "mongodb";
import { requireClinicOf, type ClinicContext } from "@/clinic/core/context";
import { BadRequestError, NotFoundError } from "@/clinic/core/errors";
import { generateUuid } from "@/clinic/core/ids";
import { LeadRepository } from "@/clinic/modules/leads/leads.repository";
import type { LeadDoc, LeadPriority, LeadStatus } from "@/clinic/modules/leads/leads.schema";

export interface CreateLeadInput {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  source?: LeadDoc["source"];
  sourceRef?: string | null;
  formAnswers?: Record<string, string>;
  consent?: Record<string, unknown> | null;
  priority?: LeadPriority;
  department?: string | null;
  service?: string | null;
  team?: string | null;
  assignedTo?: string | null;
}

export interface LeadWorkflowStats {
  totalLeads: number;
  metaLeads: number;
  appointmentsBooked: number;
  converted: number;
  avgFirstResponseMs: number | null;
  leadToAppointmentRate: number;
}

export class LeadService {
  constructor(private readonly db: Db) {}

  private repo(ctx: ClinicContext): LeadRepository {
    return new LeadRepository(this.db, requireClinicOf(ctx));
  }

  async createLead(ctx: ClinicContext, input: CreateLeadInput): Promise<WithId<LeadDoc>> {
    if (!input.name && !input.phone && !input.email) {
      throw new BadRequestError("A lead requires at least a name, phone, or email");
    }
    const now = new Date();
    const lead = await this.repo(ctx).create({
      leadId: `led_${generateUuid().slice(0, 12)}`,
      source: input.source ?? "manual",
      sourceRef: input.sourceRef ?? null,
      name: input.name ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      formAnswers: input.formAnswers ?? {},
      consent: input.consent ?? null,
      status: "new",
      priority: input.priority ?? "normal",
      department: input.department ?? null,
      service: input.service ?? null,
      team: input.team ?? null,
      assignedTo: input.assignedTo ?? null,
      assignedAt: input.assignedTo ? now : null,
      receivedAt: now,
      firstResponseAt: null,
      firstContactAt: null,
      contactAttempts: 0,
      appointmentBookedAt: null,
      convertedAt: null,
    });
    return lead;
  }

  async listLeads(ctx: ClinicContext, filter: { status?: LeadStatus; assignedTo?: string } = {}, limit = 100) {
    return this.repo(ctx).list(filter, limit);
  }

  async getLead(ctx: ClinicContext, leadId: string): Promise<WithId<LeadDoc>> {
    const lead = await this.repo(ctx).getByLeadId(leadId);
    if (!lead) throw new NotFoundError("Lead not found");
    return lead;
  }

  async assign(ctx: ClinicContext, leadId: string, assignedTo: string): Promise<void> {
    const ok = await this.repo(ctx).update(leadId, {
      assignedTo,
      assignedAt: new Date(),
    });
    if (!ok) throw new NotFoundError("Lead not found");
  }

  async markContacted(ctx: ClinicContext, leadId: string): Promise<void> {
    const lead = await this.getLead(ctx, leadId);
    const update: Partial<LeadDoc> = { status: lead.status === "new" ? "contacted" : lead.status };
    if (!lead.firstContactAt) update.firstContactAt = new Date();
    if (!lead.firstResponseAt) update.firstResponseAt = new Date();
    if (!lead.contactAttempts) update.contactAttempts = 1;
    else update.contactAttempts = lead.contactAttempts + 1;
    await this.repo(ctx).update(leadId, update);
  }

  async bookAppointment(ctx: ClinicContext, leadId: string): Promise<void> {
    const lead = await this.getLead(ctx, leadId);
    await this.repo(ctx).update(leadId, {
      status: "appointment",
      appointmentBookedAt: lead.appointmentBookedAt ?? new Date(),
    });
  }

  async convert(ctx: ClinicContext, leadId: string): Promise<void> {
    await this.repo(ctx).update(leadId, { status: "converted", convertedAt: new Date() });
  }

  /** Workflow analytics for section 38 (response times, conversion rates). */
  async workflowStats(ctx: ClinicContext): Promise<LeadWorkflowStats> {
    const repo = this.repo(ctx);
    const [all, fb, ig, appt, converted] = await Promise.all([
      repo.count(),
      repo.count({ source: "meta_facebook" }),
      repo.count({ source: "meta_instagram" }),
      repo.count({ appointmentBookedAt: { $ne: null } }),
      repo.count({ status: "converted" }),
    ]);
    const leads = await repo.list({}, 10000);
    const responded = leads.filter((l) => l.firstResponseAt);
    let avgFirstResponseMs: number | null = null;
    if (responded.length > 0) {
      const sum = responded.reduce(
        (acc, l) => acc + (l.firstResponseAt!.getTime() - l.receivedAt.getTime()),
        0
      );
      avgFirstResponseMs = Math.round(sum / responded.length);
    }
    return {
      totalLeads: all,
      metaLeads: fb + ig,
      appointmentsBooked: appt,
      converted,
      avgFirstResponseMs,
      leadToAppointmentRate: all > 0 ? Number(((appt / all) * 100).toFixed(2)) : 0,
    };
  }
}
