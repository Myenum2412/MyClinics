/**
 * HMAC signing shared with the MyClinics API.
 * Both directions send X-Gateway-Timestamp (unix seconds) and
 * X-Gateway-Signature = hex(HMAC_SHA256(secret, `${timestamp}.${rawBody}`)).
 * Timestamps older than 5 minutes are rejected.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const HEADER_TS = "x-gateway-timestamp";
export const HEADER_SIG = "x-gateway-signature";
const MAX_SKEW_SEC = 300;

export function signBody(secret: string, timestamp: string, body: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

export function signedHeaders(secret: string, body = "", nowMs = Date.now()): Record<string, string> {
  const ts = String(Math.floor(nowMs / 1000));
  return { [HEADER_TS]: ts, [HEADER_SIG]: signBody(secret, ts, body) };
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
  let expected: Buffer;
  let given: Buffer;
  try {
    expected = Buffer.from(signBody(secret, parts.timestamp, body), "hex");
    given = Buffer.from(parts.signature, "hex");
  } catch {
    return false;
  }
  return expected.length === given.length && timingSafeEqual(expected, given);
}
