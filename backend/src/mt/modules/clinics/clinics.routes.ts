import type { FastifyInstance } from "fastify";
import { ClinicController } from "@/mt/modules/clinics/clinics.controller";
import { requireRoles } from "@/mt/core/tenant-scope";

export function registerClinicRoutes(app: FastifyInstance): void {
  const controller = new ClinicController();

  app.get("/api/mt/clinics/me", async (request, reply) =>
    controller.getOwn(request, reply)
  );

  app.patch(
    "/api/mt/clinics/me",
    { preHandler: requireRoles("clinic_admin") },
    async (request, reply) => controller.updateOwn(request, reply)
  );
}