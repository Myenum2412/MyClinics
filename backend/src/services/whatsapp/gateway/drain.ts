import type { Db } from "mongodb";
import { now as nowFn } from "@/clinic/core/datetime";
import { logger } from "@/lib/logger";
import { gateway, GatewayError } from "@/services/whatsapp/gateway/client";
import { getGatewayConfig, legacySessionId } from "@/services/whatsapp/gateway/config";
import { NOTIFICATIONS_COLLECTION, type NotificationDoc } from "@/services/whatsapp/notification.service";

const MAX_ATTEMPTS = 3;
/** Upper bound per processing tick across all clinics. */
const BATCH_LIMIT = 60;

export type GatewayApi = Pick<typeof gateway, "getSession" | "sendText" | "sendDocument">;

/** "919876543210@c.us" → "919876543210" */
export function phoneFromRemoteId(remoteId: string | null | undefined): string | null {
  const digits = (remoteId ?? "").split("@")[0].replace(/\D/g, "");
  return digits.length >= 8 ? digits : null;
}

export async function isRouteReady(api: GatewayApi, route: string): Promise<boolean> {
  try {
    return (await api.getSession(route))?.status === "READY";
  } catch {
    return false;
  }
}

/** Errors that say nothing about the message itself: the gateway is down or busy. */
export function isTransient(err: unknown): boolean {
  return err instanceof GatewayError && (err.status === 0 || err.status >= 500 || err.status === 404);
}

/**
 * Hands every queued `wa_notifications` row to the whatsapp-gateway, which
 * sends it from the right clinic's number. Rows for clinics whose number is not
 * currently connected stay queued. Sends are idempotent (`notif:<id>` dedupe key
 * on the gateway), so overlapping drains can never double-send.
 */
export async function drainNotificationsViaGateway(
  db: Db,
  api: GatewayApi = gateway
): Promise<{ sent: number; failed: number; skipped: number }> {
  const result = { sent: 0, failed: 0, skipped: 0 };
  if (!getGatewayConfig()) return result;

  const col = db.collection<NotificationDoc>(NOTIFICATIONS_COLLECTION);
  const queued = (await col
    .find({ status: "queued" })
    .sort({ createdAt: 1 })
    .limit(BATCH_LIMIT)
    .project({ mediaData: 0 })
    .toArray()) as unknown as NotificationDoc[];

  const ready = new Map<string, boolean>();

  for (const doc of queued) {
    const _id = doc._id;
    if (!_id) continue;
    const route = doc.clinicId || legacySessionId();
    if (!ready.has(route)) ready.set(route, await isRouteReady(api, route));
    if (!ready.get(route)) {
      result.skipped += 1;
      continue;
    }

    const to = phoneFromRemoteId(doc.remoteId);
    if (!to) {
      await col.updateOne({ _id }, { $set: { status: "failed", attempts: doc.attempts + 1, lastError: "invalid phone number" } });
      result.failed += 1;
      continue;
    }

    const dedupeKey = `notif:${String(_id)}`;
    try {
      if (doc.mediaMimetype) {
        const full = await col.findOne({ _id }, { projection: { mediaData: 1 } });
        const contentBase64 = full?.mediaData;
        if (!contentBase64) throw new Error("missing mediaData for media notification");
        await api.sendDocument(route, {
          to,
          filename: doc.mediaFilename ?? "document",
          mimetype: doc.mediaMimetype,
          caption: doc.message,
          contentBase64,
          dedupeKey,
        });
      } else {
        await api.sendText(route, to, doc.message, { dedupeKey });
      }
      await col.updateOne({ _id }, { $set: { status: "sent", sentAt: nowFn(), lastError: null } });
      result.sent += 1;
      logger.info("whatsapp notification handed to gateway", { clinicId: doc.clinicId ?? null, type: doc.type });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (isTransient(err)) {
        // Gateway down / session gone: keep the row queued without burning a retry, and stop this tick.
        logger.warn("whatsapp gateway unavailable, keeping notifications queued", { route, error: message });
        result.skipped += 1;
        if (err instanceof GatewayError && err.status !== 404) break;
        continue;
      }
      const attempts = doc.attempts + 1;
      await col.updateOne(
        { _id },
        { $set: { attempts, lastError: message, status: attempts >= MAX_ATTEMPTS ? "failed" : "queued" } }
      );
      result.failed += 1;
      logger.warn("whatsapp notification rejected by gateway", { clinicId: doc.clinicId ?? null, type: doc.type, attempts });
    }
  }
  return result;
}
