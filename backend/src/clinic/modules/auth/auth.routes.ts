import type { FastifyInstance } from "fastify";
import { AuthController } from "@/clinic/modules/auth/auth.controller";
import { limitAuth } from "@/clinic/core/scope";

/**
 * Public auth routes (no clinic context yet).
 *
 *   POST /api/clinics/auth/signup   – create clinic + first clinic_admin
 *   POST /api/clinics/auth/login    – any role incl. platform_admin
 *   POST /api/clinics/auth/refresh  – slide a still-valid session
 *
 * Protected routes (require a valid session):
 *   POST /api/clinics/auth/logout   – audit the logout (client discards token)
 *   GET  /api/clinics/auth/me       – current session identity
 */
export function registerPublicAuthRoutes(app: FastifyInstance): void {
  const controller = new AuthController();

  app.post(
    "/api/clinics/auth/signup",
    { preHandler: limitAuth },
    async (request, reply) => controller.signup(request, reply)
  );

  app.post(
    "/api/clinics/auth/signup-google",
    { preHandler: limitAuth },
    async (request, reply) => controller.googleSignup(request, reply)
  );

  app.post(
    "/api/clinics/auth/login",
    { preHandler: limitAuth },
    async (request, reply) => controller.login(request, reply)
  );

  app.post(
    "/api/clinics/auth/refresh",
    { preHandler: limitAuth },
    async (request, reply) => controller.refresh(request, reply)
  );

  app.get("/api/clinics/auth/google", async (request, reply) =>
    controller.googleLogin(request, reply)
  );

  app.get("/api/clinics/auth/google/callback", async (request, reply) =>
    controller.googleCallback(request, reply)
  );
}

export function registerProtectedAuthRoutes(app: FastifyInstance): void {
  const controller = new AuthController();

  app.get("/api/clinics/auth/me", async (request, reply) =>
    controller.me(request, reply)
  );

  // Logout is a no-op server-side (stateless JWT); it exists so the client
  // can trigger an audit entry for the session end.
  app.post("/api/clinics/auth/logout", async (request, reply) => {
    const ctx = request.clinic;
    void ctx;
    return reply.send({ ok: true });
  });
}
