import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import {
  DEFAULT_LIMIT,
  parsePagination,
  paged,
  textSearch,
} from "@/lib/pagination";
import { cached, invalidateCache } from "@/lib/cache";
import { searchParams, handleError } from "@/lib/http";
import { requireAuth } from "@/plugins/auth";

const DOCTORS_CACHE_KEY = "doctors:list";
const DOCTORS_CACHE_TTL_MS = 15_000;

function mapDoctor(d: Record<string, unknown>) {
  return {
    id: (d._id as { toString(): string }).toString(),
    name: d.name,
    email: d.email,
    specialty: d.specialty ?? null,
    mobile: d.mobile ?? null,
    qualifications: d.qualifications ?? null,
    createdAt: d.createdAt,
  };
}

export function registerDoctorsRoutes(app: FastifyInstance): void {
  app.get("/api/doctors", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;

    try {
      const params = searchParams(request);
      const pagination = parsePagination(params);
      const db = await getDb();
      const collection = db.collection("users");

      const query: Record<string, unknown> = { role: "doctor" };
      const search = textSearch(params.get("q"), ["name", "email"]);
      if (search) query.$or = search.$or ?? search;

      if (pagination) {
        const [doctors, total] = await Promise.all([
          collection
            .find(query)
            .sort({ createdAt: -1 })
            .skip(pagination.skip)
            .limit(pagination.pageSize)
            .toArray(),
          collection.countDocuments(query),
        ]);
        return reply.send({
          doctors: paged(doctors.map(mapDoctor), total, pagination),
        });
      }

      // Small, frequently-read list — serve from the short TTL cache.
      const doctors = await cached(DOCTORS_CACHE_KEY, DOCTORS_CACHE_TTL_MS, () =>
        collection
          .find(query, { projection: { password: 0 } })
          .sort({ createdAt: -1 })
          .limit(DEFAULT_LIMIT)
          .toArray()
      );
      return reply.send({ doctors: doctors.map(mapDoctor) });
    } catch (error) {
      handleError(reply, error, "List doctors");
    }
  });

  app.post("/api/doctors", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;

    try {
      const body = (request.body ?? {}) as Record<string, unknown>;
      const { name, email, password, specialty, mobile, qualifications } = body;

      if (!name || !email || !password) {
        const missing: string[] = [];
        if (!name) missing.push("Name");
        if (!email) missing.push("Email");
        if (!password) missing.push("Password");
        const message =
          missing.length === 1
            ? `${missing[0]} is required`
            : `${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]} are required`;
        return reply.code(400).send({ error: message });
      }
      if (typeof password !== "string" || password.length < 6) {
        return reply.code(400).send({ error: "Password must be at least 6 characters" });
      }

      const db = await getDb();
      const users = db.collection("users");
      const existing = await users.findOne({ email: String(email).toLowerCase() });
      if (existing) {
        return reply.code(409).send({
          error: "An account with this email already exists",
        });
      }

      const hashedPassword = await bcrypt.hash(String(password), 10);
      const result = await users.insertOne({
        name,
        email: String(email).toLowerCase(),
        password: hashedPassword,
        specialty: specialty ?? null,
        mobile: mobile ?? null,
        qualifications: qualifications ?? null,
        role: "doctor",
        image: null,
        createdAt: new Date(),
      });

      invalidateCache("doctors:");
      invalidateCache("ai:context:");

      return reply.code(201).send({
        doctor: {
          id: result.insertedId.toString(),
          name,
          email: String(email).toLowerCase(),
          specialty: specialty ?? null,
          mobile: mobile ?? null,
          qualifications: qualifications ?? null,
        },
      });
    } catch (error) {
      handleError(reply, error, "Create doctor");
    }
  });

  app.put("/api/doctors/:id", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;

    try {
      const { id } = request.params as { id: string };
      if (!ObjectId.isValid(id)) {
        return reply.code(400).send({ error: "Invalid doctor id" });
      }

      const body = (request.body ?? {}) as Record<string, unknown>;
      const { name, specialty, mobile, qualifications } = body;

      if (!name) {
        return reply.code(400).send({ error: "Name is required" });
      }

      const db = await getDb();
      const result = await db.collection("users").updateOne(
        { _id: new ObjectId(id), role: "doctor" },
        {
          $set: {
            name,
            specialty: specialty ?? null,
            mobile: mobile ?? null,
            qualifications: qualifications ?? null,
            updatedAt: new Date(),
          },
        }
      );

      if (result.matchedCount === 0) {
        return reply.code(404).send({ error: "Doctor not found" });
      }

      invalidateCache("doctors:");
      invalidateCache("ai:context:");

      return reply.send({ doctor: { id } });
    } catch (error) {
      handleError(reply, error, "Update doctor");
    }
  });

  app.delete("/api/doctors/:id", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;

    try {
      const { id } = request.params as { id: string };
      if (!ObjectId.isValid(id)) {
        return reply.code(400).send({ error: "Invalid doctor id" });
      }

      const db = await getDb();
      const doctor = await db
        .collection("users")
        .findOneAndDelete({ _id: new ObjectId(id), role: "doctor" });

      if (!doctor) {
        return reply.code(404).send({ error: "Doctor not found" });
      }

      invalidateCache("doctors:");
      invalidateCache("ai:context:");

      return reply.send({ ok: true });
    } catch (error) {
      handleError(reply, error, "Delete doctor");
    }
  });
}