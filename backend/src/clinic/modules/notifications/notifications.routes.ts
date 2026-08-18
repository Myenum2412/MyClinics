import type { FastifyInstance } from "fastify";
import { NotificationController } from "@/clinic/modules/notifications/notifications.controller";
import {
  requireClinicAccess,
  requireRoles,
} from "@/clinic/core/scope";

/**
 * Notification routes — users see ONLY their own notifications (service
 * enforces recipientUserId === ctx.userId for reads).
 *
 *   GET    /api/clinics/:clinicId/notifications            any clinic member (own)
 *   POST   /api/clinics/:clinicId/notifications            staff+
 *   POST   /api/clinics/:clinicId/notifications/read-all   any clinic member (own)
 *   POST   /api/clinics/:clinicId/notifications/:notificationId/read  any clinic member (own)
 */
export function registerNotificationRoutes(app: FastifyInstance): void {
  const controller = new NotificationController();

  app.get(
    "/api/clinics/:clinicId/notifications",
    { preHandler: requireClinicAccess },
    async (request, reply) => controller.list(request, reply)
  );

  app.post(
    "/api/clinics/:clinicId/notifications",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => controller.create(request, reply)
  );

  app.post(
    "/api/clinics/:clinicId/notifications/read-all",
    { preHandler: requireClinicAccess },
    async (request, reply) => controller.markAllRead(request, reply)
  );

  app.post(
    "/api/clinics/:clinicId/notifications/:notificationId/read",
    { preHandler: requireClinicAccess },
    async (request, reply) => controller.markRead(request, reply)
  );
}