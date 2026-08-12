/**
 * Normalizes a phone number into a WhatsApp Web remote id (e.g.
 * "919876543210@c.us"). Returns null when the number cannot be resolved.
 */
export function toWhatsAppRemoteId(
  phone: string | null | undefined
): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  if (/@c\.us$/.test(trimmed)) return trimmed;
  let digits = trimmed.replace(/[^\d]/g, "");
  if (digits.length === 10) digits = `91${digits}`;
  if (digits.length < 10 || digits.length > 15) return null;
  return `${digits}@c.us`;
}
