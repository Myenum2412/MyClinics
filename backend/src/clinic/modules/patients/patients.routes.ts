import type { FastifyInstance } from "fastify";
import { PatientController } from "@/clinic/modules/patients/patients.controller";
import {
  allowStaffOrOwnPatient,
  requireClinicAccess,
  requireRoles,
} from "@/clinic/core/scope";

/**
 * Patient routes — always scoped to the URL clinic AND to the caller's
 * doctor/patient ownership (repository enforces doctorId/patientId).
 *
 *   POST   /api/clinics/:clinicId/patients               staff+
 *   GET    /api/clinics/:clinicId/patients               staff+ | doctor (assigned) | patient (own)
 *   GET    /api/clinics/:clinicId/patients/:patientId    staff+ | doctor (assigned) | patient (own)
 *   PATCH  /api/clinics/:clinicId/patients/:patientId    staff+ | doctor (assigned) | patient (own)
 *   POST   /api/clinics/:clinicId/patients/:patientId/assign   staff+
 *   DELETE /api/clinics/:clinicId/patients/:patientId    clinic_admin
 */
export function registerPatientRoutes(app: FastifyInstance): void {
  const controller = new PatientController();

  app.post(
    "/api/clinics/:clinicId/patients",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => controller.create(request, reply)
  );

  app.get(
    "/api/clinics/:clinicId/patients",
    { preHandler: [requireClinicAccess, requireRoles("doctor")] },
    async (request, reply) => controller.list(request, reply)
  );

  app.get(
    "/api/clinics/:clinicId/patients/:patientId",
    { preHandler: [requireClinicAccess, allowStaffOrOwnPatient] },
    async (request, reply) => controller.getById(request, reply)
  );

  app.patch(
    "/api/clinics/:clinicId/patients/:patientId",
    { preHandler: [requireClinicAccess, allowStaffOrOwnPatient] },
    async (request, reply) => controller.updateById(request, reply)
  );

  app.post(
    "/api/clinics/:clinicId/patients/:patientId/assign",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => controller.assign(request, reply)
  );

  app.delete(
    "/api/clinics/:clinicId/patients/:patientId",
    { preHandler: [requireClinicAccess, requireRoles("clinic_admin")] },
    async (request, reply) => controller.delete(request, reply)
  );

  app.post(
    "/api/clinics/:clinicId/patients/:patientId/resend-credentials",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => controller.resendCredentials(request, reply)
  );

  app.post(
    "/api/clinics/:clinicId/patients/:patientId/send-welcome",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => controller.sendWelcome(request, reply)
  );
}

/**
 * Patient-owned convenience endpoint (any clinic role, ownership checked
 * inside the service): GET /api/clinics/:clinicId/me/patient.
 */
export function registerPatientSelfRoutes(app: FastifyInstance): void {
  const controller = new PatientController();

  app.get(
    "/api/clinics/:clinicId/me/patient",
    { preHandler: requireClinicAccess },
    async (request, reply) => controller.getSelf(request, reply)
  );
}