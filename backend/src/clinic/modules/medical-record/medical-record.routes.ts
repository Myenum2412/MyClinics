import type { FastifyInstance } from "fastify";
import { MedicalRecordController } from "@/clinic/modules/medical-record/medical-record.controller";
import { requireClinicAccess, requireRoles } from "@/clinic/core/scope";

/**
 * Medical Record (Drive-style) routes — scoped to the URL clinic.
 *
 *   POST   /api/clinics/:clinicId/medical-record/upload        doctor+
 *   GET    /api/clinics/:clinicId/medical-record               doctor+
 *   GET    /api/clinics/:clinicId/medical-record/:fileId/download  doctor+
 *   DELETE /api/clinics/:clinicId/medical-record/:fileId       doctor+
 *   POST   /api/clinics/:clinicId/medical-record/folders       doctor+
 *   GET    /api/clinics/:clinicId/medical-record/folders       doctor+
 *   DELETE /api/clinics/:clinicId/medical-record/folders/:folderId  doctor+
 */
export function registerMedicalRecordRoutes(app: FastifyInstance): void {
  const controller = new MedicalRecordController();

  app.post(
    "/api/clinics/:clinicId/medical-record/upload",
    { preHandler: [requireClinicAccess, requireRoles("doctor")] },
    async (request, reply) => controller.upload(request, reply)
  );

  app.get(
    "/api/clinics/:clinicId/medical-record",
    { preHandler: [requireClinicAccess, requireRoles("doctor")] },
    async (request, reply) => controller.list(request, reply)
  );

  app.post(
    "/api/clinics/:clinicId/medical-record/folders",
    { preHandler: [requireClinicAccess, requireRoles("doctor")] },
    async (request, reply) => controller.createFolder(request, reply)
  );

  app.get(
    "/api/clinics/:clinicId/medical-record/folders",
    { preHandler: [requireClinicAccess, requireRoles("doctor")] },
    async (request, reply) => controller.listFolders(request, reply)
  );

  app.delete(
    "/api/clinics/:clinicId/medical-record/folders/:folderId",
    { preHandler: [requireClinicAccess, requireRoles("doctor")] },
    async (request, reply) => controller.removeFolder(request, reply)
  );

  app.get(
    "/api/clinics/:clinicId/medical-record/:fileId/download",
    { preHandler: [requireClinicAccess, requireRoles("doctor")] },
    async (request, reply) => controller.download(request, reply)
  );

  app.delete(
    "/api/clinics/:clinicId/medical-record/:fileId",
    { preHandler: [requireClinicAccess, requireRoles("doctor")] },
    async (request, reply) => controller.remove(request, reply)
  );
}