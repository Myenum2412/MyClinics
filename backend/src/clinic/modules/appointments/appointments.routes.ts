import type { FastifyInstance } from "fastify";
import { AppointmentController } from "@/clinic/modules/appointments/appointments.controller";
import {
  requireClinicAccess,
  requireRoles,
} from "@/clinic/core/scope";
import { getDb } from "@/lib/db";

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
    { preHandler: [requireClinicAccess, requireRoles("doctor")] },
    async (request, reply) => controller.create(request, reply)
  );

  app.get(
    "/api/clinics/:clinicId/appointments",
    { preHandler: [requireClinicAccess, requireRoles("patient")] },
    async (request, reply) => controller.list(request, reply)
  );

  app.get(
    "/api/clinics/:clinicId/appointments/notifications",
    { preHandler: [requireClinicAccess, requireRoles("doctor")] },
    async (request, reply) => {
      const { clinicId } = request.params as { clinicId: string };
      const db = await getDb();
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
    { preHandler: [requireClinicAccess, requireRoles("doctor")] },
    async (request, reply) => {
      const { clinicId, appointmentId } = request.params as { clinicId: string; appointmentId: string };
      const db = await getDb();
      const notifications = await db.collection("clc_appointment_notifications")
        .find({ clinicId, appointmentId })
        .sort({ createdAt: -1 })
        .toArray();
      return reply.send({ notifications });
    }
  );

  app.get(
    "/api/clinics/:clinicId/appointments/:appointmentId",
    { preHandler: [requireClinicAccess, requireRoles("patient")] },
    async (request, reply) => controller.getById(request, reply)
  );

  app.patch(
    "/api/clinics/:clinicId/appointments/:appointmentId",
    { preHandler: [requireClinicAccess, requireRoles("doctor")] },
    async (request, reply) => controller.updateById(request, reply)
  );

  app.delete(
    "/api/clinics/:clinicId/appointments/:appointmentId",
    { preHandler: [requireClinicAccess, requireRoles("doctor")] },
    async (request, reply) => controller.delete(request, reply)
  );
}