import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getDb } from "@/lib/db-pools";
import {
  requireClinicAccess,
  requireRoles,
} from "@/clinic/core/scope";
import { UnauthorizedError, BadRequestError } from "@/clinic/core/errors";
import { buildMetaClient } from "@/clinic/modules/meta/meta-client";
import { MetaController } from "@/clinic/modules/meta/meta.controller";
import { MetaAuthService } from "@/clinic/modules/meta/meta-auth.service";
import { MetaWebhookService } from "@/clinic/modules/meta/meta-webhook.service";

/**
 * Clinic-level Meta routes (sections 28–45). All run behind requireClinicAccess,
 * so the URL clinicId is re-validated for every request — a clinic can only
 * ever act on its OWN Meta integration.
 */
export function registerMetaRoutes(app: FastifyInstance): void {
  const controller = new MetaController();

  app.get(
    "/api/clinics/:clinicId/meta/status",
    { preHandler: requireClinicAccess },
    (req, reply) => controller.status(req, reply)
  );
  app.get(
    "/api/clinics/:clinicId/meta/health",
    { preHandler: requireClinicAccess },
    (req, reply) => controller.status(req, reply)
  );
  app.post(
    "/api/clinics/:clinicId/meta/connect",
    { preHandler: [requireClinicAccess, requireRoles("clinic_admin")] },
    (req, reply) => controller.connect(req, reply)
  );
  app.post(
    "/api/clinics/:clinicId/meta/reconnect",
    { preHandler: [requireClinicAccess, requireRoles("clinic_admin")] },
    (req, reply) => controller.reconnect(req, reply)
  );
  app.post(
    "/api/clinics/:clinicId/meta/disconnect",
    { preHandler: [requireClinicAccess, requireRoles("clinic_admin")] },
    (req, reply) => controller.disconnect(req, reply)
  );
  app.get(
    "/api/clinics/:clinicId/meta/assets",
    { preHandler: requireClinicAccess },
    (req, reply) => controller.assets(req, reply)
  );
  app.get(
    "/api/clinics/:clinicId/meta/campaign-mappings",
    { preHandler: requireClinicAccess },
    (req, reply) => controller.listCampaignMappings(req, reply)
  );
  app.post(
    "/api/clinics/:clinicId/meta/campaign-mappings",
    { preHandler: [requireClinicAccess, requireRoles("clinic_admin")] },
    (req, reply) => controller.upsertCampaignMapping(req, reply)
  );
  app.delete(
    "/api/clinics/:clinicId/meta/campaign-mappings/:mappingId",
    { preHandler: [requireClinicAccess, requireRoles("clinic_admin")] },
    (req, reply) => controller.deleteCampaignMapping(req, reply)
  );
  app.post(
    "/api/clinics/:clinicId/meta/sync",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    (req, reply) => controller.syncNow(req, reply)
  );
  app.post(
    "/api/clinics/:clinicId/meta/sync/range",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    (req, reply) => controller.syncRange(req, reply)
  );
  app.get(
    "/api/clinics/:clinicId/meta/sync/jobs",
    { preHandler: requireClinicAccess },
    (req, reply) => controller.syncJobs(req, reply)
  );
  app.get(
    "/api/clinics/:clinicId/meta/analytics",
    { preHandler: requireClinicAccess },
    (req, reply) => controller.analytics(req, reply)
  );
  app.get(
    "/api/clinics/:clinicId/meta/webhook-events",
    { preHandler: requireClinicAccess },
    (req, reply) => controller.webhookEvents(req, reply)
  );
  app.post(
    "/api/clinics/:clinicId/meta/webhook-events/retry",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    (req, reply) => controller.retryWebhooks(req, reply)
  );
}

/** Platform-level Meta oversight (section 46) — platform_admin only. */
export function registerPlatformMetaRoutes(app: FastifyInstance): void {
  const controller = new MetaController();
  app.get(
    "/api/platform/meta/overview",
    { preHandler: requireRoles("platform_admin", { exact: true }) },
    (req, reply) => controller.platformOverview(req, reply)
  );
}

/**
 * Public Meta routes (no clinic scope): OAuth callback + webhook. The callback
 * resolves the clinic from the oauth `state`; the webhook resolves the clinic
 * from the Meta asset id. Neither trusts a caller-supplied clinicId.
 */
export function registerPublicMetaRoutes(app: FastifyInstance): void {
  app.get("/api/meta/oauth/callback", async (request, reply) => {
    const ctx = request as FastifyRequest;
    const query = ctx.query as { code?: string; state?: string; error?: string };
    if (query.error) {
      return reply.send(`<html><body><h3>Meta authorization failed: ${query.error}</h3><script>window.close();</script></body></html>`);
    }
    if (!query.code || !query.state) {
      return reply.code(400).send({ error: "Missing code or state" });
    }
    const db = await getDb();
    const auth = new MetaAuthService(db);
    const result = await auth.handleCallback(query.code, query.state);
    const frontend = process.env.FRONTEND_URL?.replace(/\/$/, "") || "http://localhost:3456";
    return reply.redirect(
      `${frontend}/orgmenu/clinics/${result.clinicId}?meta=connected`
    );
  });

  // Webhook needs the RAW body bytes for X-Hub-Signature-256 verification, but
  // Fastify's global JSON parser already consumes application/json bodies. We
  // register a dedicated content-type parser (no conflict with the global one)
  // and rewrite the webhook route's content-type header in onRequest so the
  // raw buffer is captured into request.rawBody while still parsing JSON.
  const META_WEBHOOK_RAW = "application/json+metawebhook-raw";
  app.addContentTypeParser(
    META_WEBHOOK_RAW,
    { parseAs: "buffer" },
    (request, body, done) => {
      (request as FastifyRequest & { rawBody?: Buffer }).rawBody = body as Buffer;
      const text = (body as Buffer).toString("utf8").trim();
      try {
        done(null, text ? JSON.parse(text) : null);
      } catch (err) {
        done(err as Error);
      }
    }
  );

  app.register(async (webhookApp) => {
    webhookApp.addHook("onRequest", async (request) => {
      if (request.routeOptions?.url === "/api/meta/webhook") {
        request.headers["content-type"] = META_WEBHOOK_RAW;
      }
    });

    webhookApp.get("/api/meta/webhook", async (request, reply) => {
      const q = request.query as {
        "hub.mode"?: string;
        "hub.verify_token"?: string;
        "hub.challenge"?: string;
      };
      const webhook = new MetaWebhookService(
        await getDb(),
        buildMetaClient(),
        process.env.META_APP_SECRET
      );
      const challenge = webhook.verifyChallenge(q["hub.mode"] ?? null, q["hub.verify_token"] ?? null, q["hub.challenge"] ?? null);
      if (challenge == null) return reply.code(403).send("forbidden");
      return reply.type("text/plain").send(challenge);
    });

    webhookApp.post("/api/meta/webhook", async (request, reply) => {
      const buf = (request as FastifyRequest & { rawBody?: Buffer }).rawBody ?? Buffer.from("");
      const sig = request.headers["x-hub-signature-256"];
      const webhook = new MetaWebhookService(
        await getDb(),
        buildMetaClient(),
        process.env.META_APP_SECRET
      );
      if (!webhook.verifySignature(buf, typeof sig === "string" ? sig : undefined)) {
        return reply.code(401).send({ error: "invalid signature" });
      }
      const payload = request.body as {
        entry?: Array<{ id?: string; changes?: Array<{ field?: string; value?: Record<string, unknown> }> }>;
      };
      // Store + resolve + process each leadgen event.
      for (const entry of payload.entry ?? []) {
        const pageIdFromEntry = entry.id;
        for (const change of entry.changes ?? []) {
          if (change.field !== "leadgen" || !change.value) continue;
          const value = change.value as {
            leadgen_id?: string;
            page_id?: string;
            form_id?: string;
          };
          const leadgenId = value.leadgen_id;
          const pageId = value.page_id ?? pageIdFromEntry;
          if (!leadgenId || !pageId) continue;
          const resolved = await webhook.receiveLeadgen(
            pageId,
            leadgenId,
            `${pageId}:${leadgenId}`,
            value
          );
          if (!resolved) continue; // asset not mapped to any clinic → refuse
          try {
            await webhook.processEvent(resolved.eventKey);
          } catch {
            // Recorded as failed/dead_letter; retried via admin endpoint.
          }
        }
      }
      return reply.code(200).send({ received: true });
    });
  });
}
