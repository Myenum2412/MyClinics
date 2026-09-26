import type { Db } from "mongodb";
import { requireClinicOf, type ClinicContext } from "@/clinic/core/context";
import { AppError } from "@/clinic/core/errors";
import { logger } from "@/lib/logger";
import { gateway, GatewayError, type GatewaySession } from "@/services/whatsapp/gateway/client";
import { toQr, toSessionState, unreachableState } from "@/services/whatsapp/gateway/session";
import { getSessionConfig, upsertSessionConfig } from "@/services/whatsapp/whatsapp-session.store";
import { sessionToPublic, type ClinicWhatsappSessionPublic } from "@/clinic/modules/whatsapp/whatsapp.schema";

type ConnectionAction = "connect" | "disconnect" | "logout";

/**
 * Per-clinic WhatsApp connection management.
 *
 * The connection lives in the standalone whatsapp-gateway. This service asks
 * the gateway for the live state/QR and forwards connect/disconnect/logout;
 * durable settings (enabled flag, connected number) are kept in
 * `wa_clinic_sessions` and refreshed from the gateway's status webhook.
 */
export class WhatsappService {
  constructor(private readonly db: Db) {}

  async getSession(ctx: ClinicContext): Promise<ClinicWhatsappSessionPublic> {
    const clinicId = requireClinicOf(ctx);
    const config = await getSessionConfig(this.db, clinicId).catch(() => null);
    try {
      const gw = await gateway.getSession(clinicId);
      return sessionToPublic(gw ? toSessionState(gw) : null, config, toQr(gw));
    } catch (err) {
      // Never 500 the status endpoint: report an honest "error" stage so the clinic can retry.
      logger.warn("whatsapp gateway status failed", { clinicId, error: err instanceof Error ? err.message : String(err) });
      return sessionToPublic(unreachableState(), config, null);
    }
  }

  async requestConnectionChange(ctx: ClinicContext, action: ConnectionAction): Promise<{ ok: true }> {
    const clinicId = requireClinicOf(ctx);
    try {
      if (action === "connect") {
        await upsertSessionConfig(this.db, clinicId, { enabled: true });
        await gateway.startSession(clinicId);
      } else if (action === "disconnect") {
        await ignoreUnknown(gateway.stopSession(clinicId));
        await upsertSessionConfig(this.db, clinicId, { enabled: false });
      } else {
        await ignoreUnknown(gateway.logoutSession(clinicId));
        await upsertSessionConfig(this.db, clinicId, { enabled: false, phone: null });
      }
      return { ok: true };
    } catch (err) {
      logger.error("whatsapp gateway command failed", { clinicId, action, error: err instanceof Error ? err.message : String(err) });
      throw new AppError("The WhatsApp service is unavailable right now. Please try again in a moment.", 502, "GATEWAY_UNAVAILABLE");
    }
  }
}

/** A clinic the gateway has never seen is already "disconnected" - not an error. */
async function ignoreUnknown(p: Promise<GatewaySession | { ok: true }>): Promise<void> {
  try {
    await p;
  } catch (err) {
    if (!(err instanceof GatewayError && err.status === 404)) throw err;
  }
}
