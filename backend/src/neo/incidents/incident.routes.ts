import type { FastifyInstance } from "fastify";
import { requireClinicAccess } from "@/clinic/core/scope";
import { requireNeoAccess, requireOrgScope } from "@/neo/core/neo-permissions";
import { NeoIncidentController } from "@/neo/incidents/incident.controller";

export function registerNeoIncidentRoutes(app: FastifyInstance): void {
  const controller = new NeoIncidentController();
  const pre = [requireClinicAccess, requireNeoAccess] as const;

  app.get("/api/clinics/:clinicId/neo/incidents", { preHandler: [...pre] }, controller.list);
  app.get("/api/clinics/:clinicId/neo/incidents/:incidentId", { preHandler: [...pre] }, controller.getById);
  app.post("/api/clinics/:clinicId/neo/incidents/:incidentId/transition", { preHandler: [...pre] }, controller.transition);
  app.post("/api/clinics/:clinicId/neo/incidents/:incidentId/resolve", { preHandler: [...pre] }, controller.resolve);

  // Organization-wide (platform_admin) symmetry with the clinic-scoped routes.
  app.get("/api/clinics/neo/org/incidents/:incidentId", { preHandler: [requireOrgScope] }, controller.getById);
  app.post("/api/clinics/neo/org/incidents/:incidentId/transition", { preHandler: [requireOrgScope] }, controller.transition);
  app.post("/api/clinics/neo/org/incidents/:incidentId/resolve", { preHandler: [requireOrgScope] }, controller.resolve);
}
