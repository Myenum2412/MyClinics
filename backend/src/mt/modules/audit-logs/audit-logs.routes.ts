import type { FastifyInstance } from "fastify";
import { AuditLogController } from "@/mt/modules/audit-logs/audit-logs.controller";

export function registerAuditLogRoutes(app: FastifyInstance): void {
  const controller = new AuditLogController();

  app.get("/api/mt/audit-logs", async (request, reply) => controller.list(request, reply));

  app.get(
    "/api/mt/audit-logs/patient/:patientId",
    async (request, reply) => controller.listForPatient(request, reply)
  );
}