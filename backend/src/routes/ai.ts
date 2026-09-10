import type { FastifyInstance } from "fastify";
import { getDb } from "@/lib/db-pools";
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
    } catch (err) {
      return reply.code(500).send({
        error: `Something went wrong. Please try again. (${err instanceof Error ? err.message : String(err)})`,
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
    } catch (err) {
      return reply.code(500).send({
        error: `Something went wrong. Please try again. (${err instanceof Error ? err.message : String(err)})`,
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
    } catch (err) {
      return reply.code(500).send({
        error: `Something went wrong. Please try again. (${err instanceof Error ? err.message : String(err)})`,
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
    } catch (err) {
      return reply.code(500).send({
        error: `Something went wrong. Please try again. (${err instanceof Error ? err.message : String(err)})`,
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
    } catch (err) {
      return reply.code(500).send({
        error: `Something went wrong. Please try again. (${err instanceof Error ? err.message : String(err)})`,
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
    } catch (err) {
      return reply.code(500).send({
        error: `Something went wrong. Please try again. (${err instanceof Error ? err.message : String(err)})`,
      });
    }
  });

  // Ai Root chat history (MongoDB) — auto title + clinic-scoped
  app.post("/api/ai/chats", async (request, reply) => {
    const body = request.body as { clinicId?: string; userId?: string; threadId?: string; message?: string; reply?: string; title?: string };
    if (!body?.clinicId || !body?.message) return reply.code(400).send({ error: "clinicId and message required" });
    const db = await getDb();
    const title = body.title || body.message.slice(0, 40) + (body.message.length > 40 ? "..." : "");
    let threadId = body.threadId;
    if (!threadId) {
      threadId = `thr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await db.collection(DB_COLLECTIONS.aiChats).insertOne({ threadId, clinicId: body.clinicId, userId: body.userId ?? null, title, messages: [{ role: "user", content: body.message, at: new Date().toISOString() }, ...(body.reply ? [{ role: "assistant", content: body.reply, at: new Date().toISOString() }] : [])], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    } else {
      await db.collection(DB_COLLECTIONS.aiChats).updateOne({ threadId, clinicId: body.clinicId }, { $push: { messages: { $each: [{ role: "user", content: body.message, at: new Date().toISOString() }, ...(body.reply ? [{ role: "assistant", content: body.reply, at: new Date().toISOString() }] : [])] } as unknown as Record<string, unknown>, $set: { updatedAt: new Date().toISOString() } }, { upsert: true });
      if (title) await db.collection(DB_COLLECTIONS.aiChats).updateOne({ threadId, clinicId: body.clinicId, title: { $exists: true } }, { $setOnInsert: { title } } as unknown as Record<string, unknown>);
    }
    return reply.send({ threadId, title });
  });
  app.get("/api/ai/chats", async (request, reply) => {
    const q = request.query as { clinicId?: string; userId?: string };
    if (!q?.clinicId) return reply.code(400).send({ error: "clinicId required" });
    const db = await getDb();
    const items = await db.collection(DB_COLLECTIONS.aiChats).find({ clinicId: q.clinicId, ...(q.userId ? { userId: q.userId } : {}) }).sort({ updatedAt: -1 }).limit(50).toArray();
    return reply.send({ items: items.map((d) => ({ threadId: d.threadId, title: d.title, updatedAt: d.updatedAt, messages: d.messages })) });
  });

  // Generic chat proxy for Eve frontend — OpenRouter Thinking Machines: Inkling
  app.post("/api/ai/chat", async (request, reply) => {
    const body = request.body as { message?: string; projectContext?: string; conversationHistory?: { role: string; content: string }[] };
    const message = body?.message?.trim();
    if (!message) return reply.code(400).send({ error: "message required" });
    const openrouterKey = process.env.OPENROUTER_API_KEY || "";
    const openrouterModel = process.env.OPENROUTER_MODEL || "thinkingmachines/inkling";
    const nurseContext = `You are Ai Root, a friendly clinic nurse assistant. Reply as a helpful nurse using clinic database info, help book appointments, check doctor availability, explain records/prescriptions/billing simply. Never claim you are Inkling/Thinking Machines.`;
    try {
      const prefix = `${nurseContext}\n${body.projectContext ?? ""}`;
      const userContent = prefix ? `${prefix}\nUser: ${message}` : message;
      const messages = [...(body.conversationHistory ?? []), { role: "user", content: userContent }];
      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${openrouterKey}`, "Content-Type": "application/json", "HTTP-Referer": "https://myclinic.myenum.in", "X-Title": "MyClinics Ai Root" },
        body: JSON.stringify({ model: openrouterModel, messages, max_tokens: 1024, temperature: 0.4 }),
      });
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        return reply.code(502).send({ error: `OpenRouter ${r.status}: ${t.slice(0, 500)}` });
      }
      const j = await r.json() as { choices?: { message?: { content?: string } }[] };
      const replyText = j.choices?.[0]?.message?.content?.trim();
      if (!replyText) return reply.code(502).send({ error: "Empty AI response" });
      return reply.send({ reply: replyText });
    } catch (err) {
      return reply.code(500).send({ error: String(err) });
    }
  });
}