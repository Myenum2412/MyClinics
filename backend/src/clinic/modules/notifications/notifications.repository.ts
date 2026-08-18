import type { Db, WithId } from "mongodb";
import type { NotificationDoc } from "@/clinic/modules/notifications/notifications.schema";

/**
 * Notification repository — recipient-scoped. Only the recipient user
 * (or clinic staff) may read; the service enforces the recipient boundary.
 */
export class NotificationRepository {
  constructor(
    private readonly db: Db,
    private readonly clinicId: string
  ) {}

  private collection() {
    return this.db.collection<NotificationDoc>("clc_notifications");
  }

  async listForRecipient(
    recipientUserId: string,
    query: { unreadOnly?: boolean; skip: number; limit: number }
  ): Promise<[WithId<NotificationDoc>[], number]> {
    const filter: Record<string, unknown> = {
      clinicId: this.clinicId,
      recipientUserId,
    };
    if (query.unreadOnly) filter.readAt = null;
    const [items, total] = await Promise.all([
      this.collection()
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .toArray(),
      this.collection().countDocuments(filter),
    ]);
    return [items, total];
  }

  async findByNotificationId(notificationId: string): Promise<WithId<NotificationDoc> | null> {
    return this.collection().findOne({ clinicId: this.clinicId, notificationId });
  }

  async create(
    doc: Omit<NotificationDoc, "_id" | "clinicId" | "createdAt">
  ): Promise<WithId<NotificationDoc>> {
    await this.collection().insertOne({
      ...doc,
      clinicId: this.clinicId,
      createdAt: new Date(),
    } as never);
    return (await this.findByNotificationId(doc.notificationId)) as WithId<NotificationDoc>;
  }

  async markRead(notificationId: string, recipientUserId: string): Promise<boolean> {
    const result = await this.collection().updateOne(
      { clinicId: this.clinicId, notificationId, recipientUserId },
      { $set: { readAt: new Date() } }
    );
    return result.matchedCount === 1;
  }

  async markAllRead(recipientUserId: string): Promise<number> {
    const result = await this.collection().updateMany(
      { clinicId: this.clinicId, recipientUserId, readAt: null },
      { $set: { readAt: new Date() } }
    );
    return result.modifiedCount;
  }

  async countUnread(recipientUserId: string): Promise<number> {
    return this.collection().countDocuments({
      clinicId: this.clinicId,
      recipientUserId,
      readAt: null,
    });
  }
}