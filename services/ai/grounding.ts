import { EMPTY_SLOT, type AgentReply } from "@/lib/ai-types";

/**
 * Builds the structured agent reply used by the backend knowledge-boundary
 * gate. Returning this reply skips the LLM entirely — the customer receives the
 * doctor's configured fallback and no unsupported generation happens.
 */
export function makeFallbackReply(fallbackText: string): AgentReply {
  return {
    reply: fallbackText,
    intent: "none",
    appointment: { ...EMPTY_SLOT },
    state: "done",
    action: null,
  };
}

const CURRENCY_PATTERN = /(?:rs\.?\s*|₹|inr\s*)([\d][\d,]*(?:\.\d+)?)/gi;

function digitsOf(value: string): string {
  return value.replace(/[^\d]/g, "").replace(/^0+/, "");
}

/**
 * Extracts normalized currency amounts (Rs./₹/INR) from a text.
 */
export function extractCurrencyAmounts(text: string): string[] {
  const amounts: string[] = [];
  for (const match of text.matchAll(CURRENCY_PATTERN)) {
    const amount = digitsOf(match[1]);
    if (amount) amounts.push(amount);
  }
  return amounts;
}

/**
 * Response-grounding validation (soul.md §17 step 7). Any currency amount the
 * agent put in the reply must already exist in the authorized context (the
 * current soul.md, retrieved knowledge documents, and authorized system
 * context). An amount the model invented fails the check so the backend can
 * return the configured fallback instead of a hallucinated price.
 *
 * The check is intentionally narrow (currency amounts only) so it can never
 * block natural replies that mention dates, times, or ordinary numbers.
 */
export function isCurrencyGrounded(reply: string, authorizedContext: string): boolean {
  const contextAmounts = new Set(extractCurrencyAmounts(authorizedContext));
  for (const amount of extractCurrencyAmounts(reply)) {
    if (!contextAmounts.has(amount)) return false;
  }
  return true;
}
