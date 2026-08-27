import crypto from "node:crypto";
import type {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { getSessionUser, type SessionUser } from "@/lib/auth-token";
import { canAccessBilling } from "@/lib/roles";
import { verifyClinicToken } from "@/clinic/core/jwt";

/** Fastify stores the exact request body bytes here (set in the JSON content-type parser). */
type RawBodyRequest = FastifyRequest & { rawBody?: string | Buffer };

/**
 * Verifies CronLite's HMAC-SHA256 webhook signature (header `X-CronLite-Signature`,
 * raw hex — no `sha256=` prefix). The signature is computed over the exact raw
 * request body with the shared `CRONLITE_WEBHOOK_SECRET` (falls back to CRON_SECRET).
 */
export function verifyCronLiteSignature(request: FastifyRequest): boolean {
  const secret = process.env.CRONLITE_WEBHOOK_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers["x-cronlite-signature"];
  if (typeof header !== "string" || header.length === 0) return false;

  const raw = (request as RawBodyRequest).rawBody;
  const bodyBuf =
    raw == null
      ? Buffer.alloc(0)
      : Buffer.isBuffer(raw)
        ? raw
        : Buffer.from(raw, "utf8");

  const expected = crypto.createHmac("sha256", secret).update(bodyBuf).digest("hex");
  const provided = Buffer.from(header.trim().toLowerCase());

  // Constant-time compare; reject outright on length mismatch (timingSafeEqual
  // throws on length mismatch, which would otherwise 500 the request).
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(provided, Buffer.from(expected));
}

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

/** Guards routes that only accept the internal AI token (Bearer). */
export function requireInternalToken(
  request: FastifyRequest,
  reply: FastifyReply
): boolean {
  const configured = process.env.AI_INTERNAL_TOKEN;
  if (!configured) {
    reply.code(500).send({ error: "AI_INTERNAL_TOKEN is not configured" });
    return false;
  }
  if (request.headers.authorization !== `Bearer ${configured}`) {
    reply.code(401).send({ error: "Unauthorized" });
    return false;
  }
  return true;
}

/**
 * Guards the cron webhook. Accepts either a CronLite HMAC-signed delivery
 * (preferred) or the legacy `x-cron-secret` shared-secret header (manual
 * pings / backwards-compatibility). A request is authorized if it satisfies
 * either check.
 */
export function requireCronSecret(
  request: FastifyRequest,
  reply: FastifyReply
): boolean {
  if (verifyCronLiteSignature(request)) return true;

  const secret = process.env.CRON_SECRET;
  if (secret && request.headers["x-cron-secret"] === secret) return true;

  reply.code(401).send({ error: "Unauthorized" });
  return false;
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