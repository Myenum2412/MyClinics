import type { FastifyInstance } from "fastify";
import { UserController } from "@/mt/modules/users/users.controller";
import { requireRoles } from "@/mt/core/tenant-scope";

export function registerUserRoutes(app: FastifyInstance): void {
  const controller = new UserController();

  app.post("/api/mt/users", { preHandler: requireRoles("staff") }, async (request, reply) =>
    controller.create(request, reply)
  );

  app.get("/api/mt/users", { preHandler: requireRoles("staff") }, async (request, reply) =>
    controller.list(request, reply)
  );

  app.get("/api/mt/users/:userId", { preHandler: requireRoles("staff") }, async (request, reply) =>
    controller.getById(request, reply)
  );

  app.patch(
    "/api/mt/users/:userId",
    { preHandler: requireRoles("clinic_admin") },
    async (request, reply) => controller.update(request, reply)
  );

  app.delete(
    "/api/mt/users/:userId",
    { preHandler: requireRoles("clinic_admin") },
    async (request, reply) => controller.remove(request, reply)
  );
}