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
import { registerAuthRoutes } from "@/routes/auth";
import { registerAppointmentsRoutes } from "@/routes/appointments";
import { registerAppointmentRoutes } from "@/routes/appointments-id";
import { registerBillsRoutes } from "@/routes/bills";
import { registerBillRoutes } from "@/routes/bills-id";
import { registerBillPdfRoutes } from "@/routes/bills-id-pdf";
import { registerDoctorsRoutes } from "@/routes/doctors";
import { registerMedicinesRoutes } from "@/routes/medicines";
import { registerPatientsRoutes } from "@/routes/patients";
import { registerPrescriptionsRoutes } from "@/routes/prescriptions";
import { registerReportsRoutes } from "@/routes/reports";
import { registerReportRoutes } from "@/routes/reports-id";
import { registerReportUrlRoutes } from "@/routes/reports-id-url";
import { registerProfileRoutes } from "@/routes/profile";
import { registerOrganizationRoutes } from "@/routes/organization";
import { registerSoulRoutes } from "@/routes/soul";
import { registerKnowledgeRoutes } from "@/routes/knowledge";
import { registerWhatsappSessionRoutes } from "@/routes/whatsapp-session";
import { registerCronRoutes } from "@/routes/cron-reminders";
import { registerAiRoutes } from "@/routes/ai";

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export function buildServer() {
  const app = Fastify({
    logger: false,
    bodyLimit: MAX_UPLOAD_BYTES + 1024 * 1024,
    trustProxy: true,
  });

  void app.register(compress, {
    global: true,
    threshold: 1024,
  });

  void app.register(etag);

  void app.register(cors, {
    origin: true,
    credentials: true,
  });

  void app.register(multipart, {
    limits: { fileSize: MAX_UPLOAD_BYTES },
  });

  void app.register(registerAuth);

  void app.register(registerAuthRoutes);
  void app.register(registerAppointmentsRoutes);
  void app.register(registerAppointmentRoutes);
  void app.register(registerBillsRoutes);
  void app.register(registerBillRoutes);
  void app.register(registerBillPdfRoutes);
  void app.register(registerDoctorsRoutes);
  void app.register(registerMedicinesRoutes);
  void app.register(registerPatientsRoutes);
  void app.register(registerPrescriptionsRoutes);
  void app.register(registerReportsRoutes);
  void app.register(registerReportRoutes);
  void app.register(registerReportUrlRoutes);
  void app.register(registerProfileRoutes);
  void app.register(registerOrganizationRoutes);
  void app.register(registerSoulRoutes);
  void app.register(registerKnowledgeRoutes);
  void app.register(registerWhatsappSessionRoutes);
  void app.register(registerCronRoutes);
  void app.register(registerAiRoutes);

  app.setNotFoundHandler((_request, reply) => {
    reply.code(404).send({ error: "Not found" });
  });

  app.setErrorHandler(
    (
      error: FastifyError,
      _request: FastifyRequest,
      reply: FastifyReply
    ) => {
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