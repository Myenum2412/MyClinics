import type { FastifyInstance } from "fastify";
import { getDb } from "@/lib/db";
import { DB_COLLECTIONS } from "@/lib/constants";
import {
  getOrganization,
} from "@/services/customer/customer-context.service";
import {
  createAppointment,
  checkAvailability,
  rescheduleAppointment,
  cancelAppointment,
  getCustomerAppointments,
  type AppointmentErrorCode,
} from "@/services/ai/appointment.service";
import {
  createAppointmentSchema,
  availabilitySchema,
  rescheduleAppointmentSchema,
  cancelAppointmentSchema,
  appointmentStatusSchema,
} from "@/services/ai/schemas";
import { todayISO } from "@/services/ai/dates";
import { reassignCounters } from "@/services/queue.service";
import { requireInternalToken } from "@/plugins/auth";
import { cached } from "@/lib/cache";
import { searchParams, handleError } from "@/lib/http";

function mapErrorStatus(code: AppointmentErrorCode): number {
  switch (code) {
    case "SLOT_TAKEN":
      return 409;
    case "INVALID_DOCTOR":
    case "INVALID_DATE":
    case "INVALID_TIME":
      return 400;
    case "NOT_FOUND":
      return 404;
    default:
      return 500;
  }
}

function badRequest(reply: import("fastify").FastifyReply, data: unknown) {
  const issues = (data as { issues?: { message?: string }[] }).issues;
  return reply
    .code(400)
    .send({ error: issues?.[0]?.message ?? "Invalid request" });
}

const AI_CONTEXT_CACHE_TTL_MS = 15_000;

export function registerAiRoutes(app: FastifyInstance): void {
  app.post("/api/ai/appointments", async (request, reply) => {
    if (!requireInternalToken(request, reply)) return;

    const parsed = createAppointmentSchema.safeParse(request.body);
    if (!parsed.success) return badRequest(reply, parsed.error);

    try {
      const db = await getDb();
      const org = await getOrganization(db, parsed.data.organizationId);
      if (!org) {
        return reply.code(404).send({ error: "Organization not found" });
      }

      const result = await createAppointment(db, org, parsed.data);
      if (!result.ok) {
        return reply
          .code(mapErrorStatus(result.code))
          .send({ error: result.message, code: result.code });
      }

      await reassignCounters(db, parsed.data.date);

      return reply.code(201).send({ appointment: result.appointment });
    } catch {
      return reply.code(500).send({
        error: "Something went wrong. Please try again.",
      });
    }
  });

  app.post("/api/ai/appointments/availability", async (request, reply) => {
    if (!requireInternalToken(request, reply)) return;

    const parsed = availabilitySchema.safeParse(request.body);
    if (!parsed.success) return badRequest(reply, parsed.error);

    try {
      const db = await getDb();
      const org = await getOrganization(db, parsed.data.organizationId);
      if (!org) {
        return reply.code(404).send({ error: "Organization not found" });
      }

      const result = await checkAvailability(
        db,
        parsed.data.organizationId,
        org,
        parsed.data.doctorName,
        parsed.data.date,
        parsed.data.time
      );

      if (!result.ok) {
        return reply
          .code(mapErrorStatus(result.code))
          .send({ error: result.message, code: result.code });
      }

      return reply.send({ available: result.available, doctor: result.doctor });
    } catch {
      return reply.code(500).send({
        error: "Something went wrong. Please try again.",
      });
    }
  });

  app.post("/api/ai/appointments/reschedule", async (request, reply) => {
    if (!requireInternalToken(request, reply)) return;

    const parsed = rescheduleAppointmentSchema.safeParse(request.body);
    if (!parsed.success) return badRequest(reply, parsed.error);

    try {
      const db = await getDb();
      const org = await getOrganization(db, parsed.data.organizationId);
      if (!org) {
        return reply.code(404).send({ error: "Organization not found" });
      }

      const result = await rescheduleAppointment(db, org, parsed.data);
      if (!result.ok) {
        return reply
          .code(mapErrorStatus(result.code))
          .send({ error: result.message, code: result.code });
      }

      return reply.send({ appointment: result.appointment });
    } catch {
      return reply.code(500).send({
        error: "Something went wrong. Please try again.",
      });
    }
  });

  app.post("/api/ai/appointments/cancel", async (request, reply) => {
    if (!requireInternalToken(request, reply)) return;

    const parsed = cancelAppointmentSchema.safeParse(request.body);
    if (!parsed.success) return badRequest(reply, parsed.error);

    try {
      const db = await getDb();
      const org = await getOrganization(db, parsed.data.organizationId);
      if (!org) {
        return reply.code(404).send({ error: "Organization not found" });
      }

      const result = await cancelAppointment(
        db,
        parsed.data.organizationId,
        parsed.data
      );
      if (!result.ok) {
        return reply
          .code(mapErrorStatus(result.code))
          .send({ error: result.message, code: result.code });
      }

      return reply.send({ appointment: result.appointment });
    } catch {
      return reply.code(500).send({
        error: "Something went wrong. Please try again.",
      });
    }
  });

  app.get("/api/ai/appointments/status", async (request, reply) => {
    if (!requireInternalToken(request, reply)) return;

    const params = searchParams(request);
    const parsed = appointmentStatusSchema.safeParse({
      organizationId: params.get("organizationId") ?? "",
      customerPhone: params.get("customerPhone") ?? "",
    });
    if (!parsed.success) return badRequest(reply, parsed.error);

    try {
      const db = await getDb();
      const org = await getOrganization(db, parsed.data.organizationId);
      if (!org) {
        return reply.code(404).send({ error: "Organization not found" });
      }

      const appointments = await getCustomerAppointments(
        db,
        parsed.data.organizationId,
        parsed.data.customerPhone
      );
      return reply.send({ appointments });
    } catch {
      return reply.code(500).send({
        error: "Something went wrong. Please try again.",
      });
    }
  });

  app.get("/api/ai/context", async (request, reply) => {
    if (!requireInternalToken(request, reply)) return;

    const params = searchParams(request);
    const organizationId = params.get("organizationId") ?? "";
    if (!organizationId) {
      return reply.code(400).send({ error: "organizationId is required" });
    }

    try {
      const db = await getDb();
      const org = await cached(
        `ai:context:${organizationId}`,
        AI_CONTEXT_CACHE_TTL_MS,
        () => getOrganization(db, organizationId)
      );
      if (!org) {
        return reply.code(404).send({ error: "Organization not found" });
      }

      const doctors = await cached(
        `ai:doctors:${organizationId}`,
        AI_CONTEXT_CACHE_TTL_MS,
        () =>
          db
            .collection(DB_COLLECTIONS.users)
            .find({ role: "doctor" }, { projection: { name: 1 } })
            .toArray()
      );

      return reply.send({
        organizationId,
        doctors: doctors.map((d) => d.name).sort(),
        todayISO: todayISO(),
        workingHours: org.settings,
      });
    } catch {
      return reply.code(500).send({
        error: "Something went wrong. Please try again.",
      });
    }
  });
}