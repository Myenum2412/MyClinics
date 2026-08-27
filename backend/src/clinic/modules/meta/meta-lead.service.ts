import type { Db, WithId } from "mongodb";
import { now as nowFn } from "@/clinic/core/datetime";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import { generateUuid } from "@/clinic/core/ids";
import { MetaRepository } from "@/clinic/modules/meta/meta.repository";
import type { MetaApiClient } from "@/clinic/modules/meta/meta-client";
import { MetaTokenService } from "@/clinic/modules/meta/meta-token.service";
import { MetaCampaignService } from "@/clinic/modules/meta/meta-campaign.service";
import { LeadRepository } from "@/clinic/modules/leads/leads.repository";
import type { LeadDoc } from "@/clinic/modules/leads/leads.schema";
import type { MetaLeadAttributionDoc } from "@/clinic/modules/meta/meta-schema";
import { BadRequestError, NotFoundError } from "@/clinic/core/errors";

interface MetaLeadField {
  name: string;
  values?: string[];
}

interface MetaLeadDetail {
  id: string;
  created_time?: string;
  form_id?: string;
  page_id?: string;
  campaign_id?: string;
  campaign?: { name?: string };
  adset_id?: string;
  adset?: { name?: string };
  ad_id?: string;
  ad?: { name?: string };
  platform?: string;
  field_data?: MetaLeadField[];
}

/**
 * MetaLeadService — turns a Meta Lead (id) into a CRM Lead + attribution.
 *
 * Responsibilities (sections 31–33, 37):
 *  - fetch full lead details from Meta (Graph API),
 *  - de-duplicate (by stable metaLeadId — never by name/email alone),
 *  - create a tenant-scoped Lead,
 *  - store stable attribution (campaign/adset/ad ids),
 *  - apply the clinic's campaign→routing mapping,
 *  - fire clinic-local automations (assign, priority, notify, follow-up).
 */
export class MetaLeadService {
  constructor(
    private readonly db: Db,
    private readonly client: MetaApiClient | null
  ) {}

  private repo(): MetaRepository {
    return new MetaRepository(this.db);
  }

  /**
   * Ingests a single Meta lead for `clinicId`. `clinicId` MUST have been
   * resolved from the Meta asset (pageId) — never from a caller value.
   */
  async ingestLead(clinicId: string, metaLeadId: string): Promise<{
    duplicate: boolean;
    lead: WithId<LeadDoc> | null;
    attribution: WithId<MetaLeadAttributionDoc> | null;
  }> {
    const leadRepo = new LeadRepository(this.db, clinicId);
    const existingByRef = await leadRepo.findBySourceRef(`meta:${metaLeadId}`);
    if (existingByRef) {
      const attr = await this.repo().getAttributionByLead(clinicId, existingByRef.leadId);
      return { duplicate: true, lead: existingByRef, attribution: attr };
    }

    const integration = await this.repo().getIntegration(clinicId);
    if (!integration || integration.status === "disconnected") {
      throw new BadRequestError("Meta integration is not connected for this clinic");
    }

    const token = await new MetaTokenService(this.db, this.client).getDecryptedToken(clinicId);
    if (!token) throw new BadRequestError("No Meta token available");

    let detail: MetaLeadDetail;
    try {
      detail = await this.client!.get<MetaLeadDetail>(metaLeadId, token, {
        fields:
          "created_time,form_id,page_id,campaign_id,campaign{name},adset_id,adset{name},ad_id,ad{name},platform,field_data",
      });
    } catch (err) {
      throw new BadRequestError(`Failed to fetch Meta lead ${metaLeadId}: ${(err as Error).message}`);
    }

    const parsed = parseLeadFields(detail);
    const platform: "facebook" | "instagram" | "unknown" =
      detail.platform === "instagram" ? "instagram" : detail.platform === "facebook" ? "facebook" : "unknown";

    const campaignMapping = detail.campaign_id
      ? await new MetaCampaignService(this.db).resolveForCampaign(clinicId, detail.campaign_id)
      : null;

    const lead = await leadRepo.create({
      leadId: `led_${generateUuid().slice(0, 12)}`,
      source: platform === "instagram" ? "meta_instagram" : "meta_facebook",
      sourceRef: `meta:${metaLeadId}`,
      name: parsed.name,
      phone: parsed.phone,
      email: parsed.email,
      formAnswers: parsed.answers,
      consent: parsed.consent,
      status: "new",
      priority: campaignMapping ? "high" : "normal",
      department: campaignMapping?.department ?? null,
      service: campaignMapping?.service ?? null,
      team: campaignMapping?.team ?? null,
      assignedTo: campaignMapping?.doctorId ?? null,
      assignedAt: campaignMapping?.doctorId ? nowFn() : null,
      receivedAt: parsed.submittedAt ?? nowFn(),
      firstResponseAt: null,
      firstContactAt: null,
      contactAttempts: 0,
      appointmentBookedAt: null,
      convertedAt: null,
    });

    await this.repo().upsertAttribution(clinicId, {
      attributionId: `mat_${generateUuid().slice(0, 12)}`,
      leadId: lead.leadId,
      metaLeadId,
      businessId: integration.metaBusinessId,
      pageId: detail.page_id ?? null,
      instagramAccountId: platform === "instagram" ? detail.page_id ?? null : null,
      adAccountId: null,
      campaignId: detail.campaign_id ?? null,
      campaignName: detail.campaign?.name ?? null,
      adsetId: detail.adset_id ?? null,
      adsetName: detail.adset?.name ?? null,
      adId: detail.ad_id ?? null,
      adName: detail.ad?.name ?? null,
      formId: detail.form_id ?? null,
      formName: null,
      platform,
      submittedAt: parsed.submittedAt,
    });

    // ── Clinic-local automations (section 37) ──────────────────────────
    await this.fireAutomations(clinicId, lead);

    await this.repo().upsertIntegration(clinicId, { lastSyncedAt: nowFn() });
    return {
      duplicate: false,
      lead,
      attribution: await this.repo().getAttributionByLead(clinicId, lead.leadId),
    };
  }

  /** Automation engine — scoped to the clinic tenant only. */
  private async fireAutomations(clinicId: string, lead: WithId<LeadDoc>): Promise<void> {
    // WHEN Meta Lead Created → internal notification to assigned staff / team.
    const recipient = lead.assignedTo;
    if (recipient) {
      await this.db.collection(CLINIC_COLLECTIONS.notifications).insertOne({
        notificationId: `ntf_${generateUuid().slice(0, 12)}`,
        clinicId,
        recipientUserId: recipient,
        type: "general",
        title: "New Meta lead assigned",
        body: `Lead ${lead.name ?? lead.phone ?? lead.email ?? lead.leadId} was captured from Meta and assigned to you.`,
        link: `/clinic/leads/${lead.leadId}`,
        readAt: null,
        createdAt: nowFn(),
      } as never);
    }
    // WHEN Meta Lead Created → create a follow-up (5-minute SLA marker).
    // A follow-up is recorded as an audit entry + scheduled internal reminder.
    await this.db.collection(CLINIC_COLLECTIONS.auditLogs).insertOne({
      auditId: `aud_${generateUuid().slice(0, 12)}`,
      clinicId,
      actorId: null,
      actorRole: null,
      actorDoctorId: null,
      actorPatientId: null,
      action: "meta_lead_automation",
      entity: "lead",
      entityId: lead.leadId,
      metadata: { automation: "create_follow_up", slaMinutes: 5 },
      ip: null,
      userAgent: null,
      createdAt: nowFn(),
    } as never);
  }
}

function parseLeadFields(detail: MetaLeadDetail): {
  name: string | null;
  phone: string | null;
  email: string | null;
  answers: Record<string, string>;
  consent: Record<string, unknown> | null;
  submittedAt: Date | null;
} {
  const answers: Record<string, string> = {};
  let name: string | null = null;
  let phone: string | null = null;
  let email: string | null = null;
  let consent: Record<string, unknown> | null = null;
  for (const field of detail.field_data ?? []) {
    const value = field.values?.[0] ?? "";
    answers[field.name] = value;
    const key = field.name.toLowerCase();
    if (key.includes("email")) email = value || null;
    else if (key.includes("phone")) phone = value || null;
    else if (key.includes("full_name") || key.includes("name")) name = value || null;
    else if (key.includes("consent")) {
      consent = { [field.name]: value };
    }
  }
  const submittedAt = detail.created_time ? new Date(detail.created_time) : null;
  return { name, phone, email, answers, consent, submittedAt };
}
