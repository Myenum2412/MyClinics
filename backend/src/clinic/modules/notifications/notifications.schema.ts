import type { ClinicDocument } from "@/clinic/core/repository";

export const NOTIFICATION_TYPES = [
  "appointment",
  "bill",
  "report",
  "prescription",
  "general",
] as const;

export interface NotificationDoc extends ClinicDocument {
  clinicId: string;
  notificationId: string;
  /** Recipient user account — the ONLY user who may see this notification. */
  recipientUserId: string;
  type: (typeof NOTIFICATION_TYPES)[number];
  title: string;
  body: string | null;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export function notificationToPublic(doc: NotificationDoc) {
  return {
    notificationId: doc.notificationId,
    type: doc.type,
    title: doc.title,
    body: doc.body,
    link: doc.link,
    readAt: doc.readAt,
    createdAt: doc.createdAt,
  };
}