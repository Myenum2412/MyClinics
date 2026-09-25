import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Request signing shared with the standalone whatsapp-gateway service.
 * Both directions send X-Gateway-Timestamp (unix seconds) and
 * X-Gateway-Signature = hex(HMAC_SHA256(secret, `${timestamp}.${rawBody}`)).
 */
export const GATEWAY_HEADER_TS = "x-gateway-timestamp";
export const GATEWAY_HEADER_SIG = "x-gateway-signature";
const MAX_SKEW_SEC = 300;

export function signBody(secret: string, timestamp: string, body: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

export function signedHeaders(secret: string, body = "", nowMs = Date.now()): Record<string, string> {
  const ts = String(Math.floor(nowMs / 1000));
  return { [GATEWAY_HEADER_TS]: ts, [GATEWAY_HEADER_SIG]: signBody(secret, ts, body) };
}

export function verifySignature(
  secret: string,
  parts: { timestamp: unknown; signature: unknown },
  body: string,
  nowMs = Date.now()
): boolean {
  if (typeof parts.timestamp !== "string" || typeof parts.signature !== "string") return false;
  const ts = Number(parts.timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowMs / 1000 - ts) > MAX_SKEW_SEC) return false;
  const expected = Buffer.from(signBody(secret, parts.timestamp, body), "hex");
  const given = Buffer.from(parts.signature, "hex");
  return expected.length === given.length && timingSafeEqual(expected, given);
}
