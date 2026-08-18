import type { FastifyInstance } from "fastify";
import { AppointmentController } from "@/clinic/modules/appointments/appointments.controller";
import {
  requireClinicAccess,
  requireRoles,
} from "@/clinic/core/scope";

/**
 * Appointment routes — scoped to the URL clinic AND to the caller's
 * doctor/patient ownership (repository enforces doctorId/patientId).
 *
 *   POST   /api/clinics/:clinicId/appointments          staff+ | doctor (own patients)
 *   GET    /api/clinics/:clinicId/appointments          staff+ | doctor (own) | patient (own)
 *   GET    /api/clinics/:clinicId/appointments/:appointmentId  staff+ | owner
 *   PATCH  /api/clinics/:clinicId/appointments/:appointmentId  staff+ | owner
 *   DELETE /api/clinics/:clinicId/appointments/:appointmentId  clinic_admin
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
    { preHandler: [requireClinicAccess, requireRoles("doctor")] },
    async (request, reply) => controller.list(request, reply)
  );

  app.get(
    "/api/clinics/:clinicId/appointments/:appointmentId",
    { preHandler: [requireClinicAccess, requireRoles("doctor")] },
    async (request, reply) => controller.getById(request, reply)
  );

  app.patch(
    "/api/clinics/:clinicId/appointments/:appointmentId",
    { preHandler: [requireClinicAccess, requireRoles("doctor")] },
    async (request, reply) => controller.updateById(request, reply)
  );

  app.delete(
    "/api/clinics/:clinicId/appointments/:appointmentId",
    { preHandler: [requireClinicAccess, requireRoles("clinic_admin")] },
    async (request, reply) => controller.delete(request, reply)
  );
}