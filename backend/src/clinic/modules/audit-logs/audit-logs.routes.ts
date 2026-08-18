import type { FastifyInstance } from "fastify";
import { AuditLogController } from "@/clinic/modules/audit-logs/audit-logs.controller";
import {
  requireClinicAccess,
  requireRoles,
} from "@/clinic/core/scope";

/**
 * Audit log routes.
 *
 *   GET /api/clinics/:clinicId/audit-logs   clinic_admin (own clinic) | platform_admin
 */
export function registerAuditLogRoutes(app: FastifyInstance): void {
  const controller = new AuditLogController();

  app.get(
    "/api/clinics/:clinicId/audit-logs",
    { preHandler: [requireClinicAccess, requireRoles("clinic_admin")] },
    async (request, reply) => controller.list(request, reply)
  );
}