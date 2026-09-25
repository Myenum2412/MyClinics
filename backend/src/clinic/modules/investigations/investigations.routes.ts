import type { FastifyInstance } from "fastify";
import { InvestigationController } from "@/clinic/modules/investigations/investigations.controller";
import { requireClinicAccess, requireRoles } from "@/clinic/core/scope";

/**
 * Investigation routes — scoped to the URL clinic AND to the caller's
 * doctor/patient ownership (repository enforces doctorId/patientId).
 *
 *   POST   /api/clinics/:clinicId/investigations                  doctor+ (create)
 *   GET    /api/clinics/:clinicId/investigations                  everyone (list, scoped)
 *   GET    /api/clinics/:clinicId/investigations/:investigationId everyone (scoped)
 *   PATCH  /api/clinics/:clinicId/investigations/:investigationId doctor+ (update)
 *   DELETE /api/clinics/:clinicId/investigations/:investigationId clinic_admin
 */
export function registerInvestigationRoutes(app: FastifyInstance): void {
  const controller = new InvestigationController();

  app.post(
    "/api/clinics/:clinicId/investigations",
    { preHandler: [requireClinicAccess, requireRoles("doctor")] },
    async (request, reply) => controller.create(request, reply)
  );

  app.get(
    "/api/clinics/:clinicId/investigations",
    { preHandler: [requireClinicAccess, requireRoles("patient")] },
    async (request, reply) => controller.list(request, reply)
  );

  app.get(
    "/api/clinics/:clinicId/investigations/:investigationId",
    { preHandler: [requireClinicAccess, requireRoles("patient")] },
    async (request, reply) => controller.getById(request, reply)
  );

  app.patch(
    "/api/clinics/:clinicId/investigations/:investigationId",
    { preHandler: [requireClinicAccess, requireRoles("doctor")] },
    async (request, reply) => controller.updateById(request, reply)
  );

  app.delete(
    "/api/clinics/:clinicId/investigations/:investigationId",
    { preHandler: [requireClinicAccess, requireRoles("clinic_admin")] },
    async (request, reply) => controller.delete(request, reply)
  );
}
