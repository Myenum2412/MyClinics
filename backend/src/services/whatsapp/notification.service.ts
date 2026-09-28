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

export interface BatchNotificationItem {
  phone: string;
  message: string;
  media?: NotificationMedia;
}

/**
 * Same dedupe+enqueue semantics as `enqueueNotification`, but for many recipients at once: one
 * query covers dedupe-checking the whole batch (instead of a `findOne` per recipient), and inserts
 * are batched — used by clinic-wide broadcasts, which can target thousands of patients.
 */
export async function enqueueNotificationsBatch(
  db: Db,
  organizationId: string,
  type: string,
  items: BatchNotificationItem[],
  clinicId?: string | null
): Promise<{ queued: number; deduped: number; skippedNoPhone: number }> {
  if (items.length === 0) return { queued: 0, deduped: 0, skippedNoPhone: 0 };

  const withRemoteId: (BatchNotificationItem & { remoteId: string })[] = [];
  let skippedNoPhone = 0;
  for (const item of items) {
    const remoteId = toWhatsAppRemoteId(item.phone);
    if (!remoteId) {
      skippedNoPhone += 1;
      continue;
    }
    withRemoteId.push({ ...item, remoteId });
  }
  if (withRemoteId.length === 0) return { queued: 0, deduped: 0, skippedNoPhone };

  const dedupeWindowMs = 60_000;
  const since = new Date(Date.now() - dedupeWindowMs);
  const remoteIds = [...new Set(withRemoteId.map((i) => i.remoteId))];

  const existing = await db
    .collection(NOTIFICATIONS_COLLECTION)
    .find({
      organizationId,
      clinicId: clinicId ?? null,
      type,
      status: { $in: ["queued", "processing"] },
      createdAt: { $gte: since },
      remoteId: { $in: remoteIds },
    } as any)
    .project({ remoteId: 1, message: 1, mediaFilename: 1 })
    .toArray();

  const seenKeys = new Set(
    existing.map((e: any) => `${e.remoteId}\u0000${e.message}\u0000${e.mediaFilename ?? ""}`)
  );

  const now = nowFn();
  const docs: NotificationDoc[] = [];
  let deduped = 0;
  for (const item of withRemoteId) {
    const key = `${item.remoteId}\u0000${item.message}\u0000${item.media?.filename ?? ""}`;
    if (seenKeys.has(key)) {
      deduped += 1;
      continue;
    }
    // Guards against the same recipient+message appearing twice within this one batch too.
    seenKeys.add(key);
    docs.push({
      type,
      organizationId,
      clinicId: clinicId ?? null,
      remoteId: item.remoteId,
      message: item.message,
      status: "queued",
      attempts: 0,
      lastError: null,
      createdAt: now,
      sentAt: null,
      mediaFilename: item.media?.filename,
      mediaMimetype: item.media?.mimetype,
      mediaData: item.media?.data,
    });
  }

  // Chunked, not one giant insertMany — attachments carry base64 media, so an unbounded broadcast
  // could otherwise hold gigabytes of doc data in memory at once.
  const CHUNK_SIZE = 200;
  for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
    await db.collection(NOTIFICATIONS_COLLECTION).insertMany(docs.slice(i, i + CHUNK_SIZE) as any);
  }

  return { queued: docs.length, deduped, skippedNoPhone };
}
