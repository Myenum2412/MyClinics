import type { FastifyInstance } from "fastify";
import { ClinicWelcomeDocumentsController } from "@/clinic/modules/clinics/clinic-welcome-documents.controller";
import { requireRoles } from "@/clinic/core/scope";

/**
 * Clinic Welcome Documents routes — for managing welcome documents sent to new patients
 *
 *   GET    /api/clinics/me/welcome-documents           clinic_admin
 *   POST   /api/clinics/me/welcome-documents           clinic_admin (multipart/form-data)
 *   GET    /api/clinics/me/welcome-documents/:documentId  clinic_admin
 *   GET    /api/clinics/me/welcome-documents/:documentId/download  clinic_admin
 *   DELETE /api/clinics/me/welcome-documents/:documentId  clinic_admin
 */
export function registerClinicWelcomeDocumentsRoutes(app: FastifyInstance): void {
  const controller = new ClinicWelcomeDocumentsController();

  app.get(
    "/api/clinics/me/welcome-documents",
    { preHandler: requireRoles("clinic_admin") },
    async (request, reply) => controller.list(request, reply)
  );

  app.post(
    "/api/clinics/me/welcome-documents",
    { preHandler: requireRoles("clinic_admin") },
    async (request, reply) => controller.upload(request, reply)
  );

  app.get(
    "/api/clinics/me/welcome-documents/:documentId",
    { preHandler: requireRoles("clinic_admin") },
    async (request, reply) => controller.get(request, reply)
  );

  app.get(
    "/api/clinics/me/welcome-documents/:documentId/download",
    { preHandler: requireRoles("clinic_admin") },
    async (request, reply) => controller.download(request, reply)
  );

  app.delete(
    "/api/clinics/me/welcome-documents/:documentId",
    { preHandler: requireRoles("clinic_admin") },
    async (request, reply) => controller.delete(request, reply)
  );
}