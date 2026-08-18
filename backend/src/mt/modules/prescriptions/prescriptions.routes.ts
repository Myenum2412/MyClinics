import type { FastifyInstance } from "fastify";
import { PrescriptionController } from "@/mt/modules/prescriptions/prescriptions.controller";
import { requireRoles } from "@/mt/core/tenant-scope";

export function registerPrescriptionRoutes(app: FastifyInstance): void {
  const controller = new PrescriptionController();

  app.post(
    "/api/mt/prescriptions",
    { preHandler: requireRoles("staff") },
    async (request, reply) => controller.create(request, reply)
  );

  app.get(
    "/api/mt/prescriptions/patient/:patientId",
    async (request, reply) => controller.listByPatient(request, reply)
  );

  app.get(
    "/api/mt/prescriptions/:prescriptionId",
    async (request, reply) => controller.getById(request, reply)
  );
}