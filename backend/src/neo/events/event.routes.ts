import type { FastifyInstance } from "fastify";
import { requireClinicAccess } from "@/clinic/core/scope";
import { requireNeoAccess } from "@/neo/core/neo-permissions";
import { NeoEventController } from "@/neo/events/event.controller";

export function registerNeoEventRoutes(app: FastifyInstance): void {
  const controller = new NeoEventController();
  const pre = [requireClinicAccess, requireNeoAccess] as const;

  app.post("/api/clinics/:clinicId/neo/events", { preHandler: [...pre] }, controller.ingest);
  app.get("/api/clinics/:clinicId/neo/events", { preHandler: [...pre] }, controller.list);
  app.get("/api/clinics/:clinicId/neo/events/stream", { preHandler: [...pre] }, controller.stream);
  app.get("/api/clinics/:clinicId/neo/events/:eventId", { preHandler: [...pre] }, controller.getById);
}
