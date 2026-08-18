import type { FastifyInstance } from "fastify";
import { UsersController } from "@/clinic/modules/users/users.controller";
import {
  requireClinicAccess,
  requireRoles,
} from "@/clinic/core/scope";

/**
 * User account routes — clinic_admin only, always scoped to the URL clinic
 * (which must equal the session clinic).
 *
 *   GET    /api/clinics/:clinicId/users              clinic_admin
 *   POST   /api/clinics/:clinicId/users              clinic_admin (link to existing profile)
 *   PATCH  /api/clinics/:clinicId/users/:userId      clinic_admin
 *   DELETE /api/clinics/:clinicId/users/:userId      clinic_admin (soft deactivate)
 */
export function registerUserRoutes(app: FastifyInstance): void {
  const controller = new UsersController();

  app.get(
    "/api/clinics/:clinicId/users",
    { preHandler: [requireClinicAccess, requireRoles("clinic_admin")] },
    async (request, reply) => controller.list(request, reply)
  );

  app.post(
    "/api/clinics/:clinicId/users",
    { preHandler: [requireClinicAccess, requireRoles("clinic_admin")] },
    async (request, reply) => controller.create(request, reply)
  );

  app.patch(
    "/api/clinics/:clinicId/users/:userId",
    { preHandler: [requireClinicAccess, requireRoles("clinic_admin")] },
    async (request, reply) => controller.update(request, reply)
  );

  app.delete(
    "/api/clinics/:clinicId/users/:userId",
    { preHandler: [requireClinicAccess, requireRoles("clinic_admin")] },
    async (request, reply) => controller.deactivate(request, reply)
  );
}