import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { getDb } from "@/lib/db-pools";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import { systemContext } from "@/clinic/core/ids";
import { enforceLimitAsync, PUBLIC_LEAD_LIMITER } from "@/clinic/core/rate-limiter";
import { sanitizeWebsitePageData } from "@/clinic/modules/clinics/website-sanitizer";
import { LeadService } from "@/clinic/modules/leads/leads.service";
import { findPublicWebsiteMedia } from "@/clinic/modules/website-media/website-media.repository";

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

interface ActiveClinic {
  clinicId: string;
  slug: string;
}

const websiteLeadSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(120),
  phone: z.string().trim().max(30).optional().default(""),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address")
    .max(160)
    .optional()
    .or(z.literal(""))
    .default(""),
  message: z.string().trim().max(2000).optional().default(""),
  service: z.string().trim().max(120).optional().default(""),
  consent: z.boolean().optional().default(false),
  /** Hidden honeypot field — real visitors never fill this. */
  website: z.string().max(200).optional().default(""),
  elapsedMs: z.number().finite().nonnegative().optional().default(0),
});

async function findActiveClinic(identity: string): Promise<ActiveClinic | null> {
  const db = await getDb();
  return db.collection<PublicWebsiteDoc>(CLINIC_COLLECTIONS.clinics).findOne(
    {
      $or: [{ clinicId: identity }, { slug: identity }],
      status: "active",
    },
    { projection: { clinicId: 1, slug: 1 } }
  );
}

function publicMediaNotFound(reply: FastifyReply) {
  return reply.code(404).send({ error: "Image not found" });
}

/**
 * Public clinic website — no auth required.
 *
 *   GET  /api/public/clinics/:identity/website
 *   GET  /api/public/clinics/:identity/website/media/:mediaId
 *   POST /api/public/clinics/:identity/website/lead
 *
 * `identity` may be the clinicId or slug. Only active clinics are served;
 * everything else 404s. Media URLs are immutable and cached aggressively.
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

  /** Serve an uploaded website image publicly. */
  app.get(
    "/api/public/clinics/:identity/website/media/:mediaId",
    async (request, reply) => {
      const { identity, mediaId } = request.params as {
        identity: string;
        mediaId: string;
      };
      if (!identity?.trim() || !mediaId?.trim()) return publicMediaNotFound(reply);

      try {
        const clinic = await findActiveClinic(identity);
        if (!clinic) return publicMediaNotFound(reply);

        const media = await findPublicWebsiteMedia(clinic.clinicId, mediaId);
        if (!media) return publicMediaNotFound(reply);

        return reply
          .header("Content-Type", media.contentType)
          .header("Content-Length", media.size)
          .header("Cache-Control", "public, max-age=31536000, immutable")
          .header("X-Content-Type-Options", "nosniff")
          .send(media.data.buffer as Buffer);
      } catch {
        return reply.code(500).send({ error: "Failed to load image" });
      }
    }
  );

  /** Store a website contact-form submission as a clinic lead. */
  app.post(
    "/api/public/clinics/:identity/website/lead",
    async (request, reply) => {
      const { identity } = request.params as { identity: string };
      if (!identity?.trim()) return reply.code(400).send({ error: "Clinic is required" });

      const parsed = websiteLeadSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: parsed.error.issues[0]?.message ?? "Please check the form and try again",
        });
      }

      const input = parsed.data;
      // Honeypot + timing check: pretend success so bots do not retry.
      if (input.website || (input.elapsedMs > 0 && input.elapsedMs < 900)) {
        return reply.send({ ok: true });
      }
      if (!input.phone && !input.email) {
        return reply.code(400).send({ error: "Add a phone number or email so we can reply" });
      }

      try {
        const clinic = await findActiveClinic(identity);
        if (!clinic) return reply.code(404).send({ error: "Clinic not found" });

        await enforceLimitAsync(
          PUBLIC_LEAD_LIMITER,
          `website-lead:${clinic.clinicId}:${request.ip}`
        );

        const ctx = systemContext(clinic.clinicId);
        if (!ctx) return reply.code(500).send({ error: "Could not save your message" });

        await new LeadService(await getDb()).createLead(ctx, {
          name: input.name,
          phone: input.phone || null,
          email: input.email || null,
          source: "other",
          sourceRef: "website",
          service: input.service || null,
          formAnswers: {
            message: input.message,
            service: input.service,
            page: "website",
          },
          consent: { given: input.consent, source: "website_contact_form" },
        });

        return reply.code(201).send({ ok: true });
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "statusCode" in error &&
          (error as { statusCode?: number }).statusCode === 429
        ) {
          throw error;
        }
        return reply.code(500).send({ error: "Could not send your message" });
      }
    }
  );
}
