import QRCode from "qrcode";
import type { Db } from "mongodb";
import { requireClinicOf, type ClinicContext } from "@/clinic/core/context";
import {
  enqueueSessionCommand,
  getSessionConfig,
  type SessionCommandAction,
} from "@/services/whatsapp/whatsapp-session.store";
import {
  readQrTextFromDisk,
  readSessionStateFromDisk,
} from "@/services/whatsapp/whatsapp.session";
import { sessionToPublic, type ClinicWhatsappSessionPublic } from "@/clinic/modules/whatsapp/whatsapp.schema";

const QR_IMAGE_WIDTH = 360;

/**
 * Per-clinic WhatsApp Web connection management.
 *
 * The API server never talks to WhatsApp directly — it reads the session
 * status the worker persists on disk and writes commands into
 * `wa_session_commands` that the worker consumes within seconds.
 */
export class WhatsappService {
  constructor(private readonly db: Db) {}

  async getSession(ctx: ClinicContext): Promise<ClinicWhatsappSessionPublic> {
    const clinicId = requireClinicOf(ctx);
    const state = readSessionStateFromDisk(clinicId);
    const config = await getSessionConfig(this.db, clinicId);

    let qr: { dataUrl: string; generatedAt: string } | null = null;
    if (!state || state.stage !== "ready") {
      const qrText = readQrTextFromDisk(clinicId);
      if (qrText) {
        qr = {
          dataUrl: await QRCode.toDataURL(qrText.content, {
            width: QR_IMAGE_WIDTH,
            margin: 2,
            errorCorrectionLevel: "M",
          }),
          generatedAt: qrText.generatedAt,
        };
      }
    }

    return sessionToPublic(state, config, qr);
  }

  /** Queues a connect/disconnect/logout request for the worker to execute. */
  async requestConnectionChange(
    ctx: ClinicContext,
    action: Extract<SessionCommandAction, "connect" | "disconnect" | "logout">
  ): Promise<{ ok: true }> {
    await enqueueSessionCommand(this.db, requireClinicOf(ctx), action);
    return { ok: true };
  }
}
