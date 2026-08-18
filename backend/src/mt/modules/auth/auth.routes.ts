import type { FastifyInstance } from "fastify";
import { AuthController } from "@/mt/modules/auth/auth.controller";

/**
 * Public auth routes — registered OUTSIDE the tenant-scope plugin.
 * Signup and login are the only unauthenticated entry points.
 */
export function registerPublicAuthRoutes(app: FastifyInstance): void {
  const controller = new AuthController();

  app.post("/api/mt/auth/signup", async (request, reply) =>
    controller.signup(request, reply)
  );
  app.post("/api/mt/auth/login", async (request, reply) =>
    controller.login(request, reply)
  );
}

/**
 * Authenticated auth routes — registered INSIDE the tenant-scope plugin.
 */
export function registerProtectedAuthRoutes(app: FastifyInstance): void {
  const controller = new AuthController();

  app.post("/api/mt/auth/refresh", async (request, reply) =>
    controller.refresh(request, reply)
  );
  app.get("/api/mt/auth/me", async (request, reply) =>
    controller.me(request, reply)
  );
}