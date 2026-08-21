import type { FastifyInstance } from "fastify";
import { BillingController } from "@/clinic/modules/billing/billing.controller";
import {
  requireClinicAccess,
  requireRoles,
} from "@/clinic/core/scope";

/**
 * Billing routes — scoped to the URL clinic AND to the caller's
 * doctor/patient ownership (repository enforces doctorId/patientId).
 *
 *   POST   /api/clinics/:clinicId/billing                staff+ | doctor (own patients)
 *   GET    /api/clinics/:clinicId/billing                staff+ | doctor (own) | patient (own)
 *   GET    /api/clinics/:clinicId/billing/:billId        staff+ | doctor (own) | patient (own)
 *   GET    /api/clinics/:clinicId/billing/:billId/pdf    staff+ | doctor (own) | patient (own)
 *   PATCH  /api/clinics/:clinicId/billing/:billId        staff+ | doctor (own patients)
 *   POST   /api/clinics/:clinicId/billing/:billId/void   staff+
 */
export function registerBillingRoutes(app: FastifyInstance): void {
  const controller = new BillingController();

  app.post(
    "/api/clinics/:clinicId/billing",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => controller.create(request, reply)
  );

  app.get(
    "/api/clinics/:clinicId/billing",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => controller.list(request, reply)
  );

  app.get(
    "/api/clinics/:clinicId/billing/:billId",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => controller.getById(request, reply)
  );

  app.get(
    "/api/clinics/:clinicId/billing/:billId/pdf",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => controller.downloadPdf(request, reply)
  );

  app.patch(
    "/api/clinics/:clinicId/billing/:billId",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => controller.updateById(request, reply)
  );

  app.post(
    "/api/clinics/:clinicId/billing/:billId/void",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => controller.void(request, reply)
  );
}