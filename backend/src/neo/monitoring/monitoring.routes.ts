import type { FastifyInstance } from "fastify";
import { requireClinicAccess } from "@/clinic/core/scope";
import { requireNeoAccess, requireOrgScope } from "@/neo/core/neo-permissions";
import { NeoMonitoringController } from "@/neo/monitoring/monitoring.controller";
import { NeoEventController } from "@/neo/events/event.controller";

export function registerNeoMonitoringRoutes(app: FastifyInstance): void {
  const controller = new NeoMonitoringController();
  const pre = [requireClinicAccess, requireNeoAccess] as const;

  app.get("/api/clinics/:clinicId/neo/overview", { preHandler: [...pre] }, controller.clinicOverview);
  app.get("/api/clinics/:clinicId/neo/health", { preHandler: [...pre] }, controller.health);
  app.get("/api/clinics/:clinicId/neo/status", { preHandler: [...pre] }, controller.status);
  app.get("/api/clinics/:clinicId/neo/status/:service/timeline", { preHandler: [...pre] }, controller.statusTimeline);
  app.get("/api/clinics/:clinicId/neo/predictions", { preHandler: [...pre] }, controller.predictions);
}

export function registerNeoOrgRoutes(app: FastifyInstance): void {
  const controller = new NeoMonitoringController();
  const eventController = new NeoEventController();

  app.get("/api/clinics/neo/org/overview", { preHandler: [requireOrgScope] }, controller.orgOverview);
  app.get("/api/clinics/neo/org/incidents", { preHandler: [requireOrgScope] }, controller.orgIncidents);
  app.get("/api/clinics/neo/org/predictions", { preHandler: [requireOrgScope] }, controller.orgPredictions);
  app.get("/api/clinics/neo/org/events", { preHandler: [requireOrgScope] }, eventController.list);
  app.get("/api/clinics/neo/org/events/stream", { preHandler: [requireOrgScope] }, eventController.stream);
  app.post("/api/clinics/neo/org/ask", { preHandler: [requireOrgScope] }, controller.ask);
}
