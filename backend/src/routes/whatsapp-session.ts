import type { FastifyInstance } from "fastify";
import { requireAuth } from "@/plugins/auth";
import { logger } from "@/lib/logger";
import { legacySessionId } from "@/services/whatsapp/gateway/config";
import { gateway } from "@/services/whatsapp/gateway/client";
import { toQr, toSessionState } from "@/services/whatsapp/gateway/session";

/**
 * Platform-wide ("central number") WhatsApp connection status, read from the
 * whatsapp-gateway. Per-clinic connections are served by
 * GET /api/clinics/:clinicId/whatsapp/session instead.
 */
export function registerWhatsappSessionRoutes(app: FastifyInstance): void {
  app.get("/api/whatsapp/session", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;

    try {
      const gw = await gateway.getSession(legacySessionId());
      return reply.send({ state: gw ? toSessionState(gw) : null, qr: toQr(gw) });
    } catch (err) {
      logger.warn("whatsapp gateway status failed (platform session)", { error: err instanceof Error ? err.message : String(err) });
      return reply.send({ state: null, qr: null });
    }
  });
}
