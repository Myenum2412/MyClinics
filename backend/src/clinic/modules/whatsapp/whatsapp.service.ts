import type { Db } from "mongodb";
import { requireClinicOf, type ClinicContext } from "@/clinic/core/context";
import {
  enqueueSessionCommand,
  getSessionConfig,
  type SessionCommandAction,
} from "@/services/whatsapp/whatsapp-session.store";
import { sessionToPublic, type ClinicWhatsappSessionPublic } from "@/clinic/modules/whatsapp/whatsapp.schema";

const QR_IMAGE_WIDTH = 360;

/**
 * Per-clinic WhatsApp Web connection management.
 *
 * The API server never talks to WhatsApp directly — it reads the session
 * status the worker persists on disk and writes commands into
 * `wa_session_commands` that the worker consumes within seconds.
 *
 * NOTE: the heavy `qrcode` dependency and the disk-reading helpers live in the
 * worker-facing `whatsapp.session` module. We import them lazily inside
 * `getSession` so this module never fails to load when `qrcode` is absent from
 * the API process — a missing QR renderer must never 500 the status endpoint
 * (which would make the UI report "status service not reachable").
 */
export class WhatsappService {
  constructor(private readonly db: Db) {}

  async getSession(ctx: ClinicContext): Promise<ClinicWhatsappSessionPublic> {
    const clinicId = requireClinicOf(ctx);
    try {
      const { readSessionStateFromDisk, readQrTextFromDisk } = await import(
        "@/services/whatsapp/whatsapp.session"
      );
      const state = readSessionStateFromDisk(clinicId);
      const config = await getSessionConfig(this.db, clinicId);

      let qr: { dataUrl: string; generatedAt: string } | null = null;
      if (!state || state.stage !== "ready") {
        const qrText = readQrTextFromDisk(clinicId);
        if (qrText) {
          try {
            const QRCode = (await import("qrcode")).default;
            qr = {
              dataUrl: await QRCode.toDataURL(qrText.content, {
                width: QR_IMAGE_WIDTH,
                margin: 2,
                errorCorrectionLevel: "M",
              }),
              generatedAt: qrText.generatedAt,
            };
          } catch {
            // QR rendering is best-effort; the worker owns the source of truth.
            qr = null;
          }
        }
      }

      return sessionToPublic(state, config, qr);
    } catch (err) {
      // Never let a transient read/serialize failure surface as a 500 (which the
      // UI interprets as "status service not reachable"). Return a safe, honest
      // state instead so the clinic can still attempt to connect.
      return sessionToPublic(null, null, null);
    }
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
