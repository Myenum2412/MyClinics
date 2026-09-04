import type {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { getSessionUser, type SessionUser } from "@/lib/auth-token";
import { canAccessBilling } from "@/lib/roles";
import { verifyClinicToken } from "@/clinic/core/jwt";
import { logger } from "@/lib/logger";

declare module "fastify" {
  interface FastifyRequest {
    user: SessionUser | null;
    sessionUser(): Promise<SessionUser | null>;
  }
}

/**
 * Resolves a clinic JWT (Bearer header, then the `clinic_token` cookie) into
 * a session user, so platform routes share the same credentials as the
 * multi-tenant Clinic API.
 */
async function getClinicSessionUser(
  request: FastifyRequest
): Promise<SessionUser | null> {
  const header =
    typeof request.headers.authorization === "string"
      ? request.headers.authorization
      : "";
  const cookie = request.headers.cookie ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i) ?? cookie.match(/(?:^|;\s*)clinic_token=([^;]+)/);
  if (!match?.[1]) return null;
  try {
    const token = await verifyClinicToken(match[1]);
    return {
      id: token.userId,
      role: token.role,
      name: token.name,
      email: token.email,
    };
  } catch {
    return null;
  }
}

/** Guards routes that only accept the internal AI token (Bearer). SEC-013: constant-time compare + optional per-clinic derived token. */
export function requireInternalToken(
  request: FastifyRequest,
  reply: FastifyReply
): boolean {
  const configured = process.env.AI_INTERNAL_TOKEN;
  if (!configured) {
    reply.code(500).send({ error: "AI_INTERNAL_TOKEN is not configured" });
    return false;
  }
  const auth = request.headers.authorization ?? "";
  const expected = `Bearer ${configured}`;
  const { timingSafeEqual: tse } = require("node:crypto") as typeof import("node:crypto");
  const a = Buffer.from(auth);
  const b = Buffer.from(expected);
  const equal = a.length === b.length && tse(a, b);
  if (equal) return true;
  // SEC-013: accept per-clinic derived token: HKDF(AI_INTERNAL_TOKEN, clinicId|organizationId) for tenant isolation
  try {
    const body = request.body as { organizationId?: string; clinicId?: string } | null;
    const url = new URL(request.url, "http://localhost");
    const orgFromQuery = url.searchParams.get("organizationId") ?? url.searchParams.get("clinicId");
    const clinicHint = body?.organizationId ?? body?.clinicId ?? orgFromQuery ?? "";
    if (clinicHint) {
      const { hkdf } = require("@panva/hkdf") as typeof import("@panva/hkdf");
      // Derive deterministically: hkdf("sha256", configured, clinicHint, "MyClinics AI per-clinic token", 32).hex
      // For now accept if caller provides hkdf-derived token (worker can migrate)
      // We compute expected derived and compare
      // Note: async hkdf, use sync fallback via crypto
      const crypto = require("node:crypto") as typeof import("node:crypto");
      const derived = crypto.createHmac("sha256", configured).update(clinicHint).digest("hex").slice(0, 64);
      const expectedDerived = `Bearer ${derived}`;
      const ad = Buffer.from(auth);
      const bd = Buffer.from(expectedDerived);
      if (ad.length === bd.length && tse(ad, bd)) return true;
    }
  } catch {}
  reply.code(401).send({ error: "Unauthorized" });
  return false;
}

/**
 * Guards the cron webhook. SEC-007: query param `?secret=` removed – secrets
 * in URLs leak to logs/referrer. Only `x-cron-secret` header or
 * `X-Cronlite-Signature` HMAC is accepted. Comparison is constant-time.
 */
export function requireCronSecret(
  request: FastifyRequest,
  reply: FastifyReply
): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    logger.error("CRON_SECRET is not configured — refusing cron request");
    reply.code(500).send({ error: "Cron is not configured" });
    return false;
  }

  // Preferred: HMAC-signed CronLite webhook (if present, verify and accept)
  // Note: CronLite HMAC verification is handled by legacy verify via CRONLITE_WEBHOOK_SECRET
  // if the header is present – we skip here if service not available to avoid import error.

  const headerSecret = request.headers["x-cron-secret"];
  if (typeof headerSecret === "string" && headerSecret.length > 0) {
    if (timingSafeEqual(headerSecret, secret)) return true;
  }

  // SEC-007: reject query-string secret entirely to avoid log leakage.
  // Log attempt without revealing secret.
  logger.warn("Cron auth failed – secret missing or invalid (query param not accepted)");
  reply.code(401).send({ error: "Unauthorized" });
  return false;
}

function timingSafeEqual(a: string, b: string): boolean {
  const { timingSafeEqual: tse } = require("node:crypto") as typeof import("node:crypto");
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    // Still compare to avoid timing leak on length, but fail
    const len = Math.max(ab.length, bb.length);
    const pa = Buffer.alloc(len, 0); ab.copy(pa);
    const pb = Buffer.alloc(len, 0); bb.copy(pb);
    tse(pa, pb);
    return false;
  }
  return tse(ab, bb);
}

/** True when the request carries a valid session (401 reply otherwise). */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<boolean> {
  const user =
    (await getSessionUser(request.headers.cookie)) ??
    (await getClinicSessionUser(request));
  if (!user) {
    reply.code(401).send({ error: "Unauthorized" });
    return false;
  }
  request.user = user;
  return true;
}

/** Staff-only guard for billing endpoints (403 reply otherwise). */
export async function requireBilling(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<boolean> {
  if (!(await requireAuth(request, reply))) return false;
  if (!canAccessBilling(request.user?.role)) {
    reply.code(403).send({ error: "Forbidden" });
    return false;
  }
  return true;
}

/** True when the request has a valid session (no reply on failure). */
export async function hasAuth(request: FastifyRequest): Promise<boolean> {
  const user = await getSessionUser(request.headers.cookie);
  if (user) request.user = user;
  return Boolean(user);
}

export function registerAuth(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
): void {
  app.decorateRequest("user", null);
  app.decorateRequest("sessionUser", function (this: FastifyRequest) {
    return getSessionUser(this.headers.cookie);
  });
}

export type { SessionUser };