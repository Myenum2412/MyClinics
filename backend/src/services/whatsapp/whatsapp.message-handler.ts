import type { Client, Message } from "whatsapp-web.js";
import type { Db } from "mongodb";
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limiter";
import { getSoul } from "@/services/ai/soul.service";
import {
  getConversationSummary,
  getMemoryFacts,
  getRecentHistory,
  saveConversation,
  extractAndStoreFacts,
  maybeSummarize,
  appendAppointmentHistory,
} from "@/services/ai/memory.service";
import {
  ensureDefaultOrganization,
  findOrganizationByWhatsappNumber,
  getOrCreateCustomer,
  normalizeWhatsappId,
  touchCustomer,
} from "@/services/customer/customer-context.service";
import { runAgent, AgentParseError } from "@/services/ai/agent.service";
import { retrieveKnowledge, contentRelevance } from "@/services/ai/knowledge.service";
import { makeFallbackReply, isCurrencyGrounded } from "@/services/ai/grounding";
import {
  hasAppointmentIntent,
  hasFactualIntent,
  isGreeting,
} from "@/services/ai/intent.service";
import {
  AiApiError,
  aiApi,
  getAiContext,
  type AiAppointmentResponse,
} from "@/services/ai/api-client";
import { NvidiaApiError, NvidiaConfigError } from "@/services/ai/nvidia.service";
import {
  type AgentContext,
  type AgentReply,
  type WaCustomer,
} from "@/lib/ai-types";
import { formatISODate, formatTime12h } from "@/services/ai/dates";

const RATE_LIMIT_WINDOW_MS = 10_000;
const RATE_LIMIT_MAX = 5;
const CONTEXT_TTL_MS = 60_000;
const MAX_DEDUPE = 500;

const limiter = createRateLimiter({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
});

const recentMessageIds = new Set<string>();
const contextCache = new Map<string, { at: number; ctx: Awaited<ReturnType<typeof getAiContext>>["data"] }>();

const FALLBACK_REPLY =
  "Sorry, I'm having trouble processing your message right now. Please try again shortly.";
const SLOT_TAKEN_REPLY =
  "That time slot is already booked. Would you like me to check another time?";
const BOOKING_FAILED_REPLY =
  "I couldn't complete the appointment booking right now. Please try again in a moment.";
const RATE_LIMIT_REPLY =
  "You're sending messages very quickly. Please wait a moment and try again.";

/**
 * Backend knowledge-boundary gate (soul.md §17). Minimum keyword relevance a
 * factual query needs against the current soul.md to be allowed to reach the
 * LLM when no knowledge document was retrieved.
 */
const SOUL_RELEVANCE_MIN_SCORE = 0.15;

function dedupe(messageId: string): boolean {
  if (recentMessageIds.has(messageId)) return false;
  recentMessageIds.add(messageId);
  if (recentMessageIds.size > MAX_DEDUPE) {
    const oldest = recentMessageIds.values().next().value;
    if (oldest !== undefined) recentMessageIds.delete(oldest);
  }
  return true;
}

function isGroupMessage(message: Message): boolean {
  return message.from.endsWith("@g.us");
}

async function getCachedContext(organizationId: string) {
  const cached = contextCache.get(organizationId);
  if (cached && Date.now() - cached.at < CONTEXT_TTL_MS) {
    return cached.ctx;
  }
  const { data } = await getAiContext(organizationId);
  contextCache.set(organizationId, { at: Date.now(), ctx: data });
  return data;
}

function successCreateText(appointment: { doctorName: string | null; date: string; time: string }): string {
  return [
    "All booked! ✅ Your appointment is confirmed.",
    "",
    `Doctor: ${appointment.doctorName ?? "Clinic"}`,
    `Date: ${formatISODate(appointment.date)}`,
    `Time: ${formatTime12h(appointment.time)}`,
    "",
    "See you then! 😊",
  ].join("\n");
}

function successRescheduleText(appointment: { doctorName: string | null; date: string; time: string }): string {
  return [
    "Done! ✅ Your appointment has been rescheduled.",
    "",
    `Doctor: ${appointment.doctorName ?? "Clinic"}`,
    `Date: ${formatISODate(appointment.date)}`,
    `Time: ${formatTime12h(appointment.time)}`,
    "",
    "See you then! 😊",
  ].join("\n");
}

const successCancelText =
  "Your appointment has been cancelled. If you'd like to book another one, just let me know. ✅";

async function executeAction(
  db: Db,
  ctx: AgentContext,
  customer: WaCustomer,
  reply: AgentReply
): Promise<string | null> {
  const action = reply.action;
  if (!action) return null;

  const slot = action.appointment;

  if (action.action === "create_appointment") {
    const body = {
      organizationId: ctx.organizationId,
      patientName: slot.customerName ?? customer.name ?? "WhatsApp Customer",
      phoneNumber: customer.phoneNumber,
      doctorName: slot.doctorName ?? "",
      date: slot.date ?? "",
      time: slot.time ?? "",
      customerId: customer.id,
      notes: `Booked via WhatsApp AI (conversation intent: ${reply.intent})`,
    };
    const { data } = await aiApi<AiAppointmentResponse>("/api/ai/appointments", {
      method: "POST",
      body,
    });
    const appointment = data.appointment;
    if (!appointment) {
      throw new AiApiError(500, data.error ?? "Appointment creation failed");
    }
    await appendAppointmentHistory(db, ctx.organizationId, customer.id, {
      date: appointment.date,
      time: appointment.time,
      doctor: appointment.doctorName ?? "Clinic",
      status: appointment.status,
      bookedAt: new Date().toISOString(),
    });
    logger.info("whatsapp appointment created", {
      organizationId: ctx.organizationId,
      customerId: customer.id,
      appointmentId: appointment.id,
    });
    return successCreateText(appointment);
  }

  if (action.action === "reschedule_appointment") {
    const { data } = await aiApi<AiAppointmentResponse>("/api/ai/appointments/reschedule", {
      method: "POST",
      body: {
        organizationId: ctx.organizationId,
        customerPhone: customer.phoneNumber,
        doctorName: slot.doctorName ?? undefined,
        newDate: slot.date ?? "",
        newTime: slot.time ?? "",
      },
    });
    const appointment = data.appointment;
    if (!appointment) {
      throw new AiApiError(500, data.error ?? "Reschedule failed");
    }
    return successRescheduleText(appointment);
  }

  if (action.action === "cancel_appointment") {
    const { data } = await aiApi<AiAppointmentResponse>("/api/ai/appointments/cancel", {
      method: "POST",
      body: {
        organizationId: ctx.organizationId,
        customerPhone: customer.phoneNumber,
        doctorName: slot.doctorName ?? undefined,
        date: slot.date ?? undefined,
        time: slot.time ?? undefined,
      },
    });
    if (!data.appointment) {
      throw new AiApiError(500, data.error ?? "Cancellation failed");
    }
    return successCancelText;
  }

  return null;
}

async function saveTurn(
  organizationId: string,
  customer: WaCustomer,
  incoming: { messageId: string; message: string; reply: AgentReply; aiResponse: string; sentText: string }
): Promise<void> {
  const db = await getDb();
  const now = new Date();
  await saveConversation(db, {
    organizationId,
    customerId: customer.id,
    whatsappMessageId: incoming.messageId,
    direction: "incoming",
    message: incoming.message,
    aiResponse: incoming.aiResponse,
    intent: incoming.reply.intent,
    timestamp: now,
  });
  await saveConversation(db, {
    organizationId,
    customerId: customer.id,
    whatsappMessageId: incoming.messageId,
    direction: "outgoing",
    message: incoming.sentText,
    timestamp: now,
  });
}

/**
 * Full WhatsApp → AI → backend pipeline for a single incoming message.
 */
export async function handleIncomingMessage(client: Client, message: Message): Promise<void> {
  const remote = message.from;
  const messageId = message.id?.id ?? `${remote}-${Date.now()}`;

  if (message.fromMe || !message.body || isGroupMessage(message)) return;
  if (!dedupe(messageId)) return;
  if (!limiter.check(remote)) {
    await client.sendMessage(remote, RATE_LIMIT_REPLY);
    return;
  }

  const db = await getDb();

  try {
    const botNumber = client.info?.me?.user ?? null;
    const org = (await findOrganizationByWhatsappNumber(db, botNumber)) ?? (await ensureDefaultOrganization(db));

    let phoneNumber = remote;
    let contactName: string | null = null;
    try {
      const contact = await message.getContact();
      phoneNumber = contact.number || remote;
      contactName = contact.name || contact.pushname || null;
    } catch {
      phoneNumber = normalizeWhatsappId(remote);
    }

    const customer = await getOrCreateCustomer(db, {
      organizationId: org.id,
      whatsappId: remote,
      phoneNumber,
      name: contactName,
    });

    logger.info("whatsapp incoming message", {
      organizationId: org.id,
      customerId: customer.id,
      length: message.body.length,
    });

    const [soul, memoryFacts, conversationSummary, history, aiContext] = await Promise.all([
      getSoul(db, org.id),
      getMemoryFacts(db, org.id, customer.id),
      getConversationSummary(db, org.id, customer.id),
      getRecentHistory(db, org.id, customer.id),
      getCachedContext(org.id).catch(() => null),
    ]);

    const contextBase: AgentContext = {
      organizationId: org.id,
      clinicName: org.name,
      soul: soul.content,
      fallbackReply: soul.fallbackReply,
      customerName: customer.name,
      phoneNumber: customer.phoneNumber,
      memoryFacts,
      conversationSummary,
      history,
      doctors: aiContext?.doctors ?? [],
      todayISO: aiContext?.todayISO ?? new Date().toISOString().slice(0, 10),
      workingHours: aiContext?.workingHours,
      knowledgeDocs: [],
    };

    const trimmed = message.body.trim();

    // 1. Greetings skip retrieval but still go through the agent so the greeting
    //    itself comes from the clinic's soul.md — never from hardcoded defaults.
    const isGreetingMsg = isGreeting(trimmed);
    const appointmentIntent = hasAppointmentIntent(trimmed);
    const usesKnowledgeBase =
      !isGreetingMsg && (hasFactualIntent(trimmed) || !appointmentIntent);

    let knowledgeDocs: { title: string; content: string }[] = [];
    if (usesKnowledgeBase) {
      // Retrieval only supplements soul.md. If nothing matches, the agent still
      // answers from soul.md and falls back to the configured reply when soul.md
      // itself lacks the information.
      const hits = await retrieveKnowledge(db, org.id, trimmed);
      knowledgeDocs = hits.map((h) => ({ title: h.title, content: h.content }));
    }

    const context: AgentContext = { ...contextBase, knowledgeDocs };

    // Backend enforcement of the knowledge boundary: for explicit factual
    // questions (fees, hours, location, contact...) with no retrieved knowledge
    // document AND no relevant soul.md content, do not call the LLM at all.
    // The customer gets the configured fallback — the model never gets a
    // chance to answer from general knowledge.
    const blockedByBoundary =
      hasFactualIntent(trimmed) &&
      knowledgeDocs.length === 0 &&
      contentRelevance(trimmed, soul.content) < SOUL_RELEVANCE_MIN_SCORE;

    const reply: AgentReply = blockedByBoundary
      ? makeFallbackReply(soul.fallbackReply)
      : await runAgent(context, message.body);

    const authorizedContextText = [
      context.soul,
      ...context.knowledgeDocs.map((d) => `${d.title}\n${d.content}`),
      ...context.doctors,
      context.workingHours
        ? `${context.workingHours.open} - ${context.workingHours.close}`
        : null,
      context.todayISO,
    ]
      .filter((s): s is string => Boolean(s))
      .join("\n");

    let sentText: string;
    try {
      const actionText = await executeAction(db, context, customer, reply);
      if (actionText) {
        sentText = actionText;
      } else if (!isCurrencyGrounded(reply.reply, authorizedContextText)) {
        // Response grounding (soul.md §17 step 7): the agent quoted a price
        // that does not exist in the authorized context — replace with the
        // configured fallback instead of sending a hallucinated amount.
        sentText = soul.fallbackReply;
      } else {
        sentText = reply.reply;
      }
    } catch (err) {
      const code = err instanceof AiApiError ? err.code : undefined;
      logger.warn("whatsapp action failed", {
        organizationId: org.id,
        customerId: customer.id,
        code,
      });
      sentText = code === "SLOT_TAKEN" ? SLOT_TAKEN_REPLY : BOOKING_FAILED_REPLY;
    }

    if (!message.id?.fromMe) {
      await client.sendMessage(remote, sentText);
    }

    await extractAndStoreFacts(db, org.id, customer.id, message.body);
    await saveTurn(org.id, customer, {
      messageId,
      message: message.body,
      reply,
      aiResponse: sentText,
      sentText,
    });
    await touchCustomer(db, org.id, customer.id);
    void maybeSummarize(db, org.id, customer.id);
  } catch (err) {
    if (
      err instanceof NvidiaConfigError ||
      err instanceof NvidiaApiError ||
      err instanceof AgentParseError ||
      err instanceof AiApiError
    ) {
      logger.warn("whatsapp message processing failed", {
        remote,
        error: err instanceof NvidiaApiError ? err.code : err.message,
      });
    } else {
      logger.error("whatsapp message processing failed", { remote });
    }
    try {
      if (!message.id?.fromMe) {
        await client.sendMessage(remote, FALLBACK_REPLY);
      }
    } catch {
      // connection issue; nothing more to do
    }
  }
}
