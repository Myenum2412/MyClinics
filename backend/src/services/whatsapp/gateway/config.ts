/**
 * Connection settings for the standalone whatsapp-gateway service.
 * Read lazily (not at import time) so tests and late env loading work.
 */
export interface GatewayConfig {
  url: string;
  secret: string;
}

export function getGatewayConfig(): GatewayConfig | null {
  const url = process.env.GATEWAY_URL?.trim().replace(/\/+$/, "");
  const secret = process.env.GATEWAY_SECRET?.trim();
  if (!url || !secret) return null;
  return { url, secret };
}

export function requireGatewayConfig(): GatewayConfig {
  const cfg = getGatewayConfig();
  if (!cfg) throw new Error("WhatsApp gateway is not configured (set GATEWAY_URL and GATEWAY_SECRET)");
  return cfg;
}

/**
 * Gateway session id used for notifications that have no clinic (the old
 * "central" number). Clinic notifications always use their own clinicId.
 */
export function legacySessionId(): string {
  return process.env.GATEWAY_LEGACY_SESSION_ID?.trim() || "platform";
}
