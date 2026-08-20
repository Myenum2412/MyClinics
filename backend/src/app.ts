import Fastify, {
  type FastifyError,
  type FastifyReply,
  type FastifyRequest,
} from "fastify";
import compress from "@fastify/compress";
import cors from "@fastify/cors";
import etag from "@fastify/etag";
import multipart from "@fastify/multipart";
import { registerAuth } from "@/plugins/auth";
import { registerKnowledgeRoutes } from "@/routes/knowledge";
import { registerSoulRoutes } from "@/routes/soul";
import { registerWhatsappSessionRoutes } from "@/routes/whatsapp-session";
import { registerCronRoutes } from "@/routes/cron-reminders";
import { registerPincodeRoutes } from "@/routes/pincode";
import { registerPublicAppointmentRoutes } from "@/routes/public-appointments";
import { registerAiRoutes } from "@/routes/ai";
import { registerOrganizationRoutes } from "@/routes/organization";
import { registerHealthRoutes } from "@/routes/health";
import { registerClinicApi } from "@/clinic";
import { AppError } from "@/clinic/core/errors";

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export function buildServer() {
  const app = Fastify({
    logger: false,
    bodyLimit: MAX_UPLOAD_BYTES + 1024 * 1024,
    trustProxy: true,
    requestTimeout: 30_000, // 30 second global request timeout
  });

  void app.register(compress, {
    global: true,
    threshold: 1024,
  });

  void app.register(etag);

  void app.register(cors, {
    origin: true,
    credentials: true,
    // @fastify/cors only allows GET,HEAD,POST by default — DELETE/PATCH/PUT
    // must be listed explicitly or browser deletes fail with "Failed to fetch".
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Cron-Secret",
      "X-Internal-Token",
    ],
  });

  void app.register(multipart, {
    limits: { fileSize: MAX_UPLOAD_BYTES },
  });

  // Fastify's default JSON parser rejects an empty body with 400
  // "Invalid JSON body" even for legitimate empty-body requests (e.g. DELETE).
  // Treat an empty body as null so DELETE/POST calls without a payload work.
  app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (_request, body, done) => {
      const text = String(body).trim();
      if (text === "") return done(null, null);
      try {
        done(null, JSON.parse(text));
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  );

  void app.register(registerAuth);

  // Platform services (WhatsApp assistant, AI, content, public brand info).
  void app.register(registerKnowledgeRoutes);
  void app.register(registerSoulRoutes);
  void app.register(registerWhatsappSessionRoutes);
  void app.register(registerCronRoutes);
  void app.register(registerPincodeRoutes);
  void app.register(registerPublicAppointmentRoutes);
  void app.register(registerAiRoutes);
  void app.register(registerOrganizationRoutes);
  void app.register(registerHealthRoutes);

  // Clinic SaaS API — the multi-tenant domain. Every tenant route lives
  // under /api/clinics and is guarded by the clinic-scope middleware.
  void app.register(registerClinicApi);

  app.setNotFoundHandler((_request, reply) => {
    reply.code(404).send({ error: "Not found" });
  });

  app.setErrorHandler(
    (
      error: FastifyError,
      _request: FastifyRequest,
      reply: FastifyReply
    ) => {
      // Clinic domain errors (validation, isolation, ownership). Checked
      // before the parser 400 branch because AppError instances use
      // statusCode 400 too — otherwise every validation failure would be
      // masked as "Invalid JSON body".
      if (error instanceof AppError) {
        return reply
          .code(error.statusCode)
          .send({ error: error.message, code: error.code });
      }
      // Invalid JSON body from Fastify's parser → keep the previous 400 contract.
      if (error.statusCode === 400) {
        return reply.code(400).send({ error: "Invalid JSON body" });
      }
      if (error.statusCode) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      console.error("Unhandled server error", error);
      return reply
        .code(500)
        .send({ error: "Something went wrong. Please try again." });
    }
  );

  return app;
}