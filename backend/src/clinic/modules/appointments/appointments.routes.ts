import type { FastifyInstance } from "fastify";
import { AppointmentController } from "@/clinic/modules/appointments/appointments.controller";
import {
  requireClinicAccess,
  requireRoles,
} from "@/clinic/core/scope";
import { getAppointmentsDb } from "@/lib/db-pools";

/**
 * Appointment routes — scoped to the URL clinic AND to the caller's
 * doctor/patient ownership (repository enforces doctorId/patientId).
 *
 *   POST   /api/clinics/:clinicId/appointments          staff+ | doctor (own patients)
 *   GET    /api/clinics/:clinicId/appointments          staff+ | doctor (own) | patient (own)
 *   GET    /api/clinics/:clinicId/appointments/:appointmentId  staff+ | owner
 *   PATCH  /api/clinics/:clinicId/appointments/:appointmentId  staff+ | owner
 *   DELETE /api/clinics/:clinicId/appointments/:appointmentId  staff+ | doctor (own)
 */
export function registerAppointmentRoutes(app: FastifyInstance): void {
  const controller = new AppointmentController();

  app.post(
    "/api/clinics/:clinicId/appointments",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => controller.create(request, reply)
  );

  app.get(
    "/api/clinics/:clinicId/appointments",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => controller.list(request, reply)
  );

  app.get(
    "/api/clinics/:clinicId/appointments/notifications",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => {
      const { clinicId } = request.params as { clinicId: string };
      const db = await getAppointmentsDb();
      const notifications = await db.collection("clc_appointment_notifications")
        .find({ clinicId })
        .sort({ createdAt: -1 })
        .limit(200)
        .toArray();
      return reply.send({ notifications });
    }
  );

  app.get(
    "/api/clinics/:clinicId/appointments/:appointmentId/notifications",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => {
      const { clinicId, appointmentId } = request.params as { clinicId: string; appointmentId: string };
      const db = await getAppointmentsDb();
      const notifications = await db.collection("clc_appointment_notifications")
        .find({ clinicId, appointmentId })
        .sort({ createdAt: -1 })
        .toArray();
      return reply.send({ notifications });
    }
  );

  app.get(
    "/api/clinics/:clinicId/appointments/:appointmentId",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => controller.getById(request, reply)
  );

  app.patch(
    "/api/clinics/:clinicId/appointments/:appointmentId",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => controller.updateById(request, reply)
  );

  app.delete(
    "/api/clinics/:clinicId/appointments/:appointmentId",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => controller.delete(request, reply)
  );

  // ----- Token / Queue management -----

  app.get(
    "/api/clinics/:clinicId/appointments/queue",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => controller.getQueue(request, reply)
  );

  app.post(
    "/api/clinics/:clinicId/appointments/:appointmentId/check-in",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => controller.checkIn(request, reply)
  );

  app.post(
    "/api/clinics/:clinicId/appointments/call-next",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => controller.callNext(request, reply)
  );

  app.post(
    "/api/clinics/:clinicId/appointments/:appointmentId/start-consultation",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => controller.startConsultation(request, reply)
  );

  app.post(
    "/api/clinics/:clinicId/appointments/:appointmentId/skip",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => controller.skip(request, reply)
  );

  app.post(
    "/api/clinics/:clinicId/appointments/:appointmentId/recall",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => controller.recall(request, reply)
  );

  app.post(
    "/api/clinics/:clinicId/appointments/:appointmentId/complete",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => controller.complete(request, reply)
  );

  app.post(
    "/api/clinics/:clinicId/appointments/:appointmentId/no-show",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => controller.noShow(request, reply)
  );

  app.post(
    "/api/clinics/:clinicId/appointments/:appointmentId/cancel",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => controller.cancelQueue(request, reply)
  );

  app.post(
    "/api/clinics/:clinicId/appointments/:appointmentId/reschedule",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => controller.rescheduleQueue(request, reply)
  );

  app.get(
    "/api/clinics/:clinicId/appointments/queue-settings",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => controller.getQueueSettings(request, reply)
  );

  app.put(
    "/api/clinics/:clinicId/appointments/queue-settings",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => controller.saveQueueSettings(request, reply)
  );
}