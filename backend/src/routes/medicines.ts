import type { FastifyInstance } from "fastify";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { DB_COLLECTIONS } from "@/lib/constants";
import {
  DEFAULT_LIMIT,
  parsePagination,
  paged,
  textSearch,
} from "@/lib/pagination";
import { cached, invalidateCache } from "@/lib/cache";
import { searchParams, handleError } from "@/lib/http";
import { requireAuth } from "@/plugins/auth";

const MEDICINES_CACHE_KEY = "medicines:list";
const MEDICINES_CACHE_TTL_MS = 15_000;

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function mapMedicine(m: Record<string, unknown>) {
  return {
    id: (m._id as { toString(): string }).toString(),
    name: m.name,
    category: m.category ?? null,
    notes: m.notes ?? null,
    createdAt: m.createdAt,
  };
}

export function registerMedicinesRoutes(app: FastifyInstance): void {
  app.get("/api/medicines", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;

    try {
      const params = searchParams(request);
      const pagination = parsePagination(params);
      const db = await getDb();
      const collection = db.collection(DB_COLLECTIONS.medicines);

      const query: Record<string, unknown> = {};
      const search = textSearch(params.get("q"), ["name"]);
      if (search) Object.assign(query, search);

      if (pagination) {
        const [medicines, total] = await Promise.all([
          collection
            .find(query)
            .sort({ name: 1 })
            .skip(pagination.skip)
            .limit(pagination.pageSize)
            .toArray(),
          collection.countDocuments(query),
        ]);
        return reply.send({
          medicines: paged(medicines.map(mapMedicine), total, pagination),
        });
      }

      const medicines = await cached(MEDICINES_CACHE_KEY, MEDICINES_CACHE_TTL_MS, () =>
        collection
          .find(query)
          .sort({ name: 1 })
          .limit(DEFAULT_LIMIT)
          .toArray()
      );
      return reply.send({ medicines: medicines.map(mapMedicine) });
    } catch (error) {
      handleError(reply, error, "List medicines");
    }
  });

  app.post("/api/medicines", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;

    try {
      const body = (request.body ?? {}) as Record<string, unknown>;
      const { name, category, notes } = body;

      if (!name || !String(name).trim()) {
        return reply.code(400).send({ error: "Medicine name is required" });
      }

      const db = await getDb();
      const medicines = db.collection(DB_COLLECTIONS.medicines);

      const existing = await medicines.findOne({
        name: {
          $regex: `^${escapeRegex(String(name).trim())}$`,
          $options: "i",
        },
      });
      if (existing) {
        return reply
          .code(409)
          .send({ error: "This medicine is already in the list" });
      }

      const result = await medicines.insertOne({
        name: String(name).trim(),
        category: category ? String(category).trim() : null,
        notes: notes ? String(notes).trim() : null,
        createdAt: new Date(),
      });

      invalidateCache(MEDICINES_CACHE_KEY);

      return reply.code(201).send({
        medicine: {
          id: result.insertedId.toString(),
          name: String(name).trim(),
          category: category ? String(category).trim() : null,
          notes: notes ? String(notes).trim() : null,
        },
      });
    } catch (error) {
      handleError(reply, error, "Create medicine");
    }
  });

  app.put("/api/medicines/:id", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;

    try {
      const { id } = request.params as { id: string };
      if (!ObjectId.isValid(id)) {
        return reply.code(400).send({ error: "Invalid medicine id" });
      }

      const body = (request.body ?? {}) as Record<string, unknown>;
      const { name, category, notes } = body;

      if (!name || !String(name).trim()) {
        return reply.code(400).send({ error: "Medicine name is required" });
      }

      const db = await getDb();
      const medicines = db.collection(DB_COLLECTIONS.medicines);

      const existing = await medicines.findOne({
        _id: { $ne: new ObjectId(id) },
        name: {
          $regex: `^${escapeRegex(String(name).trim())}$`,
          $options: "i",
        },
      });
      if (existing) {
        return reply
          .code(409)
          .send({ error: "This medicine is already in the list" });
      }

      const result = await medicines.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            name: String(name).trim(),
            category: category ? String(category).trim() : null,
            notes: notes ? String(notes).trim() : null,
            updatedAt: new Date(),
          },
        }
      );

      if (result.matchedCount === 0) {
        return reply.code(404).send({ error: "Medicine not found" });
      }

      invalidateCache(MEDICINES_CACHE_KEY);

      return reply.send({ medicine: { id } });
    } catch (error) {
      handleError(reply, error, "Update medicine");
    }
  });

  app.delete("/api/medicines/:id", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;

    try {
      const { id } = request.params as { id: string };
      if (!ObjectId.isValid(id)) {
        return reply.code(400).send({ error: "Invalid medicine id" });
      }

      const db = await getDb();
      const medicine = await db
        .collection(DB_COLLECTIONS.medicines)
        .findOneAndDelete({ _id: new ObjectId(id) });

      if (!medicine) {
        return reply.code(404).send({ error: "Medicine not found" });
      }

      invalidateCache(MEDICINES_CACHE_KEY);

      return reply.send({ ok: true });
    } catch (error) {
      handleError(reply, error, "Delete medicine");
    }
  });
}