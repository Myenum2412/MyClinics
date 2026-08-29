import type { Db } from "mongodb";
import { now as nowFn } from "@/clinic/core/datetime";
import { generateUuid } from "@/clinic/core/ids";
import { MetaRepository } from "@/clinic/modules/meta/meta.repository";
import type { MetaApiClient } from "@/clinic/modules/meta/meta-client";
import { MetaTokenService } from "@/clinic/modules/meta/meta-token.service";
import { MetaLeadService } from "@/clinic/modules/meta/meta-lead.service";
import type { MetaSyncJobDoc } from "@/clinic/modules/meta/meta-schema";
import { BadRequestError } from "@/clinic/core/errors";

/**
 * MetaSyncService — historical + date-range lead synchronization (section 35).
 *
 * Real-time ingestion is handled by the webhook gateway; this service covers
 * back-fill of previously captured Meta leads and re-processing of queued
 * webhook events. Every run is recorded as a sync job with explicit
 * found / imported / duplicates / failed counts.
 */
export class MetaSyncService {
  constructor(
    private readonly db: Db,
    private readonly client: MetaApiClient | null
  ) {}

  private repo(): MetaRepository {
    return new MetaRepository(this.db);
  }

  /** Syncs leads for a clinic within an optional date window (or all-time). */
  async sync(
    clinicId: string,
    triggeredBy: string | null,
    opts: { mode?: "historical" | "date_range"; fromDate?: Date | null; toDate?: Date | null } = {}
  ): Promise<MetaSyncJobDoc> {
    const integration = await this.repo().getIntegration(clinicId);
    if (!integration || integration.status === "disconnected") {
      throw new BadRequestError("Meta is not connected for this clinic");
    }
    const token = await new MetaTokenService(this.db, this.client).getDecryptedToken(clinicId);
    if (!token) throw new BadRequestError("No Meta token available");

    const job = await this.repo().createSyncJob(clinicId, {
      syncJobId: `msj_${generateUuid().slice(0, 12)}`,
      triggeredBy,
      mode: opts.mode ?? "historical",
      fromDate: opts.fromDate ?? null,
      toDate: opts.toDate ?? null,
      status: "running",
      found: 0,
      imported: 0,
      duplicates: 0,
      failed: 0,
      startedAt: nowFn(),
      finishedAt: null,
    });

    const leadService = new MetaLeadService(this.db, this.client);
    const forms = await this.repo().listForms(clinicId);
    let found = 0;
    let imported = 0;
    let duplicates = 0;
    let failed = 0;

    for (const form of forms) {
      try {
        const res = await this.client!.get<{ data?: Array<{ id: string; created_time?: string }> }>(
          `${form.formId}/leads`,
          token,
          { fields: "id,created_time", limit: "200" }
        );
        for (const lead of res.data ?? []) {
          const created = lead.created_time ? new Date(lead.created_time) : null;
          if (opts.fromDate && created && created < opts.fromDate) continue;
          if (opts.toDate && created && created > opts.toDate) continue;
          found += 1;
          try {
            const r = await leadService.ingestLead(clinicId, lead.id);
            if (r.duplicate) duplicates += 1;
            else imported += 1;
          } catch {
            failed += 1;
          }
        }
      } catch {
        failed += 1;
      }
    }

    const finished = await this.repo().updateSyncJob(clinicId, job.syncJobId, {
      status: failed > 0 && imported === 0 ? "failed" : failed > 0 ? "partial" : "completed",
      found,
      imported,
      duplicates,
      failed,
      finishedAt: nowFn(),
    });
    void finished;
    await this.repo().upsertIntegration(clinicId, { lastSyncedAt: nowFn() });
    return (await this.repo().listSyncJobs(clinicId, 1))[0];
  }

  /** Processes any unresolved webhook events (real-time backlog). */
  async processRealtimeBacklog(clinicId: string): Promise<{ processed: number }> {
    const events = await this.repo().webhookEvents()
      .find({ clinicId, status: { $in: ["received", "failed"] } })
      .toArray();
    const webhook = new (await import("@/clinic/modules/meta/meta-webhook.service")).MetaWebhookService(
      this.db
    );
    let processed = 0;
    for (const ev of events) {
      try {
        await webhook.processEvent(ev.eventKey);
        processed += 1;
      } catch {
        // Recorded as failed/dead_letter inside processEvent.
      }
    }
    return { processed };
  }

  async listJobs(clinicId: string) {
    return this.repo().listSyncJobs(clinicId);
  }
}
