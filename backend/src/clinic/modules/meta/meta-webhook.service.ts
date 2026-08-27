import type { Db } from "mongodb";
import { createHmac, timingSafeEqual } from "node:crypto";
import { now as nowFn } from "@/clinic/core/datetime";
import { MetaRepository } from "@/clinic/modules/meta/meta.repository";
import type { MetaApiClient } from "@/clinic/modules/meta/meta-client";
import { MetaLeadService } from "@/clinic/modules/meta/meta-lead.service";
import { BadRequestError } from "@/clinic/core/errors";

const MAX_ATTEMPTS = 5;

/**
 * MetaWebhookService — the webhook gateway (section 34).
 *
 * Security / isolation guarantees:
 *  - the payload signature is verified against the app secret (X-Hub-Signature-256),
 *  - the clinic is resolved from the Meta ASSET (pageId), NEVER from any
 *    client-supplied clinicId,
 *  - event ingestion is idempotent (unique eventKey + metaLeadId), so
 *    duplicate deliveries cannot create duplicate leads,
 *  - failures are retried with a dead-letter state — they never silently drop.
 */
export class MetaWebhookService {
  constructor(
    private readonly db: Db,
    private readonly client: MetaApiClient | null,
    private readonly appSecret: string | undefined
  ) {}

  private repo(): MetaRepository {
    return new MetaRepository(this.db);
  }

  /** Validates the Meta webhook signature (SHA-256 HMAC). */
  verifySignature(rawBody: Buffer | string, signatureHeader: string | undefined): boolean {
    if (!this.appSecret) return false;
    if (!signatureHeader) return false;
    const expected = `sha256=${createHmac("sha256", this.appSecret)
      .update(rawBody as Buffer)
      .digest("hex")}`;
    const a = Buffer.from(expected);
    const b = Buffer.from(signatureHeader);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  /** GET verification handshake (Meta subscription confirmation). */
  verifyChallenge(mode: string | null, token: string | null, challenge: string | null): string | null {
    const expected = process.env.META_WEBHOOK_VERIFY_TOKEN;
    if (mode === "subscribe" && token && challenge && token === expected) {
      return challenge;
    }
    return null;
  }

  /**
   * Stores a leadgen webhook event and RESOLVES the owning clinic from the
   * Meta page id. Returns null when the page is not mapped to any clinic
   * (no cross-tenant leakage — the event is simply not ingested).
   */
  async receiveLeadgen(
    pageId: string,
    metaLeadId: string,
    eventId: string,
    payload: Record<string, unknown>
  ): Promise<{ clinicId: string; eventKey: string; alreadyExists: boolean } | null> {
    const page = await this.repo().findByPageId(pageId);
    if (!page) {
      // Asset not mapped to any clinic → refuse (do NOT guess a clinic).
      return null;
    }
    const clinicId = page.clinicId;
    const eventKey = `leadgen:${metaLeadId}`;

    const existing = await this.repo().findWebhookByKey(eventKey);
    if (existing) {
      return { clinicId, eventKey, alreadyExists: true };
    }

    await this.repo().insertWebhookEvent({
      clinicId,
      eventId,
      eventKey,
      eventType: "leadgen",
      resolverAssetId: pageId,
      metaLeadId,
      payload,
      status: "received",
      attempts: 0,
      lastError: null,
      processedAt: null,
    });
    return { clinicId, eventKey, alreadyExists: false };
  }

  /** Processes a stored webhook event idempotently, with retries. */
  async processEvent(eventKey: string): Promise<{ status: string; duplicate: boolean }> {
    const event = await this.repo().findWebhookByKey(eventKey);
    if (!event) throw new BadRequestError("Unknown webhook event");
    if (event.status === "duplicate" || event.status === "resolved") {
      return { status: event.status, duplicate: event.status === "duplicate" };
    }

    const leadService = new MetaLeadService(this.db, this.client);
    try {
      if (!event.metaLeadId) throw new BadRequestError("Event has no metaLeadId");
      const result = await leadService.ingestLead(event.clinicId, event.metaLeadId);
      if (result.duplicate) {
        await this.repo().updateWebhookEvent(eventKey, {
          status: "duplicate",
          attempts: event.attempts + 1,
          processedAt: nowFn(),
        });
        return { status: "duplicate", duplicate: true };
      }
      await this.repo().updateWebhookEvent(eventKey, {
        status: "resolved",
        attempts: event.attempts + 1,
        processedAt: nowFn(),
        lastError: null,
      });
      return { status: "resolved", duplicate: false };
    } catch (err) {
      const attempts = event.attempts + 1;
      const failed = attempts >= MAX_ATTEMPTS;
      await this.repo().updateWebhookEvent(eventKey, {
        status: failed ? "dead_letter" : "failed",
        attempts,
        lastError: (err as Error).message,
        processedAt: failed ? nowFn() : null,
      });
      throw err;
    }
  }

  /** Retries dead-letter / failed events (called by an admin or cron). */
  async retryFailed(clinicId: string): Promise<{ retried: number; stillFailing: number }> {
    const events = await this.repo().webhookEvents()
      .find({ clinicId, status: { $in: ["failed", "dead_letter"] } })
      .toArray();
    let retried = 0;
    let stillFailing = 0;
    for (const ev of events) {
      try {
        await this.processEvent(ev.eventKey);
        retried += 1;
      } catch {
        stillFailing += 1;
      }
    }
    return { retried, stillFailing };
  }
}
