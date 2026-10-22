import type { FastifyInstance } from "fastify";
import { getDb } from "@/lib/db-pools";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import { sanitizeWebsitePageData } from "@/clinic/modules/clinics/website-sanitizer";

interface PublicWebsiteDoc {
  clinicId: string;
  slug: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  description: string | null;
  websitePage?: {
    data: unknown;
    publishedAt: string | null;
    updatedAt: Date;
  } | null;
}

/**
 * Public clinic website — no auth required.
 *
 *   GET /api/public/clinics/:identity/website
 *
 * `identity` may be the clinicId or slug. Only active clinics with a
 * published website page are returned; everything else 404s.
 */
export function registerPublicClinicWebsiteRoutes(app: FastifyInstance): void {
  app.get("/api/public/clinics/:identity/website", async (request, reply) => {
    const { identity } = request.params as { identity: string };
    if (!identity?.trim()) {
      return reply.code(400).send({ error: "Clinic is required" });
    }

    try {
      const db = await getDb();
      const clinic = await db
        .collection<PublicWebsiteDoc>(CLINIC_COLLECTIONS.clinics)
        .findOne(
          {
            $or: [{ clinicId: identity }, { slug: identity }],
            status: "active",
          },
          {
            projection: {
              clinicId: 1,
              slug: 1,
              name: 1,
              phone: 1,
              email: 1,
              address: 1,
              description: 1,
              websitePage: 1,
            },
          }
        );

      if (!clinic?.websitePage?.data) {
        return reply.code(404).send({ error: "Website not found" });
      }

      const sanitized = sanitizeWebsitePageData(clinic.websitePage.data);
      const publicData =
        sanitized && typeof sanitized === "object" && typeof (sanitized as { html?: unknown }).html === "string"
          ? {
              html: (sanitized as { html: string }).html,
              css: (sanitized as { css?: unknown }).css ?? "",
            }
          : sanitized;

      return reply.send({
        clinic: {
          clinicId: clinic.clinicId,
          slug: clinic.slug,
          name: clinic.name,
          phone: clinic.phone ?? null,
          email: clinic.email ?? null,
          address: clinic.address ?? null,
          description: clinic.description ?? null,
        },
        websitePage: { ...clinic.websitePage, data: publicData },
      });
    } catch {
      return reply.code(500).send({ error: "Failed to load website" });
    }
  });
}
