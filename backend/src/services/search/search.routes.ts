import type { FastifyInstance } from "fastify";
import { UnauthorizedError } from "@/clinic/core/errors";
import { requireClinicAccess } from "@/clinic/core/scope";
import { search } from "./search.service";
import { ENTITY_TYPES, type EntityType } from "./registry";

/**
 * Unified search across clinic entities.
 *
 *   GET /api/clinics/:clinicId/search?q=<term>&types=patient,doctor
 *
 * Guarded by the clinic-scope middleware (requireClinicAccess), so the URL
 * clinicId is verified against the caller's session and only that clinic's
 * documents are ever searched. Results are grouped per entity and capped
 * (`limitPerType`, default 5). `enabled` reports whether OpenSearch served
 * the request or the Mongo fallback did.
 */
export function registerSearchRoutes(app: FastifyInstance): void {
  app.get(
    "/api/clinics/:clinicId/search",
    { preHandler: requireClinicAccess },
    async (request, reply) => {
      const ctx = request.clinic;
      if (!ctx) throw new UnauthorizedError();
      if (!ctx.clinicId) throw new UnauthorizedError();
      const clinicId = ctx.clinicId;
      const query = request.query as Record<string, unknown>;
      const q = String(query.q ?? "").trim();
      const typesParam = query.types ? String(query.types) : "";
      const types = typesParam
        ? (typesParam
            .split(",")
            .map((t) => t.trim())
            .filter((t): t is EntityType =>
              (ENTITY_TYPES as string[]).includes(t)
            ) as EntityType[])
        : undefined;

      const limitPerType = query.limitPerType
        ? Math.min(Number(query.limitPerType ?? 5) || 5, 25)
        : 5;

      const result = await search(clinicId, q, { types, limitPerType });
      return reply.send(result);
    }
  );
}
