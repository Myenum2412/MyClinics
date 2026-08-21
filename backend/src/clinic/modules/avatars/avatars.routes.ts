import type { FastifyInstance } from "fastify";
import { AvatarController } from "@/clinic/modules/avatars/avatars.controller";
import { requireClinicAccess, requireRoles } from "@/clinic/core/scope";

/**
 * Avatar routes — clinic-scoped profile photos stored in R2.
 *
 *   POST /api/clinics/:clinicId/avatars/:ownerType/:ownerId   staff+ (multipart image)
 *   GET  /api/clinics/:clinicId/avatars/:ownerType/:ownerId   doctor+ (signed URL or null)
 */
export function registerAvatarRoutes(app: FastifyInstance): void {
  const controller = new AvatarController();

  app.post(
    "/api/clinics/:clinicId/avatars/:ownerType/:ownerId",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => controller.upload(request, reply)
  );

  app.get(
    "/api/clinics/:clinicId/avatars/:ownerType/:ownerId",
    { preHandler: [requireClinicAccess, requireRoles("patient")] },
    async (request, reply) => controller.getUrl(request, reply)
  );
}