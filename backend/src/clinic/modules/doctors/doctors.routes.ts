import type { FastifyInstance } from "fastify";
import { DoctorController } from "@/clinic/modules/doctors/doctors.controller";
import {
  requireClinicAccess,
  requireRoles,
} from "@/clinic/core/scope";

/**
 * Doctor routes — always scoped to the URL clinic (verified against the
 * session). A doctor may edit only their own profile (enforced in service).
 *
 *   GET    /api/clinics/:clinicId/doctors             clinic staff roles
 *   POST   /api/clinics/:clinicId/doctors             clinic_admin
 *   GET    /api/clinics/:clinicId/doctors/:doctorId   clinic staff roles
 *   PATCH  /api/clinics/:clinicId/doctors/:doctorId   clinic_admin | doctor (self)
 *   DELETE /api/clinics/:clinicId/doctors/:doctorId   clinic_admin
 */
export function registerDoctorRoutes(app: FastifyInstance): void {
  const controller = new DoctorController();

  app.get(
    "/api/clinics/:clinicId/doctors",
    { preHandler: [requireClinicAccess, requireRoles("doctor")] },
    async (request, reply) => controller.list(request, reply)
  );

  app.post(
    "/api/clinics/:clinicId/doctors",
    { preHandler: [requireClinicAccess, requireRoles("clinic_admin")] },
    async (request, reply) => controller.create(request, reply)
  );

  app.get(
    "/api/clinics/:clinicId/doctors/:doctorId",
    { preHandler: [requireClinicAccess, requireRoles("doctor")] },
    async (request, reply) => controller.getById(request, reply)
  );

  app.patch(
    "/api/clinics/:clinicId/doctors/:doctorId",
    { preHandler: [requireClinicAccess, requireRoles("doctor")] },
    async (request, reply) => controller.updateById(request, reply)
  );

  app.delete(
    "/api/clinics/:clinicId/doctors/:doctorId",
    { preHandler: [requireClinicAccess, requireRoles("clinic_admin")] },
    async (request, reply) => controller.delete(request, reply)
  );
}