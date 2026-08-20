import type { FastifyInstance } from "fastify";
import { PrescriptionController } from "@/clinic/modules/prescriptions/prescriptions.controller";
import {
  requireClinicAccess,
  requireRoles,
} from "@/clinic/core/scope";
import { getDb } from "@/lib/db";

/**
 * Prescription routes — scoped to the URL clinic AND to the caller's
 * doctor/patient ownership (repository enforces doctorId/patientId).
 *
 *   POST   /api/clinics/:clinicId/prescriptions               doctor+
 *   GET    /api/clinics/:clinicId/prescriptions               doctor+ | patient (own)
 *   GET    /api/clinics/:clinicId/prescriptions/:prescriptionId  doctor+ | patient (own)
 *   PATCH  /api/clinics/:clinicId/prescriptions/:prescriptionId  doctor+ | patient (own)
 *   DELETE /api/clinics/:clinicId/prescriptions/:prescriptionId  clinic_admin
 */
export function registerPrescriptionRoutes(app: FastifyInstance): void {
  const controller = new PrescriptionController();

  app.post(
    "/api/clinics/:clinicId/prescriptions",
    { preHandler: [requireClinicAccess, requireRoles("doctor")] },
    async (request, reply) => controller.create(request, reply)
  );

  app.get(
    "/api/clinics/:clinicId/prescriptions",
    { preHandler: [requireClinicAccess, requireRoles("patient")] },
    async (request, reply) => controller.list(request, reply)
  );

  app.get(
    "/api/clinics/:clinicId/prescriptions/:prescriptionId",
    { preHandler: [requireClinicAccess, requireRoles("patient")] },
    async (request, reply) => controller.getById(request, reply)
  );

  app.patch(
    "/api/clinics/:clinicId/prescriptions/:prescriptionId",
    { preHandler: [requireClinicAccess, requireRoles("doctor")] },
    async (request, reply) => controller.updateById(request, reply)
  );

  app.get(
    "/api/clinics/:clinicId/prescriptions/notifications",
    { preHandler: [requireClinicAccess, requireRoles("doctor")] },
    async (request, reply) => {
      const { clinicId } = request.params as { clinicId: string };
      const db = await getDb();
      const notifications = await db.collection("clc_prescription_notifications")
        .find({ clinicId })
        .sort({ createdAt: -1 })
        .limit(200)
        .toArray();
      return reply.send({ notifications });
    }
  );

  app.get(
    "/api/clinics/:clinicId/prescriptions/:prescriptionId/notifications",
    { preHandler: [requireClinicAccess, requireRoles("doctor")] },
    async (request, reply) => {
      const { clinicId, prescriptionId } = request.params as { clinicId: string; prescriptionId: string };
      const db = await getDb();
      const notifications = await db.collection("clc_prescription_notifications")
        .find({ clinicId, prescriptionId })
        .sort({ createdAt: -1 })
        .toArray();
      return reply.send({ notifications });
    }
  );

  app.delete(
    "/api/clinics/:clinicId/prescriptions/:prescriptionId",
    { preHandler: [requireClinicAccess, requireRoles("clinic_admin")] },
    async (request, reply) => controller.delete(request, reply)
  );
}