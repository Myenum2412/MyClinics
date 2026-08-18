import type {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { getSessionUser, type SessionUser } from "@/lib/auth-token";
import { canAccessBilling } from "@/lib/roles";
import { verifyClinicToken } from "@/clinic/core/jwt";

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

/** Guards the cron webhook via the `x-cron-secret` header. */
export function requireCronSecret(
  request: FastifyRequest,
  reply: FastifyReply
): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    reply.code(500).send({ error: "CRON_SECRET is not configured" });
    return false;
  }
  if (request.headers["x-cron-secret"] !== secret) {
    reply.code(401).send({ error: "Unauthorized" });
    return false;
  }
  return true;
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