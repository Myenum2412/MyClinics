import type { Db } from "mongodb";
import { z } from "zod";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import type { ClinicDoc } from "@/clinic/core/types";
import { logger } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limiter";
import { handleMenuMessage } from "@/services/whatsapp/menu/engine";
import { loadMenuState, saveMenuState } from "@/services/whatsapp/menu/state";
import { createTenantMenuDeps, type TenantDepsParams } from "@/services/whatsapp/menu/tenant";

/** Webhook body the whatsapp-gateway sends for every incoming 1:1 message. */
export const inboundMessageSchema = z.object({
  clinicId: z.string().min(1).max(64),
  messageId: z.string().min(1).max(200),
  jid: z.string().min(3).max(120),
  /** Sender's phone number (digits with country code). */
  from: z.string().regex(/^\d{6,20}$/).nullable(),
  /** True when WhatsApp hid the phone number (privacy IDs): we cannot identify the patient. */
  lid: z.boolean().optional().default(false),
  pushName: z.string().max(200).nullable().optional(),
  type: z.string().max(20),
  text: z.string().max(4096),
  timestamp: z.number().optional(),
});
export type InboundMessage = z.infer<typeof inboundMessageSchema>;

export interface InboundResult {
  replies: { text: string }[];
}

const SAFE_ERROR_REPLY = "Sorry, something went wrong on our side. 🙏 Please try again in a moment, or send 0 for the menu.";
const UNVERIFIED_REPLY = "Sorry, we couldn't verify your phone number. 🙏 Please call the clinic to book your appointment.";

// Per-sender flood protection (in-memory, single process). Over the limit → stay silent.
const newLimiter = () => createRateLimiter({ windowMs: 10_000, max: 8 });
let limiter = newLimiter();
/** Test hook: start with a fresh flood-protection window. */
export const resetInboundRateLimiter = (): void => {
  limiter = newLimiter();
};

const none: InboundResult = { replies: [] };
const say = (texts: string[]): InboundResult => ({ replies: texts.map((text) => ({ text })) });

export async function handleInboundMessage(
  db: Db,
  msg: InboundMessage,
  io?: TenantDepsParams["io"]
): Promise<InboundResult> {
  const clinic = await db
    .collection<ClinicDoc>(CLINIC_COLLECTIONS.clinics)
    .findOne({ clinicId: msg.clinicId, status: "active" } as never);
  if (!clinic) {
    logger.warn("whatsapp inbound for unknown or inactive clinic", { clinicId: msg.clinicId });
    return none;
  }

  // Existing per-clinic switch (Settings → "AI agent"): when off, the number stays manual-only.
  const settings = await db.collection(CLINIC_COLLECTIONS.settings).findOne({ clinicId: clinic.clinicId });
  if ((settings as { aiAgentEnabled?: boolean } | null)?.aiAgentEnabled === false) return none;

  if (!msg.from || msg.lid) return say([UNVERIFIED_REPLY]);
  if (!limiter.check(`${clinic.clinicId}:${msg.from}`)) return none;

  try {
    const previous = await loadMenuState(db, clinic.clinicId, msg.from);

    // The gateway retries webhooks it could not confirm; replay instead of advancing the conversation twice.
    if (previous?.lastMessageId === msg.messageId && previous.lastReplies) return say(previous.lastReplies);

    const deps = createTenantMenuDeps({
      db,
      clinic,
      phone: msg.from,
      pushName: msg.pushName ?? null,
      messageId: msg.messageId,
      io,
    });
    const outcome = await handleMenuMessage({ text: msg.text, type: msg.type, pushName: msg.pushName ?? null }, previous, deps);

    if (outcome.state) {
      await saveMenuState(db, clinic.clinicId, msg.from, {
        ...outcome.state,
        lastMessageId: msg.messageId,
        lastReplies: outcome.replies,
      });
    }
    return say(outcome.replies);
  } catch (err) {
    logger.error("whatsapp menu failed", {
      clinicId: clinic.clinicId,
      error: err instanceof Error ? err.message : String(err),
    });
    return say([SAFE_ERROR_REPLY]);
  }
}
