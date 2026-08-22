import type { FastifyInstance } from "fastify";
import { ClinicWelcomeDocumentsController } from "@/clinic/modules/clinics/clinic-welcome-documents.controller";
import { requireClinicAccess, requireRoles } from "@/clinic/core/scope";

/**
 * Clinic Welcome Documents / Attachments routes — for managing clinic documents
 */
export function registerClinicWelcomeDocumentsRoutes(app: FastifyInstance): void {
  const controller = new ClinicWelcomeDocumentsController();
  const gate = [requireClinicAccess, requireRoles("staff")];

  app.get(
    "/api/clinics/me/welcome-documents",
    { preHandler: gate },
    async (request, reply) => controller.list(request, reply)
  );

  app.post(
    "/api/clinics/me/welcome-documents",
    { preHandler: gate },
    async (request, reply) => controller.upload(request, reply)
  );

  app.get(
    "/api/clinics/me/welcome-documents/:documentId",
    { preHandler: gate },
    async (request, reply) => controller.get(request, reply)
  );

  app.get(
    "/api/clinics/me/welcome-documents/:documentId/download",
    { preHandler: gate },
    async (request, reply) => controller.download(request, reply)
  );

  app.delete(
    "/api/clinics/me/welcome-documents/:documentId",
    { preHandler: gate },
    async (request, reply) => controller.delete(request, reply)
  );
}