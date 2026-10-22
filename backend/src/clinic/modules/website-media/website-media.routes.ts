import type { FastifyInstance } from "fastify";
import { requireClinicAccess, requireRoles } from "@/clinic/core/scope";
import { WebsiteMediaController } from "@/clinic/modules/website-media/website-media.controller";

/**
 * Website builder media library — clinic-scoped images stored in MongoDB.
 *
 *   GET    /api/clinics/:clinicId/website/media         clinic_admin
 *   POST   /api/clinics/:clinicId/website/media         clinic_admin (multipart)
 *   DELETE /api/clinics/:clinicId/website/media/:id     clinic_admin
 *
 * The corresponding unauthenticated GET is registered in
 * `routes/public-clinic-website.ts` so published pages can load images.
 */
export function registerWebsiteMediaRoutes(app: FastifyInstance): void {
  const controller = new WebsiteMediaController();

  app.get(
    "/api/clinics/:clinicId/website/media",
    { preHandler: [requireClinicAccess, requireRoles("clinic_admin")] },
    async (request, reply) => controller.list(request, reply)
  );

  app.post(
    "/api/clinics/:clinicId/website/media",
    { preHandler: [requireClinicAccess, requireRoles("clinic_admin")] },
    async (request, reply) => controller.upload(request, reply)
  );

  app.delete(
    "/api/clinics/:clinicId/website/media/:mediaId",
    { preHandler: [requireClinicAccess, requireRoles("clinic_admin")] },
    async (request, reply) => controller.remove(request, reply)
  );
}
