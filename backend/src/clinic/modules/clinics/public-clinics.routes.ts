import type { FastifyInstance } from "fastify";
import { getDb } from "@/lib/db-pools";
import { ClinicRepository } from "@/clinic/modules/clinics/clinics.repository";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";

/**
 * Public clinic profiles — unauthenticated, read-only.
 *
 *   GET /api/public/clinics                    list active clinics (q, city, city, pincode, limit)
 *   GET /api/public/clinics/:identifier        one clinic by clinicId or slug (only active)
 *   GET /api/public/clinics/:clinicId/avatar   clinic logo bytes (no auth)
 *
 * Responses are sanitized to only the fields safe for public SEO/directory.
 */

function toPublicClinic(doc: any) {
  if (!doc) return null;
  return {
    clinicId: doc.clinicId,
    slug: doc.slug,
    name: doc.name,
    phone: doc.phone ?? null,
    email: doc.email ?? null,
    address: doc.address ?? null,
    website: doc.website ?? null,
    description: doc.description ?? null,
    status: doc.status,
    settings: {
      workingHours: doc.settings?.workingHours ?? { open: "09:00", close: "18:00" },
      weeklySchedule: doc.settings?.weeklySchedule ?? null,
      timezone: doc.settings?.timezone ?? "Asia/Kolkata",
    },
    profile: doc.profile
      ? {
          clinicType: doc.profile.clinicType ?? null,
          registrationNumber: doc.profile.registrationNumber ?? null,
          establishedYear: doc.profile.establishedYear ?? null,
          whatsapp: doc.profile.whatsapp ?? null,
          addressLine1: doc.profile.addressLine1 ?? null,
          addressLine2: doc.profile.addressLine2 ?? null,
          city: doc.profile.city ?? null,
          state: doc.profile.state ?? null,
          country: doc.profile.country ?? null,
          pincode: doc.profile.pincode ?? null,
          specializations: doc.profile.specializations ?? [],
          services: doc.profile.services ?? [],
          emergencyContact: doc.profile.emergencyContact ?? null,
          socialMedia: doc.profile.socialMedia ?? { facebook: null, instagram: null, twitter: null, linkedin: null },
          // GST / tax deliberately omitted from public DTO
        }
      : null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function registerPublicClinicRoutes(app: FastifyInstance): void {
  // List active clinics — for public directory / sitemap
  app.get("/api/public/clinics", async (request, reply) => {
    const qs = request.query as { q?: string; city?: string; state?: string; pincode?: string; limit?: string; skip?: string };
    const limit = Math.min(Math.max(parseInt(qs.limit ?? "50", 10) || 50, 1), 100);
    const skip = Math.max(parseInt(qs.skip ?? "0", 10) || 0, 0);
    const db = await getDb();
    const col = db.collection(CLINIC_COLLECTIONS.clinics);

    const filter: Record<string, unknown> = { status: "active" };
    if (qs.q) {
      const q = String(qs.q).trim();
      if (q) {
        (filter as any).$and = [
          { status: "active" },
          {
            $or: [
              { name: { $regex: q, $options: "i" } },
              { slug: { $regex: q, $options: "i" } },
              { "profile.city": { $regex: q, $options: "i" } },
              { "profile.specializations": { $regex: q, $options: "i" } },
            ],
          },
        ];
        delete (filter as any).status;
      }
    }
    if (qs.city) filter["profile.city"] = { $regex: `^${String(qs.city).trim()}$`, $options: "i" };
    if (qs.state) filter["profile.state"] = { $regex: `^${String(qs.state).trim()}$`, $options: "i" };
    if (qs.pincode) filter["profile.pincode"] = String(qs.pincode).trim();

    const [items, total] = await Promise.all([
      col.find(filter as never).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      col.countDocuments(filter as never),
    ]);

    return reply.send({ items: items.map(toPublicClinic), total });
  });

  // Single clinic by clinicId or slug
  app.get("/api/public/clinics/:identifier", async (request, reply) => {
    const { identifier } = request.params as { identifier: string };
    if (!identifier) return reply.code(400).send({ error: "identifier required" });
    const db = await getDb();
    const repo = new ClinicRepository(db);
    const doc = await repo.findByIdentity(identifier);
    if (!doc || doc.status !== "active") {
      return reply.code(404).send({ error: "Clinic not found" });
    }
    return reply.send(toPublicClinic(doc));
  });

  // Public clinic avatar (logo) — no auth, cacheable
  app.get("/api/public/clinics/:clinicId/avatar", async (request, reply) => {
    const { clinicId } = request.params as { clinicId: string };
    const db = await getDb();
    const doc = await db.collection(CLINIC_COLLECTIONS.avatars).findOne(
      { clinicId, ownerType: "clinic", ownerId: clinicId },
      { projection: { data: 1, contentType: 1 } }
    );
    if (!doc) return reply.code(404).send({ error: "Avatar not found" });
    const binary = (doc as any).data;
    const buf: Buffer = binary?.buffer ? Buffer.from(binary.buffer) : Buffer.from(binary);
    return reply.header("Content-Type", (doc as any).contentType ?? "image/jpeg").header("Cache-Control", "public, max-age=86400").send(buf);
  });
}
