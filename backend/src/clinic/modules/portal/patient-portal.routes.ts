import type { FastifyInstance } from "fastify";
import { requireClinicAccess } from "@/clinic/core/scope";
import { AppointmentController } from "@/clinic/modules/appointments/appointments.controller";
import { BillingController } from "@/clinic/modules/billing/billing.controller";
import { MedicineController } from "@/clinic/modules/medicine/medicine.controller";
import { PrescriptionController } from "@/clinic/modules/prescriptions/prescriptions.controller";

/**
 * Patient portal — `/api/clinics/:clinicId/me/*`.
 *
 * The patient's ONLY entry point into their own medical data. Each handler
 * passes the authenticated context to the service, which restricts every
 * query to `patientId = ctx.patientId` (repository patient-scope). Staff and
 * doctors may also call these endpoints (they see the same data via the
 * module routes); patients are blocked from the module routes by
 * `requireRoles("staff")`/`requireRoles("doctor")`.
 */
export function registerPatientPortalRoutes(app: FastifyInstance): void {
  const appointments = new AppointmentController();
  const records = new MedicineController();
  const prescriptions = new PrescriptionController();
  const billing = new BillingController();

  app.get(
    "/api/clinics/:clinicId/me/appointments",
    { preHandler: requireClinicAccess },
    async (request, reply) => appointments.getMine(request, reply)
  );

  app.post(
    "/api/clinics/:clinicId/me/appointments",
    { preHandler: requireClinicAccess },
    async (request, reply) => appointments.createMine(request, reply)
  );

  app.get(
    "/api/clinics/:clinicId/me/records",
    { preHandler: requireClinicAccess },
    async (request, reply) => records.getMine(request, reply)
  );

  app.get(
    "/api/clinics/:clinicId/me/prescriptions",
    { preHandler: requireClinicAccess },
    async (request, reply) => prescriptions.getMine(request, reply)
  );

  app.get(
    "/api/clinics/:clinicId/me/bills",
    { preHandler: requireClinicAccess },
    async (request, reply) => billing.getMine(request, reply)
  );
}