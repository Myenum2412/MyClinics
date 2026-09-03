import type { Client, Message } from "whatsapp-web.js";
import type { Db } from "mongodb";
import { getWhatsAppDb } from "@/lib/db-pools";
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
import { sendWithTimeout } from "@/services/whatsapp/send.utils";
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
import { now as nowFn, nowISO, nowMs, todayISO } from "@/clinic/core/datetime";
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
 * Lowered to 0.10 to be more answerable for related chats — the LLM is still
 * strictly grounded in soul.md + retrieved knowledge, so a lower threshold
 * only reduces false fallback for paraphrased related questions (e.g. "clinic
 * timings?" vs "opening hours").
 */
const SOUL_RELEVANCE_MIN_SCORE = 0.10;

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
  return message.from.endsWith("@g.us") || message.from === "status@broadcast" || message.from.endsWith("@broadcast");
}

async function getCachedContext(organizationId: string) {
  const cached = contextCache.get(organizationId);
  if (cached && nowMs() - cached.at < CONTEXT_TTL_MS) {
    return cached.ctx;
  }
  const { data } = await getAiContext(organizationId);
  contextCache.set(organizationId, { at: nowMs(), ctx: data });
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
      bookedAt: nowISO(),
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

/**
 * Checks if a phone belongs to a clinic patient (patients only storage).
 * Matches last 10 digits against clc_patients.mobile and patients collections.
 * If no patient match, returns false — caller should skip persisting.
 */
async function isPatientPhone(db: Db, phoneNumber: string): Promise<boolean> {
  const digits = normalizeWhatsappId(phoneNumber).slice(-10);
  if (digits.length < 8) return false;
  const suffix = digits.slice(-8);
  const regex = { $regex: suffix, $options: "" } as unknown as string;
  // Check clc_patients (multi-tenant)
  const hit1 = await db.collection("clc_patients").findOne({ mobile: regex } as never);
  if (hit1) return true;
  // Check legacy patients + clc_users with role patient (phone field)
  const hit2 = await db.collection("patients").findOne({ phoneNumber: regex } as never);
  if (hit2) return true;
  const hit3 = await db.collection("clc_users").findOne({ role: "patient", phone: regex } as never);
  if (hit3) return true;
  return false;
}

async function saveTurn(
  organizationId: string,
  customer: WaCustomer,
  incoming: { messageId: string; message: string; reply: AgentReply; aiResponse: string; sentText: string }
): Promise<void> {
  const db = await getWhatsAppDb();
  // Patients-only storage: skip persisting for non-patient numbers (e.g. spam/broadcast)
  try {
    if (!(await isPatientPhone(db, customer.phoneNumber))) {
      logger.info("skip wa_conversations persist: not a patient", { phone: customer.phoneNumber.slice(-4) });
      return;
    }
  } catch {
    // on DB error, fall back to storing to avoid losing chats
  }
  const now = nowFn();
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

/** Persists even the fallback error case so incomplete chats can continue via history (`getRecentHistory`). */
async function saveFallbackTurn(
  organizationId: string,
  customer: WaCustomer,
  messageId: string,
  effectiveText: string,
  fallbackText: string
): Promise<void> {
  const db = await getWhatsAppDb();
  try {
    if (!(await isPatientPhone(db, customer.phoneNumber))) return;
  } catch {}
  const now = nowFn();
  const fakeReply: AgentReply = {
    reply: fallbackText,
    intent: "none",
    appointment: { customerName: null, doctorName: null, date: null, time: null },
    state: "done",
    action: null,
  };
  await saveConversation(db, {
    organizationId,
    customerId: customer.id,
    whatsappMessageId: messageId,
    direction: "incoming",
    message: effectiveText,
    aiResponse: fallbackText,
    intent: "none",
    timestamp: now,
  });
  await saveConversation(db, {
    organizationId,
    customerId: customer.id,
    whatsappMessageId: messageId,
    direction: "outgoing",
    message: fallbackText,
    timestamp: now,
  });
  // still touch for continuity
  void touchCustomer(db, organizationId, customer.id).catch(() => {});
}

async function extractUserContent(
  message: Message
): Promise<{ text: string; multimodal: import("@/services/ai/agent.service").AgentUserContent | null }> {
  const body = (message.body ?? "").trim();
  // No media — plain text
  if (!message.hasMedia) {
    return { text: body, multimodal: null };
  }
  try {
    const media = await message.downloadMedia();
    if (!media?.data || !media?.mimetype) {
      return { text: body, multimodal: null };
    }
    const dataUrl = `data:${media.mimetype};base64,${media.data}`;
    // Image → send as image_url (omni vision)
    if (media.mimetype.startsWith("image/")) {
      const promptText = body || "What is in this image? Answer based on the image and help the patient accordingly.";
      return {
        text: `${promptText} [image attached]`,
        multimodal: [
          { type: "text", text: promptText },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      };
    }
    // Voice / audio → send as audio_url for omni (falls back to text wrapper if model doesn't support raw audio)
    if (media.mimetype.startsWith("audio/") || message.type === "ptt" || message.type === "audio") {
      const promptText = body || "Transcribe this voice message and respond to its intent. The voice is from a clinic patient. Reply in the same language style (Tanglish if patient used Tanglish, else English).";
      return {
        text: `${promptText} [voice message attached: ${media.mimetype}]`,
        multimodal: [
          { type: "text", text: promptText },
          { type: "audio_url", audio_url: { url: dataUrl } },
        ],
      };
    }
    // Other media (document, video) — treat as text with note
    return { text: body ? `${body} [media: ${media.mimetype}]` : `[media: ${media.mimetype}]`, multimodal: null };
  } catch (err) {
    logger.warn("whatsapp media download failed", { error: err instanceof Error ? err.message : String(err) });
    return { text: body, multimodal: null };
  }
}

/**
 * Full WhatsApp → AI → backend pipeline for a single incoming message.
 */
export async function handleIncomingMessage(client: Client, message: Message): Promise<void> {
  const remote = message.from;
  const messageId = message.id?.id ?? `${remote}-${nowMs()}`;

  if (message.fromMe || isGroupMessage(message)) return;
  // Allow media messages even when body is empty (voice/image)
  if (!message.body && !message.hasMedia) return;
  if (!dedupe(messageId)) return;
  if (!limiter.check(remote)) {
    await sendWithTimeout(client, remote, RATE_LIMIT_REPLY);
    return;
  }

  const db = await getWhatsAppDb();
  // Hoisted so catch can persist fallback and keep history continuity for incomplete chats
  let orgForError: { id: string } | null = null;
  let customerForError: WaCustomer | null = null;
  let effectiveTextForError: string = "";
  let messageIdForError: string = messageId;

  try {
    const botNumber = client.info?.me?.user ?? null;
    let org = (await findOrganizationByWhatsappNumber(db, botNumber)) ?? (await ensureDefaultOrganization(db));
    orgForError = org;
    // For per-clinic notification numbers, use the clinic's name for AI replies (each clinic has its own WhatsApp)
    let clinicNameOverride: string | null = null;
    if (botNumber) {
      try {
        const clinicSession = await db.collection("wa_clinic_sessions").findOne({ phone: botNumber });
        if (clinicSession?.clinicId) {
          const clinic = await db.collection("clc_clinics").findOne({ clinicId: clinicSession.clinicId });
          if (clinic?.name) clinicNameOverride = clinic.name;
        }
        if (!clinicNameOverride) {
          const clinicByPhone = await db.collection("clc_clinics").findOne({ phone: botNumber });
          if (clinicByPhone?.name) clinicNameOverride = clinicByPhone.name;
        }
      } catch {}
    }

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
    customerForError = customer;

    // AI Agent toggle — per-clinic setting (clinic_settings.aiAgentEnabled)
    try {
      const clinicSession = botNumber ? await db.collection("wa_clinic_sessions").findOne({ phone: botNumber }) : null;
      const clinicIdForAi = (clinicSession as any)?.clinicId;
      if (clinicIdForAi) {
        const clinicSettings = await db.collection("clc_clinic_settings").findOne({ clinicId: clinicIdForAi } as any);
        if (clinicSettings && (clinicSettings as any).aiAgentEnabled === false) {
          logger.info("whatsapp ai disabled for clinic", { clinicId: clinicIdForAi });
          return;
        }
      }
    } catch {}

    // Extract text + media (voice/image) for omni model
    const { text: effectiveText, multimodal } = await extractUserContent(message);
    effectiveTextForError = effectiveText;
    messageIdForError = messageId;
    if (!effectiveText && !multimodal) return;

    logger.info("whatsapp incoming message", {
      organizationId: org.id,
      customerId: customer.id,
      length: effectiveText.length,
      hasMedia: message.hasMedia,
      type: (message as unknown as { type?: string }).type,
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
      clinicName: clinicNameOverride ?? org.name,
      soul: soul.content,
      fallbackReply: soul.fallbackReply,
      customerName: customer.name,
      phoneNumber: customer.phoneNumber,
      memoryFacts,
      conversationSummary,
      history,
      doctors: aiContext?.doctors ?? [],
      todayISO: aiContext?.todayISO ?? todayISO(),
      workingHours: aiContext?.workingHours,
      knowledgeDocs: [],
    };

    const trimmed = effectiveText.trim();

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
    // For voice/media the effectiveText already contains the transcription prompt, so boundary still applies.
    // Exception: image/voice multimodal should always reach the LLM (vision/transcription) even if blocked.
    const hasImageOrAudio = Array.isArray(multimodal) && multimodal.some((p) => (p as { type: string }).type !== "text");
    const blockedByBoundary =
      !hasImageOrAudio &&
      hasFactualIntent(trimmed) &&
      knowledgeDocs.length === 0 &&
      contentRelevance(trimmed, soul.content) < SOUL_RELEVANCE_MIN_SCORE;

    const reply: AgentReply = blockedByBoundary
      ? makeFallbackReply(soul.fallbackReply)
      : await runAgent(context, multimodal ?? effectiveText);

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
      const sent = await sendWithTimeout(client, remote, sentText);
      logger.info("whatsapp reply sent", {
        organizationId: org.id,
        customerId: customer.id,
        sent,
        intent: reply.intent,
        length: sentText.length,
      });
    }

    await extractAndStoreFacts(db, org.id, customer.id, effectiveText);
    await saveTurn(org.id, customer, {
      messageId,
      message: effectiveText,
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
        error: err instanceof NvidiaApiError ? err.message : err instanceof Error ? err.message : String(err),
        status: err instanceof NvidiaApiError ? err.status : undefined,
      });
    } else {
      logger.error("whatsapp message processing failed", { remote, error: err instanceof Error ? err.message : String(err) });
    }
    // Persist fallback so incomplete chats can continue with new chat via `getRecentHistory`
    if (orgForError && customerForError) {
      try {
        await saveFallbackTurn(orgForError.id, customerForError, messageIdForError, effectiveTextForError || (message.body ?? ""), FALLBACK_REPLY);
      } catch {}
    }
    try {
      if (!message.id?.fromMe) {
        await sendWithTimeout(client, remote, FALLBACK_REPLY);
      }
    } catch {
      // connection issue; nothing more to do
    }
  }
}
