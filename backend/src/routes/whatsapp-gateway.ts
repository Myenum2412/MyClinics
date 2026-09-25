import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { getWhatsAppDb } from "@/lib/db-pools";
import { logger } from "@/lib/logger";
import { now as nowFn } from "@/clinic/core/datetime";
import { getGatewayConfig } from "@/services/whatsapp/gateway/config";
import { GATEWAY_HEADER_SIG, GATEWAY_HEADER_TS, verifySignature } from "@/services/whatsapp/gateway/signature";
import { handleInboundMessage, inboundMessageSchema } from "@/services/whatsapp/menu/service";
import { upsertSessionConfig } from "@/services/whatsapp/whatsapp-session.store";

/** Verifies the HMAC signature the gateway puts on every webhook. Replies with 401/503 and returns false on failure. */
function verifyGatewayRequest(request: FastifyRequest, reply: FastifyReply): boolean {
  const cfg = getGatewayConfig();
  if (!cfg) {
    reply.code(503).send({ error: "WhatsApp gateway is not configured" });
    return false;
  }
  const rawBody = (request as unknown as { rawBody?: string }).rawBody ?? "";
  const ok = verifySignature(
    cfg.secret,
    { timestamp: request.headers[GATEWAY_HEADER_TS], signature: request.headers[GATEWAY_HEADER_SIG] },
    rawBody
  );
  if (!ok) {
    logger.warn("whatsapp gateway webhook rejected: bad signature");
    reply.code(401).send({ error: "invalid signature" });
    return false;
  }
  return true;
}

const statusSchema = z.object({
  clinicId: z.string().min(1).max(64),
  status: z.enum(["STARTING", "QR_REQUIRED", "READY", "DISCONNECTED", "LOGGED_OUT", "STOPPED"]),
  phone: z.string().nullable().optional(),
  at: z.number().optional(),
});

/**
 * Webhooks called by the standalone whatsapp-gateway:
 *   POST /api/whatsapp/inbound  incoming patient message → menu chatbot replies
 *   POST /api/whatsapp/status   session state changes → clinic connection record
 */
export function registerWhatsappGatewayRoutes(app: FastifyInstance): void {
  app.post("/api/whatsapp/inbound", async (request, reply) => {
    if (!verifyGatewayRequest(request, reply)) return;

    const parsed = inboundMessageSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid inbound payload" });

    const db = await getWhatsAppDb();
    const result = await handleInboundMessage(db, parsed.data);
    return reply.send(result);
  });

  app.post("/api/whatsapp/status", async (request, reply) => {
    if (!verifyGatewayRequest(request, reply)) return;

    const parsed = statusSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid status payload" });
    const { clinicId, status, phone } = parsed.data;

    const db = await getWhatsAppDb();
    const now = nowFn();
    switch (status) {
      case "READY":
        await upsertSessionConfig(db, clinicId, { enabled: true, phone: phone ?? null, lastConnectedAt: now });
        break;
      case "DISCONNECTED":
        await upsertSessionConfig(db, clinicId, { lastDisconnectedAt: now });
        break;
      case "LOGGED_OUT":
        await upsertSessionConfig(db, clinicId, { enabled: false, phone: null, lastDisconnectedAt: now });
        break;
      case "STOPPED":
        await upsertSessionConfig(db, clinicId, { enabled: false, lastDisconnectedAt: now });
        break;
      default:
        break; // STARTING / QR_REQUIRED: transient, nothing to persist
    }
    return reply.send({ ok: true });
  });
}
