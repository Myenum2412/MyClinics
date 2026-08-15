import type { FastifyInstance } from "fastify";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { DB_COLLECTIONS } from "@/lib/constants";
import { handleError } from "@/lib/http";
import { requireAuth, requireBilling } from "@/plugins/auth";

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export type Service = {
  id: string;
  name: string;
  category: string | null;
  price: number;
  isActive: boolean;
  createdAt: Date;
};

function mapService(d: Record<string, unknown>): Service {
  return {
    id: (d._id as { toString(): string }).toString(),
    name: String(d.name ?? ""),
    category: d.category ? String(d.category) : null,
    price: Number(d.price) || 0,
    isActive: d.isActive !== false,
    createdAt: d.createdAt as Date,
  };
}

function cleanBody(body: Record<string, unknown>) {
  const name = body.name ? String(body.name).trim() : "";
  const category = body.category ? String(body.category).trim() : "";
  const price = Math.max(0, Number(body.price) || 0);
  const isActive = body.isActive === undefined ? true : Boolean(body.isActive);
  return { name, category: category || null, price, isActive };
}

export function registerServicesRoutes(app: FastifyInstance): void {
  app.get("/api/services", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;
    try {
      const db = await getDb();
      const services = await db
        .collection(DB_COLLECTIONS.services)
        .find({})
        .sort({ name: 1 })
        .toArray();
      return reply.send({ services: services.map((s) => mapService(s as unknown as Record<string, unknown>)) });
    } catch (error) {
      handleError(reply, error, "List services");
    }
  });

  app.post("/api/services", async (request, reply) => {
    if (!(await requireBilling(request, reply))) return;
    try {
      const body = (request.body ?? {}) as Record<string, unknown>;
      const { name, category, price, isActive } = cleanBody(body);

      if (!name) {
        return reply.code(400).send({ error: "Service name is required" });
      }

      const db = await getDb();
      const collection = db.collection(DB_COLLECTIONS.services);

      const existing = await collection.findOne({
        name: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
      });
      if (existing) {
        return reply
          .code(409)
          .send({ error: "This service is already in the list" });
      }

      const result = await collection.insertOne({
        name,
        category,
        price,
        isActive,
        createdAt: new Date(),
      });

      return reply.code(201).send({
        service: {
          id: result.insertedId.toString(),
          name,
          category,
          price,
          isActive,
          createdAt: new Date(),
        },
      });
    } catch (error) {
      handleError(reply, error, "Create service");
    }
  });

  app.put("/api/services/:id", async (request, reply) => {
    if (!(await requireBilling(request, reply))) return;
    try {
      const { id } = request.params as { id: string };
      if (!ObjectId.isValid(id)) {
        return reply.code(400).send({ error: "Invalid service id" });
      }

      const body = (request.body ?? {}) as Record<string, unknown>;
      const { name, category, price, isActive } = cleanBody(body);

      if (!name) {
        return reply.code(400).send({ error: "Service name is required" });
      }

      const db = await getDb();
      const collection = db.collection(DB_COLLECTIONS.services);

      const existing = await collection.findOne({
        _id: { $ne: new ObjectId(id) },
        name: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
      });
      if (existing) {
        return reply
          .code(409)
          .send({ error: "This service is already in the list" });
      }

      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        {
          $set: {
            name,
            category,
            price,
            isActive,
            updatedAt: new Date(),
          },
        },
        { returnDocument: "after" }
      );

      if (!result) {
        return reply.code(404).send({ error: "Service not found" });
      }

      return reply.send({
        service: mapService(result as unknown as Record<string, unknown>),
      });
    } catch (error) {
      handleError(reply, error, "Update service");
    }
  });

  app.delete("/api/services/:id", async (request, reply) => {
    if (!(await requireBilling(request, reply))) return;
    try {
      const { id } = request.params as { id: string };
      if (!ObjectId.isValid(id)) {
        return reply.code(400).send({ error: "Invalid service id" });
      }

      const db = await getDb();
      const result = await db
        .collection(DB_COLLECTIONS.services)
        .deleteOne({ _id: new ObjectId(id) });

      if (!result.deletedCount) {
        return reply.code(404).send({ error: "Service not found" });
      }

      return reply.send({ ok: true });
    } catch (error) {
      handleError(reply, error, "Delete service");
    }
  });
}
