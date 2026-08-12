const GREETING_PATTERN =
  /^(hi|hii+|hello|hey|yo|namaste|good\s+(morning|afternoon|evening))\b/i;

const GREETING_MAX_LENGTH = 40;

const APPOINTMENT_PATTERN =
  /\b(book|booking|appointment|appointments|schedule|scheduling|slot|slots|consult|consultation|reschedule|rescheduling|cancel|rebook|postpone|available|avail|my\s+appointment|appointment\s+status|see\s+(a|the|dr\.?|doctor)|visit|free\s+today)\b/i;

const FACTUAL_PATTERN =
  /\b(fee|fees|cost|costs|price|prices|charge|charges|how much|open|opens|close|closes|closing|hours|timing|timings|location|located|address|where|contact|phone|call us|email|insurance|payment|parking|directions)\b/i;

/**
 * Detects a pure greeting (e.g. "hi", "hello"). Only messages that are
 * essentially just a greeting match — longer messages flow into the normal
 * intent handling even when they start with a greeting.
 */
export function isGreeting(text: string): boolean {
  if (!text || text.length > GREETING_MAX_LENGTH) return false;
  return GREETING_PATTERN.test(text.trim());
}

/**
 * Detects appointment / scheduling intents (booking, reschedule, cancel,
 * status). Appointment intents bypass knowledge-base retrieval and use the
 * official scheduling tool.
 */
export function hasAppointmentIntent(text: string): boolean {
  if (!text) return false;
  return APPOINTMENT_PATTERN.test(text);
}

/**
 * Detects factual questions (fees, hours, location, contact...). Factual
 * questions take precedence over appointment intents and are answered from the
 * knowledge base only.
 */
export function hasFactualIntent(text: string): boolean {
  if (!text) return false;
  return FACTUAL_PATTERN.test(text);
}
