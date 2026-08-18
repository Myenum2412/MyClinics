import type { FastifyInstance } from "fastify";
import { MedicineController } from "@/clinic/modules/medicine/medicine.controller";
import {
  requireClinicAccess,
  requireRoles,
} from "@/clinic/core/scope";

/**
 * Medicine routes — scoped to the URL clinic AND to the caller's
 * doctor/patient ownership (repository enforces doctorId/patientId).
 *
 *   POST   /api/clinics/:clinicId/medicine               doctor+
 *   GET    /api/clinics/:clinicId/medicine               doctor+ | patient (own)
 *   GET    /api/clinics/:clinicId/medicine/:recordId     doctor+ | patient (own)
 *   PATCH  /api/clinics/:clinicId/medicine/:recordId     doctor+ | patient (own)
 *   DELETE /api/clinics/:clinicId/medicine/:recordId     clinic_admin
 */
export function registerMedicineRoutes(app: FastifyInstance): void {
  const controller = new MedicineController();

  app.post(
    "/api/clinics/:clinicId/medicine",
    { preHandler: [requireClinicAccess, requireRoles("doctor")] },
    async (request, reply) => controller.create(request, reply)
  );

  app.get(
    "/api/clinics/:clinicId/medicine",
    { preHandler: [requireClinicAccess, requireRoles("doctor")] },
    async (request, reply) => controller.list(request, reply)
  );

  app.get(
    "/api/clinics/:clinicId/medicine/:recordId",
    { preHandler: [requireClinicAccess, requireRoles("doctor")] },
    async (request, reply) => controller.getById(request, reply)
  );

  app.patch(
    "/api/clinics/:clinicId/medicine/:recordId",
    { preHandler: [requireClinicAccess, requireRoles("doctor")] },
    async (request, reply) => controller.updateById(request, reply)
  );

  app.delete(
    "/api/clinics/:clinicId/medicine/:recordId",
    { preHandler: [requireClinicAccess, requireRoles("clinic_admin")] },
    async (request, reply) => controller.delete(request, reply)
  );
}
