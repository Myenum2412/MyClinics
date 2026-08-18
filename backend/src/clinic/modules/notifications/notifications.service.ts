import type { Db, WithId } from "mongodb";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import { requireClinicOf, type ClinicContext } from "@/clinic/core/context";
import { NotFoundError } from "@/clinic/core/errors";
import { generateNotificationId } from "@/clinic/core/ids";
import { NotificationRepository } from "@/clinic/modules/notifications/notifications.repository";
import type { NotificationDoc } from "@/clinic/modules/notifications/notifications.schema";

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
}