import type { FastifyInstance } from "fastify";
import { registerNeoEventRoutes } from "@/neo/events/event.routes";
import { registerNeoIncidentRoutes } from "@/neo/incidents/incident.routes";
import {
  registerNeoMonitoringRoutes,
  registerNeoOrgRoutes,
} from "@/neo/monitoring/monitoring.routes";

/**
 * Registers all RGB Neo endpoints.
 *
 *  - Per-clinic routes (`/api/clinics/:clinicId/neo/*`) are guarded by
 *    `requireClinicAccess`, which verifies the URL clinicId matches the
 *    caller's tenant (or, for platform_admin, stamps it into context). Tenant
 *    isolation is therefore enforced for every clinic-scoped read/write.
 *  - Organization-wide routes (`/api/clinics/neo/org/*`) are additionally
 *    restricted to platform_admin via `requireOrgScope`.
 */
export function registerNeoRoutes(app: FastifyInstance): void {
  registerNeoEventRoutes(app);
  registerNeoIncidentRoutes(app);
  registerNeoMonitoringRoutes(app);
  registerNeoOrgRoutes(app);
}
