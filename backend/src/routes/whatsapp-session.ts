import type { FastifyInstance } from "fastify";
import QRCode from "qrcode";
import { requireAuth } from "@/plugins/auth";
import {
  LEGACY_SESSION_KEY,
  readQrTextFromDisk,
  readSessionStateFromDisk,
} from "@/services/whatsapp/whatsapp.session";

const QR_IMAGE_WIDTH = 360;

/**
 * Legacy platform-wide WhatsApp connection status (the central AI bot number).
 * Per-clinic connections are served by
 * GET /api/clinics/:clinicId/whatsapp/session instead.
 */
export function registerWhatsappSessionRoutes(app: FastifyInstance): void {
  app.get("/api/whatsapp/session", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;

    try {
      const state = readSessionStateFromDisk(LEGACY_SESSION_KEY);
      const qrText = readQrTextFromDisk(LEGACY_SESSION_KEY);

      let qr: { dataUrl: string; generatedAt: string } | null = null;
      if (qrText && (state === null || state.stage !== "ready")) {
        qr = {
          dataUrl: await QRCode.toDataURL(qrText.content, {
            width: QR_IMAGE_WIDTH,
            margin: 2,
            errorCorrectionLevel: "M",
          }),
          generatedAt: qrText.generatedAt,
        };
      }

      return reply.send({ state, qr });
    } catch (err) {
      return reply.code(500).send({
        error: `Something went wrong. Please try again. (${err instanceof Error ? err.message : String(err)})`,
      });
    }
  });
}
