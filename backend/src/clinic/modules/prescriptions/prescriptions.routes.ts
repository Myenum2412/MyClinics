import type { FastifyInstance } from "fastify";
import { PrescriptionController } from "@/clinic/modules/prescriptions/prescriptions.controller";
import {
  requireClinicAccess,
  requireRoles,
} from "@/clinic/core/scope";

/**
 * Prescription routes — scoped to the URL clinic AND to the caller's
 * doctor/patient ownership (repository enforces doctorId/patientId).
 *
 *   POST   /api/clinics/:clinicId/prescriptions               doctor+
 *   GET    /api/clinics/:clinicId/prescriptions               doctor+ | patient (own)
 *   GET    /api/clinics/:clinicId/prescriptions/:prescriptionId  doctor+ | patient (own)
 *   PATCH  /api/clinics/:clinicId/prescriptions/:prescriptionId  doctor+ | patient (own)
 *   DELETE /api/clinics/:clinicId/prescriptions/:prescriptionId  clinic_admin
 */
export function registerPrescriptionRoutes(app: FastifyInstance): void {
  const controller = new PrescriptionController();

  app.post(
    "/api/clinics/:clinicId/prescriptions",
    { preHandler: [requireClinicAccess, requireRoles("doctor")] },
    async (request, reply) => controller.create(request, reply)
  );

  app.get(
    "/api/clinics/:clinicId/prescriptions",
    { preHandler: [requireClinicAccess, requireRoles("doctor")] },
    async (request, reply) => controller.list(request, reply)
  );

  app.get(
    "/api/clinics/:clinicId/prescriptions/:prescriptionId",
    { preHandler: [requireClinicAccess, requireRoles("doctor")] },
    async (request, reply) => controller.getById(request, reply)
  );

  app.patch(
    "/api/clinics/:clinicId/prescriptions/:prescriptionId",
    { preHandler: [requireClinicAccess, requireRoles("doctor")] },
    async (request, reply) => controller.updateById(request, reply)
  );

  app.delete(
    "/api/clinics/:clinicId/prescriptions/:prescriptionId",
    { preHandler: [requireClinicAccess, requireRoles("clinic_admin")] },
    async (request, reply) => controller.delete(request, reply)
  );
}