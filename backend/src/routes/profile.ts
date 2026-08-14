import type { FastifyInstance } from "fastify";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/plugins/auth";
import { DB_COLLECTIONS } from "@/lib/constants";
import { handleError } from "@/lib/http";

const NAME_MAX = 100;
const PHONE_MAX = 30;
const SPECIALIZATION_MAX = 100;
const QUALIFICATIONS_MAX = 200;
const BIO_MAX = 1000;

export function mapUser(d: { _id: { toString(): string }; [k: string]: unknown }) {
  return {
    id: d._id.toString(),
    name: d.name ?? null,
    email: d.email ?? null,
    role: d.role ?? "doctor",
    image: d.image ?? null,
    phone: d.phone ?? null,
    specialization: d.specialization ?? null,
    qualifications: d.qualifications ?? null,
    bio: d.bio ?? null,
    createdAt: d.createdAt ?? null,
  };
}

export function registerProfileRoutes(app: FastifyInstance): void {
  app.get("/api/profile", async (request, reply) => {
    try {
      if (!(await requireAuth(request, reply))) return;
      if (!request.user?.id) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      const db = await getDb();
      const user = await db
        .collection(DB_COLLECTIONS.users)
        .findOne({ _id: new ObjectId(request.user.id) });

      if (!user) {
        return reply.code(404).send({ error: "Profile not found" });
      }

      return reply.send({ user: mapUser(user as never) });
    } catch (error) {
      handleError(reply, error, "Get profile");
    }
  });

  app.put("/api/profile", async (request, reply) => {
    try {
      if (!(await requireAuth(request, reply))) return;
      if (!request.user?.id) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      const body = (request.body ?? {}) as Record<string, unknown>;
      const name = typeof body?.name === "string" ? body.name.trim() : "";
      if (!name) {
        return reply.code(400).send({ error: "Name is required" });
      }
      if (name.length > NAME_MAX) {
        return reply.code(400).send({
          error: `Name must be under ${NAME_MAX} characters`,
        });
      }

      const phone =
        typeof body?.phone === "string" && body.phone.trim()
          ? body.phone.trim().slice(0, PHONE_MAX)
          : null;
      const specialization =
        typeof body?.specialization === "string" && body.specialization.trim()
          ? body.specialization.trim().slice(0, SPECIALIZATION_MAX)
          : null;
      const qualifications =
        typeof body?.qualifications === "string" && body.qualifications.trim()
          ? body.qualifications.trim().slice(0, QUALIFICATIONS_MAX)
          : null;
      const bio =
        typeof body?.bio === "string" && body.bio.trim()
          ? body.bio.trim().slice(0, BIO_MAX)
          : null;

      const db = await getDb();
      const result = await db.collection(DB_COLLECTIONS.users).updateOne(
        { _id: new ObjectId(request.user.id) },
        {
          $set: {
            name,
            phone,
            specialization,
            qualifications,
            bio,
            updatedAt: new Date(),
          },
        }
      );

      if (result.matchedCount === 0) {
        return reply.code(404).send({ error: "Profile not found" });
      }

      const updated = await db
        .collection(DB_COLLECTIONS.users)
        .findOne({ _id: new ObjectId(request.user.id) });

      return reply.send({ user: mapUser(updated as never) });
    } catch (error) {
      handleError(reply, error, "Update profile");
    }
  });
}