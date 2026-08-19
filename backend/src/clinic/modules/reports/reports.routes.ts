import type { FastifyInstance } from "fastify";
import { ReportController } from "@/clinic/modules/reports/reports.controller";
import {
  requireClinicAccess,
  requireRoles,
} from "@/clinic/core/scope";

/**
 * Report routes — scoped to the URL clinic AND to the caller's
 * doctor/patient ownership (repository enforces doctorId/patientId).
 *
 *   POST   /api/clinics/:clinicId/reports                staff+ | doctor (own patients)
 *   GET    /api/clinics/:clinicId/reports                staff+ | doctor (own) | patient (own)
 *   GET    /api/clinics/:clinicId/reports/:reportId      staff+ | doctor (own) | patient (own)
 *   PATCH  /api/clinics/:clinicId/reports/:reportId      staff+ | doctor (own patients)
 *   DELETE /api/clinics/:clinicId/reports/:reportId      clinic_admin
 */
export function registerReportRoutes(app: FastifyInstance): void {
  const controller = new ReportController();

  app.post(
    "/api/clinics/:clinicId/reports",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => controller.create(request, reply)
  );

  app.get(
    "/api/clinics/:clinicId/reports",
    { preHandler: [requireClinicAccess, requireRoles("doctor")] },
    async (request, reply) => controller.list(request, reply)
  );

  app.get(
    "/api/clinics/:clinicId/reports/:reportId",
    { preHandler: [requireClinicAccess, requireRoles("doctor")] },
    async (request, reply) => controller.getById(request, reply)
  );

  app.patch(
    "/api/clinics/:clinicId/reports/:reportId",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => controller.updateById(request, reply)
  );

  app.delete(
    "/api/clinics/:clinicId/reports/:reportId",
    { preHandler: [requireClinicAccess, requireRoles("clinic_admin")] },
    async (request, reply) => controller.delete(request, reply)
  );
}