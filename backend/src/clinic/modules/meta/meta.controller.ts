import type { Db, WithId } from "mongodb";
import type { FastifyReply, FastifyRequest } from "fastify";
import { getDb } from "@/lib/db-pools";
import { requireClinicOf, type ClinicContext } from "@/clinic/core/context";
import { UnauthorizedError, NotFoundError, BadRequestError } from "@/clinic/core/errors";
import { MetaRepository } from "@/clinic/modules/meta/meta.repository";
import { MetaAuthService } from "@/clinic/modules/meta/meta-auth.service";
import { MetaTokenService } from "@/clinic/modules/meta/meta-token.service";
import { MetaCampaignService } from "@/clinic/modules/meta/meta-campaign.service";
import { MetaSyncService } from "@/clinic/modules/meta/meta-sync.service";
import { MetaAnalyticsService } from "@/clinic/modules/meta/meta-analytics.service";
import { MetaWebhookService } from "@/clinic/modules/meta/meta-webhook.service";
import { buildMetaClientForClinic } from "@/clinic/modules/meta/meta-config";
import {
  metaAdAccountToPublic,
  metaInstagramToPublic,
  metaIntegrationToPublic,
  metaLeadFormToPublic,
  metaPageToPublic,
  metaWhatsappToPublic,
  metaCampaignMappingToPublic,
  metaSyncJobToPublic,
  metaWebhookEventToPublic,
} from "@/clinic/modules/meta/meta-schema";

/**
 * Meta controller — clinic-level integration management (sections 28–46) and
 * platform-level oversight. Every clinic handler runs behind requireClinicAccess
 * so the URL clinicId is re-validated; platform handlers require platform_admin.
 */
export class MetaController {
  private get db(): Promise<Db> {
    return getDb();
  }

  private auth(db: Db) {
    return new MetaAuthService(db);
  }
  private async tokenSvc(db: Db, clinicId: string) {
    return new MetaTokenService(db, await buildMetaClientForClinic(db, clinicId));
  }
  private campaignSvc(db: Db) {
    return new MetaCampaignService(db);
  }
  private async syncSvc(db: Db, clinicId: string) {
    return new MetaSyncService(db, await buildMetaClientForClinic(db, clinicId));
  }
  private analyticsSvc(db: Db) {
    return new MetaAnalyticsService(db);
  }

  // ── Clinic-level ───────────────────────────────────────────────────────
  async status(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const db = await this.db;
    const clinicId = requireClinicOf(ctx);
    const repo = new MetaRepository(db);
    const integration = await repo.getIntegration(clinicId);
    const health = await (await this.tokenSvc(db, clinicId)).health(clinicId);
    return reply.send({
      integration: integration ? metaIntegrationToPublic(integration) : null,
      health,
    });
  }

  async connect(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const db = await this.db;
    const clinicId = requireClinicOf(ctx);
    const body = (request.body ?? {}) as {
      appId?: unknown;
      appSecret?: unknown;
      redirectUri?: unknown;
    };
    const { authUrl, state } = await this.auth(db).beginConnect(clinicId, {
      appId: typeof body.appId === "string" && body.appId ? body.appId : undefined,
      appSecret: typeof body.appSecret === "string" && body.appSecret ? body.appSecret : undefined,
      redirectUri: typeof body.redirectUri === "string" ? body.redirectUri : undefined,
    });
    return reply.send({ authUrl, state });
  }

  async reconnect(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const db = await this.db;
    const { authUrl, state } = await this.auth(db).reconnect(requireClinicOf(ctx));
    return reply.send({ authUrl, state });
  }

  async disconnect(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const db = await this.db;
    const clinicId = requireClinicOf(ctx);
    await (await this.tokenSvc(db, clinicId)).disconnect(clinicId);
    return reply.send({ ok: true });
  }

  async assets(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const db = await this.db;
    const repo = new MetaRepository(db);
    const clinicId = requireClinicOf(ctx);
    const [pages, instagram, adAccounts, forms, whatsapp] = await Promise.all([
      repo.listPages(clinicId),
      repo.listInstagram(clinicId),
      repo.listAdAccounts(clinicId),
      repo.listForms(clinicId),
      repo.listWhatsapp(clinicId),
    ]);
    return reply.send({
      pages: pages.map(metaPageToPublic),
      instagram: instagram.map(metaInstagramToPublic),
      adAccounts: adAccounts.map(metaAdAccountToPublic),
      leadForms: forms.map(metaLeadFormToPublic),
      whatsapp: whatsapp.map(metaWhatsappToPublic),
    });
  }

  async listCampaignMappings(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const db = await this.db;
    const mappings = await this.campaignSvc(db).list(ctx);
    return reply.send({ mappings: mappings.map(metaCampaignMappingToPublic) });
  }

  async upsertCampaignMapping(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const body = (request.body ?? {}) as Record<string, unknown>;
    const db = await this.db;
    if (typeof body.metaCampaignId !== "string" || !body.metaCampaignId) {
      throw new BadRequestError("metaCampaignId is required");
    }
    const mapping = await this.campaignSvc(db).upsert(ctx, {
      metaCampaignId: body.metaCampaignId,
      metaCampaignName: typeof body.metaCampaignName === "string" ? body.metaCampaignName : null,
      department: typeof body.department === "string" ? body.department : null,
      service: typeof body.service === "string" ? body.service : null,
      team: typeof body.team === "string" ? body.team : null,
      doctorId: typeof body.doctorId === "string" ? body.doctorId : null,
      pipeline: typeof body.pipeline === "string" ? body.pipeline : null,
    });
    return reply.code(201).send(metaCampaignMappingToPublic(mapping));
  }

  async deleteCampaignMapping(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { mappingId } = request.params as { mappingId: string };
    const db = await this.db;
    await this.campaignSvc(db).remove(ctx, mappingId);
    return reply.send({ ok: true });
  }

  async syncNow(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const db = await this.db;
    const clinicId = requireClinicOf(ctx);
    const job = await (await this.syncSvc(db, clinicId)).sync(clinicId, ctx.userId, { mode: "historical" });
    return reply.send(metaSyncJobToPublic(job));
  }

  async syncRange(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const body = (request.body ?? {}) as Record<string, unknown>;
    const db = await this.db;
    const clinicId = requireClinicOf(ctx);
    const fromDate = typeof body.fromDate === "string" ? new Date(body.fromDate) : null;
    const toDate = typeof body.toDate === "string" ? new Date(body.toDate) : null;
    const job = await (await this.syncSvc(db, clinicId)).sync(clinicId, ctx.userId, {
      mode: "date_range",
      fromDate,
      toDate,
    });
    return reply.send(metaSyncJobToPublic(job));
  }

  async syncJobs(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const db = await this.db;
    const clinicId = requireClinicOf(ctx);
    const jobs = await (await this.syncSvc(db, clinicId)).listJobs(clinicId);
    return reply.send({ jobs: jobs.map(metaSyncJobToPublic) });
  }

  async analytics(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const db = await this.db;
    const result = await this.analyticsSvc(db).compute(requireClinicOf(ctx));
    return reply.send(result);
  }

  async webhookEvents(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const db = await this.db;
    const events = await new MetaRepository(db).listWebhookEvents(requireClinicOf(ctx));
    return reply.send({ events: events.map(metaWebhookEventToPublic) });
  }

  async retryWebhooks(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const db = await this.db;
    const webhook = new MetaWebhookService(db);
    const result = await webhook.retryFailed(requireClinicOf(ctx));
    return reply.send(result);
  }

  // ── Platform-level (section 46) ───────────────────────────────────────
  async platformOverview(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx || ctx.role !== "platform_admin") throw new UnauthorizedError();
    const db = await this.db;
    const repo = new MetaRepository(db);
    const integrations = await repo.integrations().find({}).toArray();
    const events = await repo.webhookEvents().find({ status: { $in: ["failed", "dead_letter"] } }).toArray();
    return reply.send({
      connectedClinics: integrations.filter((i) => i.status === "connected").length,
      totalIntegrations: integrations.length,
      byStatus: integrations.reduce<Record<string, number>>((acc, i) => {
        acc[i.status] = (acc[i.status] ?? 0) + 1;
        return acc;
      }, {}),
      integrations: integrations.map((i) => ({
        clinicId: i.clinicId,
        metaBusinessId: i.metaBusinessId,
        metaBusinessName: i.metaBusinessName,
        status: i.status,
        webhookStatus: i.webhookStatus,
        lastSyncedAt: i.lastSyncedAt,
        tokenExpiresAt: i.tokenExpiresAt,
        hasToken: Boolean(i.encryptedToken),
      })),
      webhookErrors: events.map(metaWebhookEventToPublic),
    });
  }
}
