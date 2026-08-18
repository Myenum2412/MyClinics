import type { FastifyInstance } from "fastify";
import { StaffController } from "@/clinic/modules/staff/staff.controller";
import {
  requireClinicAccess,
  requireRoles,
} from "@/clinic/core/scope";

/**
 * Staff routes — always scoped to the URL clinic (verified against the
 * session). A staff member may edit only their own profile (service-level).
 *
 *   GET    /api/clinics/:clinicId/staff              clinic staff roles
 *   POST   /api/clinics/:clinicId/staff              clinic_admin
 *   GET    /api/clinics/:clinicId/staff/:staffId     clinic staff roles
 *   PATCH  /api/clinics/:clinicId/staff/:staffId     clinic_admin | staff (self)
 *   DELETE /api/clinics/:clinicId/staff/:staffId     clinic_admin
 */
export function registerStaffRoutes(app: FastifyInstance): void {
  const controller = new StaffController();

  app.get(
    "/api/clinics/:clinicId/staff",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => controller.list(request, reply)
  );

  app.post(
    "/api/clinics/:clinicId/staff",
    { preHandler: [requireClinicAccess, requireRoles("clinic_admin")] },
    async (request, reply) => controller.create(request, reply)
  );

  app.get(
    "/api/clinics/:clinicId/staff/:staffId",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => controller.getById(request, reply)
  );

  app.patch(
    "/api/clinics/:clinicId/staff/:staffId",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => controller.updateById(request, reply)
  );

  app.delete(
    "/api/clinics/:clinicId/staff/:staffId",
    { preHandler: [requireClinicAccess, requireRoles("clinic_admin")] },
    async (request, reply) => controller.delete(request, reply)
  );
}