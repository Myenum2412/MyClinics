import type { FastifyInstance } from "fastify";
import { PatientController } from "@/mt/modules/patients/patients.controller";
import {
  allowStaffOrOwnPatient,
  requireRoles,
} from "@/mt/core/tenant-scope";

/**
 * Patient routes — all registered INSIDE the tenant-scope plugin, so every
 * handler runs with a verified tenant context and every query is scoped.
 *
 *   POST   /api/mt/patients            staff, clinic_admin
 *   GET    /api/mt/patients            staff (clinic-wide) | patient (own)
 *   GET    /api/mt/patients/:patientId staff (clinic-wide) | patient (own only)
 *   PATCH  /api/mt/patients/:patientId staff, clinic_admin | patient (own only)
 *   DELETE /api/mt/patients/:patientId clinic_admin only
 */
export function registerPatientRoutes(app: FastifyInstance): void {
  const controller = new PatientController();

  app.post("/api/mt/patients", { preHandler: requireRoles("staff") }, async (request, reply) =>
    controller.create(request, reply)
  );

  // Patient role may list — the controller narrows to their own record.
  app.get("/api/mt/patients", async (request, reply) =>
    controller.list(request, reply)
  );

  app.get(
    "/api/mt/patients/:patientId",
    { preHandler: allowStaffOrOwnPatient },
    async (request, reply) => controller.getById(request, reply)
  );

  app.patch(
    "/api/mt/patients/:patientId",
    { preHandler: allowStaffOrOwnPatient },
    async (request, reply) => controller.update(request, reply)
  );

  app.delete(
    "/api/mt/patients/:patientId",
    { preHandler: requireRoles("clinic_admin") },
    async (request, reply) => controller.remove(request, reply)
  );
}

/**
 * Patient-owned convenience endpoints (accessible to every role, with
 * ownership checks inside the controller/service).
 */
export function registerPatientSelfRoutes(app: FastifyInstance): void {
  const controller = new PatientController();

  // GET /api/mt/me/patient — the caller's own patient record (any role).
  app.get("/api/mt/me/patient", async (request, reply) => controller.getSelf(request, reply));
}