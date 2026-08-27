import type { FastifyInstance } from "fastify";
import { LeadController } from "@/clinic/modules/leads/leads.controller";
import {
  requireClinicAccess,
  requireRoles,
} from "@/clinic/core/scope";
import { BadRequestError } from "@/clinic/core/errors";

/**
 * Lead routes (Meta-aware but source-agnostic). Tenant-scoped via
 * requireClinicAccess so Clinic A can never read Clinic B's leads.
 */
export function registerLeadRoutes(app: FastifyInstance): void {
  const controller = new LeadController();

  app.get(
    "/api/clinics/:clinicId/leads",
    { preHandler: requireClinicAccess },
    (req, reply) => controller.list(req, reply)
  );
  app.post(
    "/api/clinics/:clinicId/leads",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    (req, reply) => controller.create(req, reply)
  );
  app.get(
    "/api/clinics/:clinicId/leads/:leadId",
    { preHandler: requireClinicAccess },
    (req, reply) => controller.get(req, reply)
  );
  app.post(
    "/api/clinics/:clinicId/leads/:leadId/assign",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    (req, reply) => controller.assign(req, reply)
  );
  app.post(
    "/api/clinics/:clinicId/leads/:leadId/contacted",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    (req, reply) => controller.markContacted(req, reply)
  );
  app.post(
    "/api/clinics/:clinicId/leads/:leadId/appointment",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    (req, reply) => controller.bookAppointment(req, reply)
  );
  app.post(
    "/api/clinics/:clinicId/leads/:leadId/convert",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    (req, reply) => controller.convert(req, reply)
  );
  app.get(
    "/api/clinics/:clinicId/leads/stats/workflow",
    { preHandler: requireClinicAccess },
    (req, reply) => controller.workflowStats(req, reply)
  );
  app.post(
    "/api/clinics/:clinicId/leads/:leadId/whatsapp-followup",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    (req, reply) => controller.upsertWhatsappFollowup(req, reply)
  );
}
