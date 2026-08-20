import type { FastifyInstance } from "fastify";
import { ClinicController } from "@/clinic/modules/clinics/clinics.controller";
import { registerClinicWelcomeDocumentsRoutes } from "@/clinic/modules/clinics/clinic-welcome-documents.routes";
import {
  requireClinicAccess,
  requireRoles,
} from "@/clinic/core/scope";

/**
 * Clinic routes — registered INSIDE the clinic-scope plugin, so every
 * handler runs with a verified tenant context.
 *
 *   GET    /api/clinics                  platform_admin only
 *   POST   /api/clinics                  platform_admin only (create tenant)
 *   GET    /api/clinics/:clinicId        platform_admin | member of that clinic
 *   PATCH  /api/clinics/:clinicId        platform_admin | clinic_admin (own)
 *   POST   /api/clinics/:clinicId/suspend   platform_admin
 *   POST   /api/clinics/:clinicId/activate  platform_admin
 *   GET    /api/clinics/me               any clinic member (own clinic)
 *   PATCH  /api/clinics/me               clinic_admin (own clinic)
 */
export function registerClinicRoutes(app: FastifyInstance): void {
  const controller = new ClinicController();

  app.get("/api/clinics", { preHandler: requireRoles("platform_admin") }, async (request, reply) =>
    controller.list(request, reply)
  );

  app.post("/api/clinics", { preHandler: requireRoles("platform_admin") }, async (request, reply) =>
    controller.create(request, reply)
  );

  app.get(
    "/api/clinics/:clinicId",
    { preHandler: requireClinicAccess },
    async (request, reply) => controller.getById(request, reply)
  );

  app.patch(
    "/api/clinics/:clinicId",
    { preHandler: requireClinicAccess },
    async (request, reply) => controller.updateById(request, reply)
  );

  app.post(
    "/api/clinics/:clinicId/suspend",
    { preHandler: [requireClinicAccess, requireRoles("platform_admin")] },
    async (request, reply) => controller.suspend(request, reply)
  );

  app.post(
    "/api/clinics/:clinicId/activate",
    { preHandler: [requireClinicAccess, requireRoles("platform_admin")] },
    async (request, reply) => controller.activate(request, reply)
  );

  app.get("/api/clinics/me", async (request, reply) => controller.getOwn(request, reply));

  app.patch(
    "/api/clinics/me",
    { preHandler: requireRoles("clinic_admin") },
    async (request, reply) => controller.updateOwn(request, reply)
  );

  registerClinicWelcomeDocumentsRoutes(app);
}