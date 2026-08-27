import type { Db, WithId } from "mongodb";
import { now as nowFn } from "@/clinic/core/datetime";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import type {
  MetaAdAccountDoc,
  MetaCampaignMappingDoc,
  MetaInstagramAccountDoc,
  MetaIntegrationDoc,
  MetaLeadAttributionDoc,
  MetaLeadFormDoc,
  MetaPageDoc,
  MetaSyncJobDoc,
  MetaWebhookEventDoc,
  MetaWhatsappDoc,
  MetaWhatsappFollowupDoc,
} from "@/clinic/modules/meta/meta-schema";

/**
 * Repository for every Meta integration collection.
 *
 * Two kinds of queries live here:
 *  - tenant-scoped (clinicId injected) — used by normal clinic requests
 *  - asset-resolution (by Meta asset id, NO clinicId filter) — used ONLY by
 *    the webhook gateway to resolve which clinic owns an event. The resolved
 *    clinicId is then re-validated before any write.
 */
export class MetaRepository {
  constructor(private readonly db: Db) {}

  // ── Integration ──────────────────────────────────────────────────────
  integrations() {
    return this.db.collection<MetaIntegrationDoc>(CLINIC_COLLECTIONS.metaIntegrations);
  }
  async getIntegration(clinicId: string): Promise<WithId<MetaIntegrationDoc> | null> {
    return this.integrations().findOne({ clinicId });
  }
  async getIntegrationByBusiness(businessId: string): Promise<WithId<MetaIntegrationDoc> | null> {
    return this.integrations().findOne({ metaBusinessId: businessId });
  }
  async upsertIntegration(
    clinicId: string,
    data: Partial<Omit<MetaIntegrationDoc, "_id" | "clinicId" | "createdAt">>
  ): Promise<WithId<MetaIntegrationDoc>> {
    const now = nowFn();
    await this.integrations().updateOne(
      { clinicId },
      {
        $set: { ...data, updatedAt: now },
        $setOnInsert: {
          clinicId,
          integrationId: `mta_${randomSuffix()}`,
          createdAt: now,
        },
      },
      { upsert: true }
    );
    return (await this.integrations().findOne({ clinicId })) as WithId<MetaIntegrationDoc>;
  }

  // ── Pages ─────────────────────────────────────────────────────────────
  pages() {
    return this.db.collection<MetaPageDoc>(CLINIC_COLLECTIONS.metaPages);
  }
  async listPages(clinicId: string): Promise<WithId<MetaPageDoc>[]> {
    return this.pages().find({ clinicId }).sort({ pageName: 1 }).toArray();
  }
  async findByPageId(pageId: string): Promise<WithId<MetaPageDoc> | null> {
    return this.pages().findOne({ pageId });
  }
  async upsertPage(
    clinicId: string,
    metaIntegrationId: string,
    page: { pageId: string; pageName: string; category?: string | null }
  ): Promise<void> {
    await this.pages().updateOne(
      { clinicId, pageId: page.pageId },
      {
        $set: { pageName: page.pageName, category: page.category ?? null, status: "active", updatedAt: nowFn() },
        $setOnInsert: { clinicId, pageId: page.pageId, metaIntegrationId, createdAt: nowFn() },
      },
      { upsert: true }
    );
  }

  // ── Instagram ────────────────────────────────────────────────────────
  instagram() {
    return this.db.collection<MetaInstagramAccountDoc>(CLINIC_COLLECTIONS.metaInstagramAccounts);
  }
  async listInstagram(clinicId: string): Promise<WithId<MetaInstagramAccountDoc>[]> {
    return this.instagram().find({ clinicId }).sort({ username: 1 }).toArray();
  }
  async findByInstagramId(igId: string): Promise<WithId<MetaInstagramAccountDoc> | null> {
    return this.instagram().findOne({ instagramAccountId: igId });
  }
  async upsertInstagram(
    clinicId: string,
    metaIntegrationId: string,
    ig: { instagramAccountId: string; username?: string | null; name?: string | null }
  ): Promise<void> {
    await this.instagram().updateOne(
      { clinicId, instagramAccountId: ig.instagramAccountId },
      {
        $set: {
          username: ig.username ?? null,
          name: ig.name ?? null,
          status: "active",
          updatedAt: nowFn(),
        },
        $setOnInsert: { clinicId, instagramAccountId: ig.instagramAccountId, metaIntegrationId, createdAt: nowFn() },
      },
      { upsert: true }
    );
  }

  // ── Ad accounts ──────────────────────────────────────────────────────
  adAccounts() {
    return this.db.collection<MetaAdAccountDoc>(CLINIC_COLLECTIONS.metaAdAccounts);
  }
  async listAdAccounts(clinicId: string): Promise<WithId<MetaAdAccountDoc>[]> {
    return this.adAccounts().find({ clinicId }).sort({ name: 1 }).toArray();
  }
  async findByAdAccountId(adAccountId: string): Promise<WithId<MetaAdAccountDoc> | null> {
    return this.adAccounts().findOne({ adAccountId });
  }
  async upsertAdAccount(
    clinicId: string,
    metaIntegrationId: string,
    ad: { adAccountId: string; name?: string | null; accountId?: string | null; currency?: string | null }
  ): Promise<void> {
    await this.adAccounts().updateOne(
      { clinicId, adAccountId: ad.adAccountId },
      {
        $set: {
          name: ad.name ?? null,
          accountId: ad.accountId ?? null,
          currency: ad.currency ?? null,
          status: "active",
          updatedAt: nowFn(),
        },
        $setOnInsert: { clinicId, adAccountId: ad.adAccountId, metaIntegrationId, createdAt: nowFn() },
      },
      { upsert: true }
    );
  }

  // ── Lead forms ───────────────────────────────────────────────────────
  forms() {
    return this.db.collection<MetaLeadFormDoc>(CLINIC_COLLECTIONS.metaLeadForms);
  }
  async listForms(clinicId: string): Promise<WithId<MetaLeadFormDoc>[]> {
    return this.forms().find({ clinicId }).sort({ formName: 1 }).toArray();
  }
  async findByFormId(formId: string): Promise<WithId<MetaLeadFormDoc> | null> {
    return this.forms().findOne({ formId });
  }
  async upsertForm(
    clinicId: string,
    metaIntegrationId: string,
    metaPageId: string,
    form: { formId: string; formName: string }
  ): Promise<void> {
    await this.forms().updateOne(
      { clinicId, formId: form.formId },
      {
        $set: { formName: form.formName, metaPageId, status: "active", updatedAt: nowFn() },
        $setOnInsert: { clinicId, formId: form.formId, metaIntegrationId, createdAt: nowFn() },
      },
      { upsert: true }
    );
  }

  // ── WhatsApp Business ────────────────────────────────────────────────
  whatsapp() {
    return this.db.collection<MetaWhatsappDoc>(CLINIC_COLLECTIONS.metaWhatsapp);
  }
  async listWhatsapp(clinicId: string): Promise<WithId<MetaWhatsappDoc>[]> {
    return this.whatsapp().find({ clinicId }).toArray();
  }

  // ── WhatsApp follow-ups (section 40) ─────────────────────────────────
  whatsappFollowups() {
    return this.db.collection<MetaWhatsappFollowupDoc>(CLINIC_COLLECTIONS.metaWhatsappFollowups);
  }
  async upsertWhatsappFollowup(
    clinicId: string,
    leadId: string,
    data: Partial<Omit<MetaWhatsappFollowupDoc, "_id" | "clinicId" | "leadId" | "createdAt">>
  ): Promise<void> {
    await this.whatsappFollowups().updateOne(
      { clinicId, leadId },
      {
        $set: { ...data, updatedAt: nowFn() },
        $setOnInsert: { clinicId, leadId, createdAt: nowFn() },
      },
      { upsert: true }
    );
  }
  async getWhatsappFollowup(clinicId: string, leadId: string): Promise<WithId<MetaWhatsappFollowupDoc> | null> {
    return this.whatsappFollowups().findOne({ clinicId, leadId });
  }
  async upsertWhatsapp(
    clinicId: string,
    metaIntegrationId: string,
    wa: { waBusinessId: string; name?: string | null; phoneNumberId?: string | null }
  ): Promise<void> {
    await this.whatsapp().updateOne(
      { clinicId, waBusinessId: wa.waBusinessId },
      {
        $set: {
          name: wa.name ?? null,
          phoneNumberId: wa.phoneNumberId ?? null,
          status: "active",
          updatedAt: nowFn(),
        },
        $setOnInsert: { clinicId, waBusinessId: wa.waBusinessId, metaIntegrationId, createdAt: nowFn() },
      },
      { upsert: true }
    );
  }

  // ── Attributions ─────────────────────────────────────────────────────
  attributions() {
    return this.db.collection<MetaLeadAttributionDoc>(CLINIC_COLLECTIONS.metaLeadAttributions);
  }
  async getAttributionByLead(clinicId: string, leadId: string): Promise<WithId<MetaLeadAttributionDoc> | null> {
    return this.attributions().findOne({ clinicId, leadId });
  }
  async upsertAttribution(
    clinicId: string,
    attr: Omit<MetaLeadAttributionDoc, "_id" | "clinicId" | "createdAt">
  ): Promise<void> {
    await this.attributions().updateOne(
      { clinicId, metaLeadId: attr.metaLeadId },
      {
        $set: { ...attr, clinicId, createdAt: nowFn() },
        $setOnInsert: { clinicId, metaLeadId: attr.metaLeadId, leadId: attr.leadId, createdAt: nowFn() },
      },
      { upsert: true }
    );
  }

  // ── Campaign mappings ────────────────────────────────────────────────
  campaignMappings() {
    return this.db.collection<MetaCampaignMappingDoc>(CLINIC_COLLECTIONS.metaCampaignMappings);
  }
  async listCampaignMappings(clinicId: string): Promise<WithId<MetaCampaignMappingDoc>[]> {
    return this.campaignMappings().find({ clinicId }).toArray();
  }
  async getCampaignMapping(
    clinicId: string,
    metaCampaignId: string
  ): Promise<WithId<MetaCampaignMappingDoc> | null> {
    return this.campaignMappings().findOne({ clinicId, metaCampaignId });
  }
  async upsertCampaignMapping(
    clinicId: string,
    mapping: Omit<MetaCampaignMappingDoc, "_id" | "clinicId" | "createdAt" | "updatedAt">
  ): Promise<void> {
    await this.campaignMappings().updateOne(
      { clinicId, metaCampaignId: mapping.metaCampaignId },
      {
        $set: {
          metaCampaignName: mapping.metaCampaignName,
          department: mapping.department,
          service: mapping.service,
          team: mapping.team,
          doctorId: mapping.doctorId,
          pipeline: mapping.pipeline,
          updatedAt: nowFn(),
        },
        $setOnInsert: { clinicId, metaCampaignId: mapping.metaCampaignId, mappingId: mapping.mappingId, createdAt: nowFn() },
      },
      { upsert: true }
    );
  }
  async deleteCampaignMapping(clinicId: string, mappingId: string): Promise<boolean> {
    const r = await this.campaignMappings().deleteOne({ clinicId, mappingId });
    return r.deletedCount === 1;
  }

  // ── Webhook events (idempotent ingest + dead-letter) ─────────────────
  webhookEvents() {
    return this.db.collection<MetaWebhookEventDoc>(CLINIC_COLLECTIONS.metaWebhookEvents);
  }
  async findWebhookByKey(eventKey: string): Promise<WithId<MetaWebhookEventDoc> | null> {
    return this.webhookEvents().findOne({ eventKey });
  }
  async insertWebhookEvent(
    ev: Omit<MetaWebhookEventDoc, "_id" | "createdAt">
  ): Promise<WithId<MetaWebhookEventDoc> | null> {
    try {
      const r = await this.webhookEvents().insertOne({ ...ev, createdAt: nowFn() } as never);
      return (await this.webhookEvents().findOne({ _id: r.insertedId })) as WithId<MetaWebhookEventDoc>;
    } catch {
      // Duplicate key → already ingested: return existing.
      return this.findWebhookByKey(ev.eventKey);
    }
  }
  async updateWebhookEvent(
    eventKey: string,
    update: Partial<MetaWebhookEventDoc>
  ): Promise<void> {
    await this.webhookEvents().updateOne({ eventKey }, { $set: update });
  }
  async listWebhookEvents(clinicId: string, limit = 50): Promise<WithId<MetaWebhookEventDoc>[]> {
    return this.webhookEvents()
      .find({ clinicId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  // ── Sync jobs ────────────────────────────────────────────────────────
  syncJobs() {
    return this.db.collection<MetaSyncJobDoc>(CLINIC_COLLECTIONS.metaSyncJobs);
  }
  async createSyncJob(
    clinicId: string,
    job: Omit<MetaSyncJobDoc, "_id" | "clinicId" | "createdAt">
  ): Promise<WithId<MetaSyncJobDoc>> {
    const doc = { ...job, clinicId, createdAt: nowFn() } as never;
    const r = await this.syncJobs().insertOne(doc);
    return (await this.syncJobs().findOne({ _id: r.insertedId })) as WithId<MetaSyncJobDoc>;
  }
  async updateSyncJob(
    clinicId: string,
    syncJobId: string,
    update: Partial<MetaSyncJobDoc>
  ): Promise<void> {
    await this.syncJobs().updateOne({ clinicId, syncJobId }, { $set: update });
  }
  async listSyncJobs(clinicId: string, limit = 20): Promise<WithId<MetaSyncJobDoc>[]> {
    return this.syncJobs().find({ clinicId }).sort({ createdAt: -1 }).limit(limit).toArray();
  }
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 14);
}
