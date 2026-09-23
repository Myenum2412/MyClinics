import type { FastifyInstance } from "fastify";
import { LabController } from "@/clinic/modules/labs/labs.controller";
import { requireClinicAccess, requireRoles } from "@/clinic/core/scope";

export function registerLabRoutes(app: FastifyInstance): void {
  const controller = new LabController();
  app.get("/api/clinics/:clinicId/labs", { preHandler: [requireClinicAccess, requireRoles("patient")] }, (req, reply) => controller.list(req, reply));
  app.post("/api/clinics/:clinicId/labs", { preHandler: [requireClinicAccess, requireRoles("clinic_admin")] }, (req, reply) => controller.create(req, reply));
  app.get("/api/clinics/:clinicId/labs/:labId", { preHandler: [requireClinicAccess, requireRoles("patient")] }, (req, reply) => controller.getById(req, reply));
  app.patch("/api/clinics/:clinicId/labs/:labId", { preHandler: [requireClinicAccess, requireRoles("clinic_admin")] }, (req, reply) => controller.updateById(req, reply));
  app.delete("/api/clinics/:clinicId/labs/:labId", { preHandler: [requireClinicAccess, requireRoles("clinic_admin")] }, (req, reply) => controller.delete(req, reply));
}
