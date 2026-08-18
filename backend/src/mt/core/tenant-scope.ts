import type {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { getDb } from "@/lib/db";
import { cached, invalidateCache } from "@/lib/cache";
import { MT_COLLECTIONS } from "@/mt/core/collections";
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} from "@/mt/core/errors";
import {
  verifyTenantToken,
  isValidClinicId,
  type VerifiedToken,
} from "@/mt/core/jwt";
import { isMtRole, ROLE_PRIORITY, type MtRole } from "@/mt/core/roles";
import {
  type TenantContext,
  requestMeta,
} from "@/mt/core/tenant-context";

interface ActiveUser {
  userId: string;
  clinicId: string;
  role: MtRole;
  name: string | null;
  email: string | null;
  patientId: string | null;
  clinicActive: boolean;
  userActive: boolean;
}

/**
 * Re-validates the token claims against the database, cached in-process for
 * 30 seconds so a deactivated user or clinic is locked out within that
 * window. Cache entries are invalidated by the users/clinics services on
 * writes.
 */
async function loadActiveTenantUser(token: VerifiedToken): Promise<ActiveUser | null> {
  if (!isValidClinicId(token.clinicId) || !isMtRole(token.role)) return null;

  const key = `mt:user:${token.userId}:${token.clinicId}`;
  return cached(key, 30_000, async () => {
    const db = await getDb();
    const user = await db
      .collection(MT_COLLECTIONS.users)
      .findOne({ userId: token.userId, clinicId: token.clinicId });
    if (!user) return null;

    const clinic = await db
      .collection(MT_COLLECTIONS.clinics)
      .findOne({ clinicId: token.clinicId }, { projection: { status: 1 } });

    return {
      userId: token.userId,
      clinicId: token.clinicId,
      role: isMtRole(user.role) ? user.role : token.role,
      name: typeof user.name === "string" ? user.name : token.name,
      email: typeof user.email === "string" ? user.email : token.email,
      patientId: typeof user.patientId === "string" ? user.patientId : null,
      clinicActive: clinic?.status === "active",
      userActive: user.status !== "inactive",
    };
  });
}

function extractBearer(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7).trim() || null;
  return null;
}

function extractCookie(request: FastifyRequest): string | null {
  const header = request.headers.cookie;
  if (!header) return null;
  const match = header.match(/(?:^|;\s*)mt_token=([^;]+)/);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

/**
 * The tenant-scope middleware.
 *
 * 1. Extracts the JWT (Bearer header, then `mt_token` cookie).
 * 2. Verifies signature/expiry/issuer/audience and claims (clinicId, role).
 * 3. Re-validates the user + clinic against the database (cached 30s).
 * 4. Injects the resolved TenantContext into `request.tenant`.
 *
 * Every route registered on the SAME Fastify instance (or its children)
 * after this call is guaranteed to have a valid tenant context — there is
 * no code path that reaches a handler without one.
 *
 * NOTE: this applies hooks to the passed instance directly. It must be
 * called with the instance that owns the protected routes (not via
 * `app.register(...)`), because Fastify hooks do not propagate from a
 * child plugin context up to sibling routes.
 */
export function applyTenantScope(app: FastifyInstance): void {
  app.decorateRequest("tenant", null);

  app.addHook("onRequest", async (request, reply) => {
    const token = extractBearer(request) ?? extractCookie(request);
    if (!token) {
      throw new UnauthorizedError("Missing authentication token");
    }

    let verified: VerifiedToken;
    try {
      verified = await verifyTenantToken(token);
    } catch {
      throw new UnauthorizedError("Invalid or expired token");
    }

    const active = await loadActiveTenantUser(verified);
    if (!active || !active.clinicActive || !active.userActive) {
      throw new UnauthorizedError("Account is not active");
    }

    const { ip, userAgent } = requestMeta(request);
    const tenant: TenantContext = {
      userId: active.userId,
      clinicId: active.clinicId,
      role: active.role,
      name: active.name,
      email: active.email,
      patientId: active.patientId,
      tokenId: verified.jti,
      ip,
      userAgent,
    };
    request.tenant = tenant;
  });
}

/**
 * Route guard: allows only the given minimum role (or exact set).
 * `requireRoles("staff")` accepts clinic_admin + staff via hierarchy.
 */
export function requireRoles(
  minimum: MtRole,
  opts: { exact?: boolean } = {}
): (request: FastifyRequest, reply: FastifyReply) => Promise<void> | void {
  return async (request, reply) => {
    const ctx = request.tenant;
    if (!ctx) {
      throw new UnauthorizedError();
    }
    const allowed = opts.exact
      ? ctx.role === minimum
      : ROLE_PRIORITY[ctx.role] >= ROLE_PRIORITY[minimum];
    if (!allowed) {
      reply.code(403).send({ error: "Forbidden", code: "FORBIDDEN" });
    }
  };
}

/**
 * Patient ownership guard for routes like `GET /patients/:patientId`.
 * A patient may only ever access their OWN patient record; staff may access
 * any record within their clinic. The tenant repository guarantees the
 * clinic boundary, this guard guarantees the ownership boundary.
 *
 * Ownership failures return 404 (not 403) so a patient cannot even learn
 * whether a record exists in the clinic.
 */
export async function requirePatientAccess(
  request: FastifyRequest,
  reply: FastifyReply,
  targetPatientId: string | undefined
): Promise<void> {
  const ctx = request.tenant;
  if (!ctx) throw new UnauthorizedError();
  if (ctx.role === "clinic_admin" || ctx.role === "staff") return;
  if (!targetPatientId || ctx.patientId !== targetPatientId) {
    throw new NotFoundError();
  }
}

/**
 * PreHandler: staff/clinic_admin pass; a patient passes only when the
 * `:patientId` route param equals their own patientId claim.
 *
 * NOTE: this Fastify version invokes route hooks as `fn(req, reply, next)`
 * and only continues the chain when the hook returns a promise or calls the
 * callback — a synchronous hook that returns `undefined` hangs the request.
 * Hence this guard is async (same as `requireRoles`).
 */
export async function allowStaffOrOwnPatient(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const ctx = request.tenant;
  if (!ctx) throw new UnauthorizedError();
  if (ctx.role === "clinic_admin" || ctx.role === "staff") return;
  const params = request.params as { patientId?: string };
  if (!params.patientId || ctx.patientId !== params.patientId) {
    throw new NotFoundError();
  }
}

/** Drops the cached tenant-user record so the next request revalidates. */
export function invalidateTenantCache(userId: string, clinicId: string): void {
  invalidateCache(`mt:user:${userId}:${clinicId}`);
}

export { NotFoundError };
