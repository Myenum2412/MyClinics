import type { Db, WithId } from "mongodb";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import { requireClinicOf, type ClinicContext } from "@/clinic/core/context";
import { NotFoundError } from "@/clinic/core/errors";
import { generateNotificationId } from "@/clinic/core/ids";
import { NotificationRepository } from "@/clinic/modules/notifications/notifications.repository";
import type { NotificationDoc } from "@/clinic/modules/notifications/notifications.schema";
import {
  enqueueClinicNotification,
  type NotificationMedia,
} from "@/services/whatsapp/notification.service";

/** An attachment queued for WhatsApp delivery (raw bytes, base64-encoded on enqueue). */
export interface WhatsappAttachment {
  filename: string;
  mimetype: string;
  data: Buffer;
}

export interface WhatsappBroadcastInput {
  all: boolean;
  patientIds: string[];
  type: NotificationDoc["type"];
  title: string;
  message: string;
}

export interface WhatsappBroadcastResult {
  targeted: number;
  queued: number;
  messagesQueued: number;
  skippedNoPhone: number;
}

export class NotificationService {
  constructor(private readonly db: Db) {}

  private repo(ctx: ClinicContext): NotificationRepository {
    return new NotificationRepository(this.db, requireClinicOf(ctx));
  }

  /**
   * Users may only ever see their OWN notifications. Staff can create
   * notifications for other users (e.g. bill reminders).
   */
  async listMine(
    ctx: ClinicContext,
    query: { unreadOnly?: boolean; skip: number; limit: number }
  ) {
    const [items, total] = await this.repo(ctx).listForRecipient(ctx.userId, query);
    const unread = await this.repo(ctx).countUnread(ctx.userId);
    return { items, total, unread };
  }

  async create(
    ctx: ClinicContext,
    input: {
      recipientUserId: string;
      type: NotificationDoc["type"];
      title: string;
      body?: string | null;
      link?: string | null;
    }
  ): Promise<WithId<NotificationDoc>> {
    // Validate the recipient exists in this clinic.
    const recipient = await this.db
      .collection(CLINIC_COLLECTIONS.users)
      .findOne({ clinicId: requireClinicOf(ctx), userId: input.recipientUserId });
    if (!recipient) {
      throw new NotFoundError("Recipient not found");
    }

    return this.repo(ctx).create({
      notificationId: generateNotificationId(),
      recipientUserId: input.recipientUserId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
      readAt: null,
    });
  }

  async markRead(ctx: ClinicContext, notificationId: string): Promise<void> {
    const ok = await this.repo(ctx).markRead(notificationId, ctx.userId);
    if (!ok) throw new NotFoundError("Notification not found");
  }

  async markAllRead(ctx: ClinicContext): Promise<number> {
    return this.repo(ctx).markAllRead(ctx.userId);
  }

  /**
   * Broadcasts a WhatsApp message (with optional attachments) to the selected
   * patients — or every active patient in the clinic when `all` is set.
   *
   * WhatsApp delivers one media file per message, so each attachment becomes
   * its own queued message per patient; only the first carries the text as
   * its caption. Patients without a usable phone number are skipped.
   */
  async sendWhatsappBroadcast(
    ctx: ClinicContext,
    input: WhatsappBroadcastInput,
    attachments: WhatsappAttachment[]
  ): Promise<WhatsappBroadcastResult> {
    const clinicId = requireClinicOf(ctx);

    const filter: Record<string, unknown> = {
      clinicId,
      status: { $ne: "deleted" },
    };
    if (!input.all) filter.patientId = { $in: input.patientIds };
    // Doctors may only ever message patients assigned to them.
    if (ctx.role === "doctor") filter.doctorId = ctx.doctorId ?? null;

    const patients = await this.db
      .collection<{
        patientId: string;
        fullName: string;
        mobile: string;
        whatsapp: string | null;
      }>(CLINIC_COLLECTIONS.patients)
      .find(filter)
      .project({ patientId: 1, fullName: 1, mobile: 1, whatsapp: 1 })
      .toArray();

    const text = [input.title, input.message].filter(Boolean).join("\n\n");

    let messagesQueued = 0;
    let queuedPatients = 0;
    let skippedNoPhone = 0;

    for (const patient of patients) {
      const phone = (patient.whatsapp ?? "").trim() || (patient.mobile ?? "").trim();
      if (!phone) {
        skippedNoPhone += 1;
        continue;
      }

      if (attachments.length === 0) {
        await enqueueClinicNotification(this.db, phone, text, input.type, undefined, clinicId);
        messagesQueued += 1;
      } else {
        for (const [index, attachment] of attachments.entries()) {
          const media: NotificationMedia = {
            filename: attachment.filename,
            mimetype: attachment.mimetype,
            data: attachment.data.toString("base64"),
          };
          // Caption goes on the first attachment; the rest are plain files.
          await enqueueClinicNotification(
            this.db,
            phone,
            index === 0 ? text : "",
            input.type,
            media,
            clinicId
          );
          messagesQueued += 1;
        }
      }
      queuedPatients += 1;
    }

    return {
      targeted: patients.length,
      queued: queuedPatients,
      messagesQueued,
      skippedNoPhone,
    };
  }
}