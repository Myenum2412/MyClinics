import type { FastifyInstance } from "fastify";
import { MedicalRecordController } from "@/mt/modules/medical-records/medical-records.controller";
import { requireRoles } from "@/mt/core/tenant-scope";

export function registerMedicalRecordRoutes(app: FastifyInstance): void {
  const controller = new MedicalRecordController();

  app.post(
    "/api/mt/medical-records",
    { preHandler: requireRoles("staff") },
    async (request, reply) => controller.create(request, reply)
  );

  app.get(
    "/api/mt/medical-records/patient/:patientId",
    async (request, reply) => controller.listByPatient(request, reply)
  );

  app.get(
    "/api/mt/medical-records/:recordId",
    async (request, reply) => controller.getById(request, reply)
  );
}