import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { getDb } from "@/lib/db";
import { cached, invalidateCache } from "@/lib/cache";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "@/clinic/core/errors";
import {
  verifyClinicToken,
  isValidClinicId,
  type VerifiedClinicToken,
} from "@/clinic/core/jwt";
import { isClinicRole, ROLE_PRIORITY, type ClinicRole } from "@/clinic/core/roles";
import {
  type ClinicContext,
  requestMeta,
} from "@/clinic/core/context";
import { AUTH_LIMITER, API_LIMITER, enforceLimit } from "@/clinic/core/rate-limiter";

interface ActiveUser {
  userId: string;
  clinicId: string | null;
  role: ClinicRole;
  name: string | null;
  email: string | null;
  doctorId: string | null;
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
async function loadActiveClinicUser(token: VerifiedClinicToken): Promise<ActiveUser | null> {
  if (!isClinicRole(token.role)) return null;
  if (token.role !== "platform_admin" && !isValidClinicId(token.clinicId)) return null;

  const key = `clc:user:${token.userId}`;
  return cached(key, 30_000, async () => {
    const db = await getDb();
    const user = await db
      .collection(CLINIC_COLLECTIONS.users)
      .findOne({ userId: token.userId });
    if (!user) return null;
    // The token's clinic must still match the database record.
    if ((user.clinicId ?? null) !== (token.clinicId ?? null)) return null;

    let clinicActive = true;
    if (token.role !== "platform_admin" && token.clinicId) {
      const clinic = await db
        .collection(CLINIC_COLLECTIONS.clinics)
        .findOne({ clinicId: token.clinicId }, { projection: { status: 1 } });
      clinicActive = clinic?.status === "active";
    }

    return {
      userId: token.userId,
      clinicId: (user.clinicId as string | null) ?? null,
      role: isClinicRole(user.role) ? user.role : token.role,
      name: typeof user.name === "string" ? user.name : token.name,
      email: typeof user.email === "string" ? user.email : token.email,
      doctorId: typeof user.doctorId === "string" ? user.doctorId : null,
      patientId: typeof user.patientId === "string" ? user.patientId : null,
      clinicActive,
      userActive: user.status !== "inactive" && user.status !== "deleted",
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
  const match = header.match(/(?:^|;\s*)clinic_token=([^;]+)/);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

/**
 * The clinic-scope middleware.
 *
 * 1. Extracts the JWT (Bearer header, then `clinic_token` cookie).
 * 2. Verifies signature/expiry/issuer/audience and claims (clinicId, role).
 * 3. Re-validates the user + clinic against the database (cached 30s).
 * 4. Injects the resolved ClinicContext into `request.clinic`.
 *
 * Every route registered on the SAME Fastify instance (or its children)
 * after this call is guaranteed to have a valid clinic context — there is
 * no code path that reaches a handler without one.
 */
export function applyClinicScope(app: FastifyInstance): void {
  app.decorateRequest("clinic", null);

  app.addHook("onRequest", async (request, reply) => {
    const key = `${request.ip ?? "unknown"}:${request.url.split("?")[0] ?? "unknown"}`;
    if (!API_LIMITER.hit(key)) {
      throw new ForbiddenError("Too many requests, please try again later");
    }

    const token = extractBearer(request) ?? extractCookie(request);
    if (!token) {
      throw new UnauthorizedError("Missing authentication token");
    }

    let verified: VerifiedClinicToken;
    try {
      verified = await verifyClinicToken(token);
    } catch {
      throw new UnauthorizedError("Invalid or expired token");
    }

    const active = await loadActiveClinicUser(verified);
    if (!active || !active.clinicActive || !active.userActive) {
      throw new UnauthorizedError("Account is not active");
    }

    const { ip, userAgent } = requestMeta(request);
    const clinic: ClinicContext = {
      userId: active.userId,
      clinicId: active.clinicId,
      role: active.role,
      name: active.name,
      email: active.email,
      doctorId: active.doctorId,
      patientId: active.patientId,
      tokenId: verified.jti,
      ip,
      userAgent,
    };
    request.clinic = clinic;
  });
}

/**
 * Route guard: allows only the given minimum role (or exact set).
 * `requireRoles("staff")` accepts clinic_admin + staff via hierarchy;
 * `requireRoles("doctor")` accepts clinic_admin + doctor + staff.
 */
export function requireRoles(
  minimum: ClinicRole,
  opts: { exact?: boolean } = {}
): (request: FastifyRequest, reply: FastifyReply) => Promise<void> | void {
  return async (request, reply) => {
    const ctx = request.clinic;
    if (!ctx) {
      throw new UnauthorizedError();
    }
    const allowed = opts.exact
      ? ctx.role === minimum
      : ROLE_PRIORITY[ctx.role] >= ROLE_PRIORITY[minimum];
    if (!allowed) {
      throw new ForbiddenError("You do not have permission to perform this action");
    }
  };
}

/**
 * Clinic-access guard for `:clinicId` URL params.
 *
 * The URL clinicId is NEVER trusted on its own: it must match the clinic the
 * authenticated user belongs to (or the caller must be a platform_admin).
 * Mismatches return 404 so tenants cannot probe for other clinics' existence.
 *
 * For platform_admin, the validated URL clinicId is stamped into the context
 * so downstream services/repositories can scope their queries to the clinic
 * the platform admin is operating on.
 */
export async function requireClinicAccess(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const ctx = request.clinic;
  if (!ctx) throw new UnauthorizedError();
  const params = request.params as { clinicId?: string };
  if (!params.clinicId || !isValidClinicId(params.clinicId)) {
    throw new NotFoundError();
  }
  if (ctx.role === "platform_admin") {
    if (ctx.clinicId !== params.clinicId) {
      request.clinic = { ...ctx, clinicId: params.clinicId };
    }
    return;
  }
  if (ctx.clinicId !== params.clinicId) {
    throw new NotFoundError();
  }
}

/**
 * Patient ownership guard for `:patientId` routes. A patient may only ever
 * access their OWN patient record; staff/doctors are constrained further by
 * the repository doctor-scope. Ownership failures return 404 (not 403) so a
 * patient cannot even learn whether a record exists in the clinic.
 */
export async function allowStaffOrOwnPatient(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const ctx = request.clinic;
  if (!ctx) throw new UnauthorizedError();
  if (ctx.role === "clinic_admin" || ctx.role === "staff") return;
  const params = request.params as { patientId?: string };
  if (ctx.role === "doctor") {
    // Doctor access is verified at the service/repository level against the
    // patient's assigned doctorId.
    return;
  }
  if (!params.patientId || ctx.patientId !== params.patientId) {
    throw new NotFoundError();
  }
}

/**
 * Rate-limits auth endpoints more strictly than the general API limiter.
 * Keyed by IP so brute force is throttled before it reaches bcrypt.
 * Async so it can be used directly as a route preHandler.
 */
export async function limitAuth(request: FastifyRequest): Promise<void> {
  enforceLimit(AUTH_LIMITER, `auth:${request.ip ?? "unknown"}`);
}

/** Drops the cached tenant-user record so the next request revalidates. */
export function invalidateClinicCache(userId: string): void {
  invalidateCache(`clc:user:${userId}`);
}

export { NotFoundError };
