import wpp from "whatsapp-web.js";
import type { Client } from "whatsapp-web.js";

const { MessageMedia } = wpp;
import type { Db, ObjectId } from "mongodb";
import { logger } from "@/lib/logger";
import { toWhatsAppRemoteId } from "@/lib/phone";
import { todayDateString } from "@/lib/stats";
import { ensureDefaultOrganization } from "@/services/customer/customer-context.service";
import { getNextQueuedAppointment } from "@/services/queue.service";
import { sendWithTimeout } from "@/services/whatsapp/send.utils";

export const NOTIFICATIONS_COLLECTION = "wa_notifications";
const MAX_ATTEMPTS = 3;

export type NotificationStatus = "queued" | "sent" | "failed";

export interface NotificationMedia {
  filename: string;
  mimetype: string;
  data: string;
}

export interface NotificationDoc {
  type: string;
  organizationId: string;
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

/** Queues a WhatsApp message (optionally with a media attachment) that the worker sends as soon as it is ready. */
export async function enqueueNotification(
  db: Db,
  organizationId: string,
  phone: string,
  message: string,
  type: string,
  media?: NotificationMedia
): Promise<{ queued: boolean; remoteId: string | null }> {
  const remoteId = toWhatsAppRemoteId(phone);
  if (!remoteId) return { queued: false, remoteId: null };

  await db.collection(NOTIFICATIONS_COLLECTION).insertOne({
    type,
    organizationId,
    remoteId,
    message,
    status: "queued",
    attempts: 0,
    lastError: null,
    createdAt: new Date(),
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
 * Queues a WhatsApp message to a patient, resolving the default organization
 * internally. Returns a no-op result when the phone number can't be used.
 */
export async function enqueueClinicNotification(
  db: Db,
  phone: string,
  message: string,
  type: string,
  media?: NotificationMedia
): Promise<{ queued: boolean; remoteId: string | null }> {
  const org = await ensureDefaultOrganization(db);
  return enqueueNotification(db, org.id, phone, message, type, media);
}

/** Sends queued notifications through the connected WhatsApp client. */
export async function processDueNotifications(
  client: Client,
  db: Db,
  organizationId: string
): Promise<{ sent: number; failed: number; pending: number }> {
  if (!client.info) return { sent: 0, failed: 0, pending: 0 };

  const queued = await db
    .collection<NotificationDoc>(NOTIFICATIONS_COLLECTION)
    .find({ organizationId, status: "queued" })
    .limit(20)
    .toArray();

  let sent = 0;
  let failed = 0;
  const updates: {
    filter: { _id: ObjectId };
    update: Record<string, unknown>;
  }[] = [];

  for (const notification of queued) {
    if (!notification.remoteId) {
      updates.push({
        filter: { _id: notification._id },
        update: {
          $set: { status: "failed", attempts: notification.attempts + 1 },
        },
      });
      failed += 1;
      continue;
    }
    try {
      if (notification.mediaData && notification.mediaMimetype) {
        const media = new MessageMedia(
          notification.mediaMimetype,
          notification.mediaData,
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
        filter: { _id: notification._id },
        update: {
          $set: { status: "sent", sentAt: new Date(), lastError: null },
        },
      });
      logger.info("whatsapp notification sent", {
        organizationId,
        type: notification.type,
      });
      sent += 1;
    } catch (err) {
      const attempts = notification.attempts + 1;
      const lastError = err instanceof Error ? err.message : String(err);
      updates.push({
        filter: { _id: notification._id },
        update: {
          $set: {
            attempts,
            lastError,
            status: attempts >= MAX_ATTEMPTS ? "failed" : "queued",
          },
        },
      });
      logger.warn("whatsapp notification send failed", {
        organizationId,
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

  return { sent, failed, pending: queued.length - sent - failed };
}
