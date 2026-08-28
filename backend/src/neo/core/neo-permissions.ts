import type { FastifyReply, FastifyRequest } from "fastify";
import {
  ForbiddenError,
  UnauthorizedError,
} from "@/clinic/core/errors";

/**
 * RGB Neo permission guards. RGB Neo is an organization-level capability.
 *  - platform_admin: full access, including organization-wide rollups.
 *  - clinic_admin / staff: access scoped to their own clinic only. They may
 *    never request organization-wide aggregates.
 */
export function requireNeoAccess(
  request: FastifyRequest,
  _reply: FastifyReply
): void {
  const ctx = request.clinic;
  if (!ctx) throw new UnauthorizedError();
  if (ctx.role === "patient") {
    throw new ForbiddenError("Patients do not have access to RGB Neo");
  }
}

/** Guards organization-wide endpoints — only platform_admin may call them. */
export function requireOrgScope(
  request: FastifyRequest,
  _reply: FastifyReply
): void {
  const ctx = request.clinic;
  if (!ctx) throw new UnauthorizedError();
  if (ctx.role !== "platform_admin") {
    throw new ForbiddenError(
      "Organization-wide monitoring is restricted to organization administrators"
    );
  }
}
