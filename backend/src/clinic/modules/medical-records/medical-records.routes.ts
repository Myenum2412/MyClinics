import type { FastifyInstance } from "fastify";
import { MedicalRecordController } from "@/clinic/modules/medical-records/medical-records.controller";
import {
  requireClinicAccess,
  requireRoles,
} from "@/clinic/core/scope";

/**
 * Medical record routes — scoped to the URL clinic AND to the caller's
 * doctor/patient ownership (repository enforces doctorId/patientId).
 *
 *   POST   /api/clinics/:clinicId/medical-records               doctor+
 *   GET    /api/clinics/:clinicId/medical-records               doctor+ | patient (own)
 *   GET    /api/clinics/:clinicId/medical-records/:recordId     doctor+ | patient (own)
 *   PATCH  /api/clinics/:clinicId/medical-records/:recordId     doctor+ | patient (own)
 *   DELETE /api/clinics/:clinicId/medical-records/:recordId     clinic_admin
 */
export function registerMedicalRecordRoutes(app: FastifyInstance): void {
  const controller = new MedicalRecordController();

  app.post(
    "/api/clinics/:clinicId/medical-records",
    { preHandler: [requireClinicAccess, requireRoles("doctor")] },
    async (request, reply) => controller.create(request, reply)
  );

  app.get(
    "/api/clinics/:clinicId/medical-records",
    { preHandler: [requireClinicAccess, requireRoles("doctor")] },
    async (request, reply) => controller.list(request, reply)
  );

  app.get(
    "/api/clinics/:clinicId/medical-records/:recordId",
    { preHandler: [requireClinicAccess, requireRoles("doctor")] },
    async (request, reply) => controller.getById(request, reply)
  );

  app.patch(
    "/api/clinics/:clinicId/medical-records/:recordId",
    { preHandler: [requireClinicAccess, requireRoles("doctor")] },
    async (request, reply) => controller.updateById(request, reply)
  );

  app.delete(
    "/api/clinics/:clinicId/medical-records/:recordId",
    { preHandler: [requireClinicAccess, requireRoles("clinic_admin")] },
    async (request, reply) => controller.delete(request, reply)
  );
}