import type { Db } from "mongodb";
import { now as nowFn } from "@/clinic/core/datetime";
import { logger } from "@/lib/logger";
import { gateway, GatewayError } from "@/services/whatsapp/gateway/client";
import { getGatewayConfig, legacySessionId } from "@/services/whatsapp/gateway/config";
import { NOTIFICATIONS_COLLECTION, type NotificationDoc } from "@/services/whatsapp/notification.service";

const MAX_ATTEMPTS = 3;
/** Upper bound per clinic per processing tick. */
const BATCH_LIMIT = 60;
export const MAX_NOTIFICATION_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export type GatewayApi = Pick<typeof gateway, "getSession" | "sendText" | "sendDocument"> & {
  listSessions?: typeof gateway.listSessions;
};

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
 * Marks queued notifications older than maxAgeMs as failed so that ancient,
 * obsolete notifications do not clog the queue or blast patients months late.
 */
export async function expireStaleNotifications(
  db: Db,
  maxAgeMs = MAX_NOTIFICATION_AGE_MS,
  now = nowFn()
): Promise<number> {
  const cutoff = new Date(now.getTime() - maxAgeMs);
  const col = db.collection<NotificationDoc>(NOTIFICATIONS_COLLECTION);
  const res = await col.updateMany(
    { status: "queued", createdAt: { $lt: cutoff } },
    { $set: { status: "failed", lastError: "delivery expired (older than 24h)" } }
  );
  if (res.modifiedCount > 0) {
    logger.info("expired stale whatsapp notifications", { count: res.modifiedCount });
  }
  return res.modifiedCount;
}

/**
 * Hands queued `wa_notifications` rows to the whatsapp-gateway, which
 * sends each from the right clinic's number.
 *
 * Draining is partitioned by clinic route: disconnected clinics are skipped
 * without blocking connected clinics (no head-of-line blocking).
 * Sends are idempotent (`notif:<id>` dedupe key on the gateway).
 */
export async function drainNotificationsViaGateway(
  db: Db,
  api: GatewayApi = gateway
): Promise<{ sent: number; failed: number; skipped: number }> {
  const result = { sent: 0, failed: 0, skipped: 0 };
  if (!getGatewayConfig()) return result;

  const col = db.collection<NotificationDoc>(NOTIFICATIONS_COLLECTION);

  // Discover which clinic routes currently have queued messages
  const rawClinicIds = (await col.distinct("clinicId", { status: "queued" })) as (string | null)[];
  if (rawClinicIds.length === 0) return result;

  const ready = new Map<string, boolean>();

  // If the gateway supports listSessions, pre-populate ready states in a single call
  if (typeof api.listSessions === "function") {
    try {
      const all = await api.listSessions();
      for (const s of all) {
        ready.set(s.clinicId, s.status === "READY");
      }
    } catch {
      // Fall back to per-route getSession below
    }
  }

  for (const rawClinicId of rawClinicIds) {
    const route = rawClinicId || legacySessionId();
    if (!ready.has(route)) {
      ready.set(route, await isRouteReady(api, route));
    }

    const isReady = ready.get(route);
    if (!isReady) {
      // Route not ready: count queued documents for this route as skipped
      const filter = rawClinicId
        ? { status: "queued", clinicId: rawClinicId }
        : { status: "queued", clinicId: { $in: [null, undefined] } };
      const count = await col.countDocuments(filter);
      result.skipped += count;
      continue;
    }

    // Route is READY: fetch up to BATCH_LIMIT notifications for this route
    const filter = rawClinicId
      ? { status: "queued", clinicId: rawClinicId }
      : { status: "queued", clinicId: { $in: [null, undefined] } };

    const queued = (await col
      .find(filter)
      .sort({ createdAt: 1 })
      .limit(BATCH_LIMIT)
      .project({ mediaData: 0 })
      .toArray()) as unknown as NotificationDoc[];

    let routeHalted = false;

    for (const doc of queued) {
      const _id = doc._id;
      if (!_id) continue;

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
          // Gateway down / session gone: keep the row queued without burning a retry, and stop this tick/route.
          logger.warn("whatsapp gateway unavailable, keeping notifications queued", { route, error: message });
          result.skipped += 1;
          if (err instanceof GatewayError && err.status !== 404) {
            routeHalted = true;
            break;
          }
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

    if (routeHalted) {
      // Entire gateway unavailable (network/5xx) - stop this tick
      break;
    }
  }

  return result;
}
