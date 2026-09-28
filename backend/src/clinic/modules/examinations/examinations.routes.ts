import type { FastifyInstance } from "fastify";
import { ExaminationController } from "@/clinic/modules/examinations/examinations.controller";
import { requireClinicAccess, requireRoles } from "@/clinic/core/scope";

/**
 * Examination routes — scoped to the URL clinic AND to the caller's
 * doctor/patient ownership (repository enforces doctorId/patientId).
 *
 *   POST   /api/clinics/:clinicId/examinations                  doctor+ (create)
 *   GET    /api/clinics/:clinicId/examinations                  everyone (list, scoped)
 *   GET    /api/clinics/:clinicId/examinations/:examinationId   everyone (scoped)
 *   PATCH  /api/clinics/:clinicId/examinations/:examinationId   doctor+ (update)
 *   DELETE /api/clinics/:clinicId/examinations/:examinationId   clinic_admin
 */
export function registerExaminationRoutes(app: FastifyInstance): void {
  const controller = new ExaminationController();

  app.post(
    "/api/clinics/:clinicId/examinations",
    { preHandler: [requireClinicAccess, requireRoles("doctor")] },
    async (request, reply) => controller.create(request, reply)
  );

  app.get(
    "/api/clinics/:clinicId/examinations",
    { preHandler: [requireClinicAccess, requireRoles("patient")] },
    async (request, reply) => controller.list(request, reply)
  );

  app.get(
    "/api/clinics/:clinicId/examinations/:examinationId",
    { preHandler: [requireClinicAccess, requireRoles("patient")] },
    async (request, reply) => controller.getById(request, reply)
  );

  app.patch(
    "/api/clinics/:clinicId/examinations/:examinationId",
    { preHandler: [requireClinicAccess, requireRoles("doctor")] },
    async (request, reply) => controller.updateById(request, reply)
  );

  app.delete(
    "/api/clinics/:clinicId/examinations/:examinationId",
    { preHandler: [requireClinicAccess, requireRoles("clinic_admin")] },
    async (request, reply) => controller.delete(request, reply)
  );
}
