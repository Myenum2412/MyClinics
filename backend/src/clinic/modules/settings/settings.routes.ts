import type { FastifyInstance } from "fastify";
import { SettingsController } from "@/clinic/modules/settings/settings.controller";
import {
  requireClinicAccess,
  requireRoles,
} from "@/clinic/core/scope";

/**
 * Settings routes.
 *
 *   GET   /api/clinics/:clinicId/settings   clinic staff roles
 *   PATCH /api/clinics/:clinicId/settings   clinic_admin
 */
export function registerSettingsRoutes(app: FastifyInstance): void {
  const controller = new SettingsController();

  app.get(
    "/api/clinics/:clinicId/settings",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => controller.get(request, reply)
  );

  app.patch(
    "/api/clinics/:clinicId/settings",
    { preHandler: [requireClinicAccess, requireRoles("clinic_admin")] },
    async (request, reply) => controller.update(request, reply)
  );
}