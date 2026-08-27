/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll } from "vitest";
import { createFakeDb } from "../helpers/fake-db";
import { MetaRepository } from "@/clinic/modules/meta/meta.repository";
import { MetaTokenService } from "@/clinic/modules/meta/meta-token.service";
import { MetaLeadService } from "@/clinic/modules/meta/meta-lead.service";
import { MetaWebhookService } from "@/clinic/modules/meta/meta-webhook.service";
import { MetaCampaignService } from "@/clinic/modules/meta/meta-campaign.service";
import { LeadRepository } from "@/clinic/modules/leads/leads.repository";
import { MetaAnalyticsService } from "@/clinic/modules/meta/meta-analytics.service";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import type { Db } from "mongodb";

const CLINIC_A = "clc_A";
const CLINIC_B = "clc_B";
const APP_SECRET = "webhook-secret-for-signing";

/** Minimal stub of MetaApiClient that returns a canned lead detail. */
function fakeClient(leadDetail: Record<string, any>): any {
  return {
    get: async (_path: string, _token: string, _q?: any) => leadDetail,
  };
}

beforeAll(() => {
  process.env.META_TOKEN_SECRET = "test-secret-at-least-16-bytes-long";
});

function seedMeta(db: Db, clinicId: string, pageId: string, metaLeadId: string) {
  const repo = new MetaRepository(db);
  return (async () => {
    await repo.upsertIntegration(clinicId, {
      metaBusinessId: `biz_${clinicId}`,
      metaBusinessName: `Business ${clinicId}`,
      status: "connected",
    });
    await repo.upsertPage(clinicId, `mta_${clinicId}`, { pageId, pageName: `Page ${clinicId}` });
    await repo.upsertAdAccount(clinicId, `mta_${clinicId}`, { adAccountId: `act_${clinicId}`, name: "Ads" });
    await repo.upsertForm(clinicId, `mta_${clinicId}`, pageId, { formId: `form_${clinicId}`, formName: "Form" });
  })();
}

describe("Meta cross-clinic isolation (section 45/47)", () => {
  it("Clinic A cannot access Clinic B integration record", async () => {
    const { db } = createFakeDb();
    await seedMeta(db, CLINIC_A, "page_A", "lead_A");
    await seedMeta(db, CLINIC_B, "page_B", "lead_B");
    const repo = new MetaRepository(db);
    const a = await repo.getIntegration(CLINIC_A);
    const b = await repo.getIntegration(CLINIC_B);
    expect(a?.metaBusinessId).toBe("biz_clc_A");
    expect(b?.metaBusinessId).toBe("biz_clc_B");
    // A's record must not contain B's business id.
    expect(a?.metaBusinessId).not.toBe("biz_clc_B");
  });

  it("Clinic A cannot access Clinic B pages / ad accounts / forms", async () => {
    const { db } = createFakeDb();
    await seedMeta(db, CLINIC_A, "page_A", "lead_A");
    await seedMeta(db, CLINIC_B, "page_B", "lead_B");
    const repo = new MetaRepository(db);
    const pagesA = await repo.listPages(CLINIC_A);
    const pagesB = await repo.listPages(CLINIC_B);
    expect(pagesA.map((p) => p.pageId)).toEqual(["page_A"]);
    expect(pagesB.map((p) => p.pageId)).toEqual(["page_B"]);
    expect(pagesA.find((p) => p.pageId === "page_B")).toBeUndefined();
  });

  it("Clinic A cannot read Clinic B's stored Meta token", async () => {
    const { db } = createFakeDb();
    const tokenSvc = new MetaTokenService(db, null);
    await tokenSvc.storeToken(CLINIC_A, "secret-token-A", 3600, ["leads_retrieval"]);
    // Querying B's token returns null — no cross-tenant secret leakage.
    const bToken = await tokenSvc.getDecryptedToken(CLINIC_B);
    expect(bToken).toBeNull();
    const aToken = await tokenSvc.getDecryptedToken(CLINIC_A);
    expect(aToken).toBe("secret-token-A");
  });

  it("Clinic A cannot access Clinic B Meta leads", async () => {
    const { db } = createFakeDb();
    const leadRepoA = new LeadRepository(db, CLINIC_A);
    const leadRepoB = new LeadRepository(db, CLINIC_B);
    await leadRepoA.create({
      leadId: "led_A1",
      source: "meta_facebook",
      sourceRef: "meta:lead_A",
      name: "A Lead",
      phone: null,
      email: null,
      formAnswers: {},
      consent: null,
      status: "new",
      priority: "normal",
      department: null,
      service: null,
      team: null,
      assignedTo: null,
      assignedAt: null,
      receivedAt: new Date(),
      firstResponseAt: null,
      firstContactAt: null,
      contactAttempts: 0,
      appointmentBookedAt: null,
      convertedAt: null,
    });
    const aLeads = await leadRepoA.list();
    const bLeads = await leadRepoB.list();
    expect(aLeads).toHaveLength(1);
    expect(bLeads).toHaveLength(0);
    expect(aLeads[0].sourceRef).toBe("meta:lead_A");
    // A cannot fetch B's lead by sourceRef (scoped query).
    expect(await leadRepoB.findBySourceRef("meta:lead_A")).toBeNull();
  });

  it("Clinic A cannot view Clinic B Meta analytics", async () => {
    const { db } = createFakeDb();
    const leadRepoA = new LeadRepository(db, CLINIC_A);
    const analyticsA = new MetaAnalyticsService(db);
    const analyticsB = new MetaAnalyticsService(db);
    await leadRepoA.create({
      leadId: "led_A1",
      source: "meta_facebook",
      sourceRef: "meta:lead_A",
      name: null, phone: null, email: null,
      formAnswers: {}, consent: null, status: "converted",
      priority: "normal", department: null, service: null, team: null,
      assignedTo: null, assignedAt: null, receivedAt: new Date(),
      firstResponseAt: null, firstContactAt: null, contactAttempts: 0,
      appointmentBookedAt: null, convertedAt: new Date(),
    });
    // Analytics is computed from tenant-scoped attributions.
    await new MetaRepository(db).upsertAttribution(CLINIC_A, {
      attributionId: "mat_1",
      leadId: "led_A1",
      metaLeadId: "lead_A",
      businessId: "biz_A",
      pageId: "page_A",
      instagramAccountId: null,
      adAccountId: null,
      campaignId: "camp_1",
      campaignName: "Dental",
      adsetId: null,
      adsetName: null,
      adId: null,
      adName: null,
      formId: "form_A",
      formName: "Form A",
      platform: "facebook",
      submittedAt: new Date(),
    });
    const a = await analyticsA.compute(CLINIC_A);
    const b = await analyticsB.compute(CLINIC_B);
    expect(a.totalMetaLeads).toBe(1);
    expect(a.convertedLeads).toBe(1);
    expect(b.totalMetaLeads).toBe(0);
  });

  it("webhook events resolve to the asset OWNER, never a caller-chosen clinic", async () => {
    const { db } = createFakeDb();
    await seedMeta(db, CLINIC_A, "page_A", "lead_A");
    await seedMeta(db, CLINIC_B, "page_B", "lead_B");
    // An event for page_B is ALWAYS attributed to B, regardless of who
    // "triggers" ingestion — the clinic is derived from the Meta asset.
    const webhook = new MetaWebhookService(db, null, APP_SECRET);
    const forB = await webhook.receiveLeadgen("page_B", "lead_B", "evt_1", {});
    const forA = await webhook.receiveLeadgen("page_A", "lead_A", "evt_2", {});
    expect(forB?.clinicId).toBe(CLINIC_B);
    expect(forA?.clinicId).toBe(CLINIC_A);
    // No path lets page_B's event land in Clinic A's tenant.
    expect(forB?.clinicId).not.toBe(CLINIC_A);
  });
});

describe("Meta webhook security & idempotency (section 34/47)", () => {
  it("rejects webhook payloads with an invalid signature", () => {
    const { db } = createFakeDb();
    const webhook = new MetaWebhookService(db, null, APP_SECRET);
    const body = Buffer.from(JSON.stringify({ entry: [] }));
    const good = webhook.verifySignature(body, `sha256=${hmac(body, APP_SECRET)}`);
    const bad = webhook.verifySignature(body, "sha256=deadbeef");
    expect(good).toBe(true);
    expect(bad).toBe(false);
  });

  it("does not create duplicate leads from duplicate webhook events", async () => {
    const { db } = createFakeDb();
    await seedMeta(db, CLINIC_A, "page_A", "lead_A");
    const tokenSvc = new MetaTokenService(db, null);
    await tokenSvc.storeToken(CLINIC_A, "tok", 3600, []);
    const leadSvc = new MetaLeadService(db, fakeClient(leadDetail("lead_A", "page_A")));
    const webhook = new MetaWebhookService(db, fakeClient(leadDetail("lead_A", "page_A")), APP_SECRET);

    const r1 = await webhook.receiveLeadgen("page_A", "lead_A", "evt_1", {});
    await webhook.processEvent(r1!.eventKey);
    const r2 = await webhook.receiveLeadgen("page_A", "lead_A", "evt_1", {});
    // Second receive is recognized as already-existing (no new event row).
    expect(r2?.alreadyExists).toBe(true);

    const leadRepo = new LeadRepository(db, CLINIC_A);
    const leads = await leadRepo.list();
    expect(leads).toHaveLength(1);
  });

  it("preserves idempotency via sourceRef when ingesting the same lead twice", async () => {
    const { db } = createFakeDb();
    await seedMeta(db, CLINIC_A, "page_A", "lead_A");
    const tokenSvc = new MetaTokenService(db, null);
    await tokenSvc.storeToken(CLINIC_A, "tok", 3600, []);
    const leadSvc = new MetaLeadService(db, fakeClient(leadDetail("lead_A", "page_A")));
    const first = await leadSvc.ingestLead(CLINIC_A, "lead_A");
    const second = await leadSvc.ingestLead(CLINIC_A, "lead_A");
    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    const leadRepo = new LeadRepository(db, CLINIC_A);
    expect(await leadRepo.list()).toHaveLength(1);
  });
});

describe("Meta token & disconnect behaviour (section 43/44/47)", () => {
  it("marks expired tokens and requires reauthorization", async () => {
    const { db } = createFakeDb();
    const tokenSvc = new MetaTokenService(db, null);
    await tokenSvc.storeToken(CLINIC_A, "tok", -10 /* already expired */, []);
    const health = await tokenSvc.health(CLINIC_A);
    expect(health.tokenExpired).toBe(true);
    expect(health.status).toBe("reauthorization_required");
    expect(health.issues.length).toBeGreaterThan(0);
  });

  it("disconnecting Meta wipes credentials but preserves historical leads", async () => {
    const { db } = createFakeDb();
    const tokenSvc = new MetaTokenService(db, null);
    await tokenSvc.storeToken(CLINIC_A, "tok", 3600, []);
    const leadRepo = new LeadRepository(db, CLINIC_A);
    await leadRepo.create({
      leadId: "led_A1", source: "meta_facebook", sourceRef: "meta:lead_A",
      name: null, phone: null, email: null, formAnswers: {}, consent: null,
      status: "new", priority: "normal", department: null, service: null, team: null,
      assignedTo: null, assignedAt: null, receivedAt: new Date(),
      firstResponseAt: null, firstContactAt: null, contactAttempts: 0,
      appointmentBookedAt: null, convertedAt: null,
    });
    await tokenSvc.disconnect(CLINIC_A);
    // Token gone.
    expect(await tokenSvc.getDecryptedToken(CLINIC_A)).toBeNull();
    const integration = await new MetaRepository(db).getIntegration(CLINIC_A);
    expect(integration?.status).toBe("disconnected");
    // Historical leads preserved.
    expect(await leadRepo.list()).toHaveLength(1);
  });
});

describe("Meta lead ownership (section 47)", () => {
  it("assigns an ingested lead to the resolved (correct) clinic only", async () => {
    const { db } = createFakeDb();
    await seedMeta(db, CLINIC_A, "page_A", "lead_A");
    const tokenSvc = new MetaTokenService(db, null);
    await tokenSvc.storeToken(CLINIC_A, "tok", 3600, []);
    const leadSvc = new MetaLeadService(db, fakeClient(leadDetail("lead_A", "page_A")));
    const result = await leadSvc.ingestLead(CLINIC_A, "lead_A");
    expect(result.lead?.clinicId).toBe(CLINIC_A);
    expect(result.attribution?.clinicId).toBe(CLINIC_A);
    const attr = await new MetaRepository(db).getAttributionByLead(CLINIC_A, result.lead!.leadId);
    expect(attr?.pageId).toBe("page_A");
  });
});

function hmac(buf: Buffer, secret: string): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createHmac } = require("node:crypto");
  return createHmac("sha256", secret).update(buf).digest("hex");
}

function leadDetail(metaLeadId: string, pageId: string): Record<string, any> {
  return {
    id: metaLeadId,
    created_time: new Date().toISOString(),
    form_id: `form_${pageId}`,
    page_id: pageId,
    campaign_id: "camp_1",
    campaign: { name: "Dental Campaign" },
    adset_id: "adset_1",
    adset: { name: "Chennai Dental" },
    ad_id: "ad_1",
    ad: { name: "Implant Offer" },
    platform: "facebook",
    field_data: [
      { name: "full_name", values: ["Test User"] },
      { name: "email", values: ["test@example.com"] },
      { name: "phone", values: ["+919999999999"] },
    ],
  };
}
