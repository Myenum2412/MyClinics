import type { Db, ObjectId } from "mongodb";
import { logger } from "@/lib/logger";
import { now as nowFn } from "@/clinic/core/datetime";
import { toWhatsAppRemoteId } from "@/lib/phone";
import { todayDateString } from "@/lib/stats";
import { ensureDefaultOrganization } from "@/services/customer/customer-context.service";
import { getNextQueuedAppointment } from "@/services/queue.service";

export const NOTIFICATIONS_COLLECTION = "wa_notifications";
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
   * number (a gateway session). When null the platform's central session sends it.
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

/** Queues a WhatsApp message (optionally with a media attachment); the worker hands it to the gateway as soon as that number is connected. */
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

  // Deduplication: skip if an identical queued/processing notification exists within the last 60 seconds
  // This prevents double-send on form double-submit, retries, or broadcast loops that enqueue the same message to same recipient.
  const dedupeWindowMs = 60_000;
  const since = new Date(Date.now() - dedupeWindowMs);
  const existing = await db.collection(NOTIFICATIONS_COLLECTION).findOne({
    organizationId,
    clinicId: clinicId ?? null,
    remoteId,
    type,
    message,
    status: { $in: ["queued", "processing"] },
    createdAt: { $gte: since },
    // media must match as well (if one has media and other doesn't, they are different)
    ...(media ? { mediaFilename: media.filename } : { mediaFilename: { $exists: false } }),
  } as any);
  if (existing) {
    logger.info("whatsapp notification deduped (single send per form submit)", {
      clinicId: clinicId ?? null,
      organizationId,
      type,
      remoteId,
    });
    return { queued: false, remoteId };
  }

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
