import type { FastifyInstance } from "fastify";
import { AppointmentController } from "@/mt/modules/appointments/appointments.controller";
import { requireRoles } from "@/mt/core/tenant-scope";

export function registerAppointmentRoutes(app: FastifyInstance): void {
  const controller = new AppointmentController();

  app.post("/api/mt/appointments", { preHandler: requireRoles("staff") }, async (request, reply) =>
    controller.create(request, reply)
  );

  // Patient role may list — the controller narrows to their own appointments.
  app.get("/api/mt/appointments", async (request, reply) =>
    controller.list(request, reply)
  );

  app.get(
    "/api/mt/appointments/:appointmentId",
    async (request, reply) => controller.getById(request, reply)
  );

  app.patch(
    "/api/mt/appointments/:appointmentId",
    { preHandler: requireRoles("staff") },
    async (request, reply) => controller.update(request, reply)
  );

  app.delete(
    "/api/mt/appointments/:appointmentId",
    { preHandler: requireRoles("staff") },
    async (request, reply) => controller.remove(request, reply)
  );
}