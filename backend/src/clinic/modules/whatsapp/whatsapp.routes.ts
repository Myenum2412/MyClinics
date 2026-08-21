import type { FastifyInstance } from "fastify";
import { WhatsappController } from "@/clinic/modules/whatsapp/whatsapp.controller";
import {
  requireClinicAccess,
  requireRoles,
} from "@/clinic/core/scope";

/**
 * Per-clinic WhatsApp Web connection routes.
 *
 * Every clinic pairs its OWN WhatsApp number (own QR scan) so patient
 * notifications are delivered from that clinic's number. The heavy lifting
 * happens in the worker process; these endpoints only read status and queue
 * connection commands.
 *
 *   GET  /api/clinics/:clinicId/whatsapp/session    staff+        status + QR
 *   POST /api/clinics/:clinicId/whatsapp/session/connect     clinic_admin  start/pair
 *   POST /api/clinics/:clinicId/whatsapp/session/disconnect  clinic_admin  stop; body { logout?: true } unlinks the device
 */
export function registerWhatsappRoutes(app: FastifyInstance): void {
  const controller = new WhatsappController();

  app.get(
    "/api/clinics/:clinicId/whatsapp/session",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => controller.getSession(request, reply)
  );

  app.post(
    "/api/clinics/:clinicId/whatsapp/session/connect",
    { preHandler: [requireClinicAccess, requireRoles("clinic_admin")] },
    async (request, reply) => controller.connect(request, reply)
  );

  app.post(
    "/api/clinics/:clinicId/whatsapp/session/disconnect",
    { preHandler: [requireClinicAccess, requireRoles("clinic_admin")] },
    async (request, reply) => controller.disconnect(request, reply)
  );
}
