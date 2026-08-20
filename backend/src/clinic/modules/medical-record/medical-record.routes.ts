import type { FastifyInstance } from "fastify";
import { MedicalRecordController } from "@/clinic/modules/medical-record/medical-record.controller";
import { requireClinicAccess, requireRoles } from "@/clinic/core/scope";

/**
 * Medical Record (Drive-style) routes — scoped to the URL clinic.
 *
 * Gate admits clinic_admin + doctor + staff (hierarchy). Per-action
 * authorization (doctor: only assigned patients; staff: upload-only) is
 * enforced inside the service.
 *
 *   POST   /api/clinics/:clinicId/medical-record/upload            upload
 *   POST   /api/clinics/:clinicId/medical-record/files/:fileId/version   doctor+ (new version)
 *   GET    /api/clinics/:clinicId/medical-record                   list + search
 *   GET    /api/clinics/:clinicId/medical-record/:fileId/download  download (audited)
 *   PATCH  /api/clinics/:clinicId/medical-record/files/:fileId     rename
 *   POST   /api/clinics/:clinicId/medical-record/files/:fileId/move    move
 *   POST   /api/clinics/:clinicId/medical-record/files/:fileId/copy    copy
 *   DELETE /api/clinics/:clinicId/medical-record/:fileId           delete
 *   POST   /api/clinics/:clinicId/medical-record/folders           create
 *   GET    /api/clinics/:clinicId/medical-record/folders           list
 *   PATCH  /api/clinics/:clinicId/medical-record/folders/:folderId rename
 *   POST   /api/clinics/:clinicId/medical-record/folders/:folderId/move move
 *   POST   /api/clinics/:clinicId/medical-record/folders/:folderId/copy copy
 *   DELETE /api/clinics/:clinicId/medical-record/folders/:folderId delete (cascade)
 */
export function registerMedicalRecordRoutes(app: FastifyInstance): void {
  const controller = new MedicalRecordController();
  const manageGate = [requireClinicAccess, requireRoles("staff")];
  const readGate = [requireClinicAccess, requireRoles("patient")];

  app.post(
    "/api/clinics/:clinicId/medical-record/upload",
    { preHandler: readGate },
    async (request, reply) => controller.upload(request, reply)
  );

  app.post(
    "/api/clinics/:clinicId/medical-record/files/:fileId/version",
    { preHandler: manageGate },
    async (request, reply) => controller.uploadVersion(request, reply)
  );

  app.get(
    "/api/clinics/:clinicId/medical-record",
    { preHandler: readGate },
    async (request, reply) => controller.list(request, reply)
  );

  app.post(
    "/api/clinics/:clinicId/medical-record/folders",
    { preHandler: manageGate },
    async (request, reply) => controller.createFolder(request, reply)
  );

  app.get(
    "/api/clinics/:clinicId/medical-record/folders",
    { preHandler: readGate },
    async (request, reply) => controller.listFolders(request, reply)
  );

  app.delete(
    "/api/clinics/:clinicId/medical-record/folders/:folderId",
    { preHandler: manageGate },
    async (request, reply) => controller.removeFolder(request, reply)
  );

  app.patch(
    "/api/clinics/:clinicId/medical-record/folders/:folderId",
    { preHandler: manageGate },
    async (request, reply) => controller.renameFolder(request, reply)
  );

  app.post(
    "/api/clinics/:clinicId/medical-record/folders/:folderId/move",
    { preHandler: manageGate },
    async (request, reply) => controller.moveFolder(request, reply)
  );

  app.post(
    "/api/clinics/:clinicId/medical-record/folders/:folderId/copy",
    { preHandler: manageGate },
    async (request, reply) => controller.copyFolder(request, reply)
  );

  app.patch(
    "/api/clinics/:clinicId/medical-record/files/:fileId",
    { preHandler: manageGate },
    async (request, reply) => controller.renameFile(request, reply)
  );

  app.post(
    "/api/clinics/:clinicId/medical-record/files/:fileId/move",
    { preHandler: manageGate },
    async (request, reply) => controller.moveFile(request, reply)
  );

  app.post(
    "/api/clinics/:clinicId/medical-record/files/:fileId/copy",
    { preHandler: manageGate },
    async (request, reply) => controller.copyFile(request, reply)
  );

  app.get(
    "/api/clinics/:clinicId/medical-record/:fileId/download",
    { preHandler: readGate },
    async (request, reply) => controller.download(request, reply)
  );

  app.delete(
    "/api/clinics/:clinicId/medical-record/:fileId",
    { preHandler: manageGate },
    async (request, reply) => controller.remove(request, reply)
  );
}