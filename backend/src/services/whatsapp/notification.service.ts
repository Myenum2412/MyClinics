import wpp from "whatsapp-web.js";
import type { Client } from "whatsapp-web.js";

const { MessageMedia } = wpp;
import type { Db, ObjectId } from "mongodb";
import { logger } from "@/lib/logger";
import { now as nowFn } from "@/clinic/core/datetime";
import { toWhatsAppRemoteId } from "@/lib/phone";
import { todayDateString } from "@/lib/stats";
import { ensureDefaultOrganization } from "@/services/customer/customer-context.service";
import { getNextQueuedAppointment } from "@/services/queue.service";
import { sendWithTimeout } from "@/services/whatsapp/send.utils";
import { LEGACY_SESSION_KEY } from "@/services/whatsapp/whatsapp.session";

export const NOTIFICATIONS_COLLECTION = "wa_notifications";
const MAX_ATTEMPTS = 3;
/** Upper bound per processing tick across all connections. */
const BATCH_LIMIT = 60;

export type NotificationStatus = "queued" | "sent" | "failed";

export interface NotificationMedia {
  filename: string;
  mimetype: string;
  data: string;
}

export interface NotificationDoc {
  _id?: ObjectId;
  type: string;
  organizationId: string;
  /**
   * When set, the message is delivered through THAT clinic's own WhatsApp
   * connection. When null the legacy central connection sends it.
   */
  clinicId?: string | null;
  remoteId: string | null;
  message: string;
  status: NotificationStatus;
  attempts: number;
  lastError: string | null;
  createdAt: Date;
  sentAt: Date | null;
  mediaFilename?: string;
  mediaMimetype?: string;
  mediaData?: string;
}

/** Queues a WhatsApp message (optionally with a media attachment) that the worker sends as soon as a matching connection is ready. */
export async function enqueueNotification(
  db: Db,
  organizationId: string,
  phone: string,
  message: string,
  type: string,
  media?: NotificationMedia,
  clinicId?: string | null
): Promise<{ queued: boolean; remoteId: string | null }> {
  const remoteId = toWhatsAppRemoteId(phone);
  if (!remoteId) return { queued: false, remoteId: null };

  await db.collection(NOTIFICATIONS_COLLECTION).insertOne({
    type,
    organizationId,
    clinicId: clinicId ?? null,
    remoteId,
    message,
    status: "queued",
    attempts: 0,
    lastError: null,
    createdAt: nowFn(),
    sentAt: null,
    mediaFilename: media?.filename,
    mediaMimetype: media?.mimetype,
    mediaData: media?.data,
  } satisfies NotificationDoc);

  return { queued: true, remoteId };
}

/**
 * Called after a patient is marked completed. Alerts the next patient in
 * today's queue that their turn has arrived. No-op for other dates.
 * (Legacy platform flow — always uses the central connection.)
 */
export async function enqueueTurnAlertForNextPatient(
  db: Db,
  date: string
): Promise<{ notified: string | null }> {
  if (date !== todayDateString()) return { notified: null };

  const org = await ensureDefaultOrganization(db);
  const next = await getNextQueuedAppointment(db, date);
  if (!next) return { notified: null };

  const phone = next.whatsapp ?? next.mobile;
  if (!phone) return { notified: null };

  const firstName = next.fullName.split(" ")[0] || "there";
  const doctor = next.doctorName ? ` (${next.doctorName})` : "";
  const message =
    `Hi ${firstName}, this is ${org.name}. Your turn is now${doctor} — ` +
    `please come in. Appointment at ${next.time}.`;

  await enqueueNotification(db, org.id, phone, message, "turn_alert");
  return { notified: next.id };
}

/**
 * Queues a WhatsApp message to a patient. When `clinicId` is provided the
 * message goes out through that clinic's own WhatsApp number; otherwise it
 * falls back to the default (central) connection. Returns a no-op result when
 * the phone number can't be used.
 */
export async function enqueueClinicNotification(
  db: Db,
  phone: string,
  message: string,
  type: string,
  media?: NotificationMedia,
  clinicId?: string | null
): Promise<{ queued: boolean; remoteId: string | null }> {
  if (clinicId) {
    return enqueueNotification(db, clinicId, phone, message, type, media, clinicId);
  }
  const org = await ensureDefaultOrganization(db);
  return enqueueNotification(db, org.id, phone, message, type, media);
}

interface BatchResult {
  sent: number;
  failed: number;
}

/** Sends one connection's batch of queued notifications and records the outcomes. */
async function sendBatch(
  client: Client,
  db: Db,
  batch: NotificationDoc[]
): Promise<BatchResult> {
  let sent = 0;
  let failed = 0;
  const updates: {
    filter: { _id: ObjectId };
    update: Record<string, unknown>;
  }[] = [];

  for (const notification of batch) {
    // Docs come from Mongo so _id is always present; guard for typing only.
    const notificationId = notification._id;
    if (!notificationId) continue;
    if (!notification.remoteId) {
      updates.push({
        filter: { _id: notificationId },
        update: {
          $set: { status: "failed", attempts: notification.attempts + 1 },
        },
      });
      failed += 1;
      continue;
    }
    try {
      if (notification.mediaMimetype) {
        let mediaData = notification.mediaData;
        if (!mediaData) {
          const full = await db
            .collection<NotificationDoc>(NOTIFICATIONS_COLLECTION)
            .findOne({ _id: notificationId }, { projection: { mediaData: 1 } });
          mediaData = full?.mediaData;
        }
        if (!mediaData) {
          throw new Error("missing mediaData for media notification");
        }
        const media = new MessageMedia(
          notification.mediaMimetype,
          mediaData,
          notification.mediaFilename ?? "document"
        );
        await sendWithTimeout(
          client,
          notification.remoteId,
          media,
          { caption: notification.message },
          30_000
        );
      } else {
        await sendWithTimeout(client, notification.remoteId, notification.message);
      }
      updates.push({
        filter: { _id: notificationId },
        update: {
          $set: { status: "sent", sentAt: nowFn(), lastError: null },
        },
      });
      logger.info("whatsapp notification sent", {
        clinicId: notification.clinicId ?? null,
        organizationId: notification.organizationId,
        type: notification.type,
      });
      sent += 1;
    } catch (err) {
      const attempts = notification.attempts + 1;
      const lastError = err instanceof Error ? err.message : String(err);
      updates.push({
        filter: { _id: notificationId },
        update: {
          $set: {
            attempts,
            lastError,
            status: attempts >= MAX_ATTEMPTS ? "failed" : "queued",
          },
        },
      });
      logger.warn("whatsapp notification send failed", {
        clinicId: notification.clinicId ?? null,
        organizationId: notification.organizationId,
        type: notification.type,
        attempts,
      });
      failed += 1;
    }
  }

  if (updates.length) {
    await db.collection(NOTIFICATIONS_COLLECTION).bulkWrite(
      updates.map((u) => ({
        updateOne: { filter: u.filter, update: u.update },
      })),
      { ordered: false }
    );
  }

  return { sent, failed };
}

/**
 * Drains queued notifications across every connected WhatsApp connection.
 *
 * `clientsByRoute` maps a routing key to that connection's client:
 * - `LEGACY_SESSION_KEY` → the central bot connection (legacy notifications).
 * - any clinicId → that clinic's own connection.
 * Batches whose connection isn't currently connected stay queued.
 */
export async function processDueNotificationsForClients(
  db: Db,
  clientsByRoute: Map<string, Client>
): Promise<{ sent: number; failed: number; skipped: number }> {
  const queued = await db
    .collection<NotificationDoc>(NOTIFICATIONS_COLLECTION)
    .find({ status: "queued" })
    .sort({ createdAt: 1 })
    .limit(BATCH_LIMIT)
    .project({ mediaData: 0 })
    .toArray();

  const groups = new Map<string, NotificationDoc[]>();
  for (const doc of queued) {
    const route = doc.clinicId || LEGACY_SESSION_KEY;
    const group = groups.get(route);
    if (group) group.push(doc);
    else groups.set(route, [doc]);
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const [route, batch] of groups) {
    const client = clientsByRoute.get(route);
    if (!client?.info) {
      skipped += batch.length;
      continue;
    }
    const result = await sendBatch(client, db, batch);
    sent += result.sent;
    failed += result.failed;
  }

  return { sent, failed, skipped };
}
