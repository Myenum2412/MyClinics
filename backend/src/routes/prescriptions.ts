import type { FastifyInstance } from "fastify";
import { ObjectId } from "mongodb";
import type { Document } from "mongodb";
import { getDb } from "@/lib/db";
import { hasAuth } from "@/plugins/auth";
import {
  DEFAULT_LIMIT,
  parsePagination,
  paged,
  textSearch,
} from "@/lib/pagination";
import { searchParams, handleError } from "@/lib/http";
import { requireAuth } from "@/plugins/auth";

export function mapDoc(d: Document) {
  return {
    id: d._id.toString(),
    patientName: d.patientName,
    age: d.age ?? null,
    gender: d.gender ?? null,
    phone: d.phone ?? null,
    visitDate: d.visitDate,
    diagnosis: d.diagnosis,
    medicines: Array.isArray(d.medicines) ? d.medicines : [],
    symptoms: d.symptoms ?? null,
    testsRecommended: d.testsRecommended ?? null,
    followUpDate: d.followUpDate ?? null,
    doctorName: d.doctorName ?? null,
    createdAt: d.createdAt,
  };
}

export function registerPrescriptionsRoutes(app: FastifyInstance): void {
  app.get("/api/prescriptions", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;

    try {
      const params = searchParams(request);
      const pagination = parsePagination(params);
      const db = await getDb();
      const collection = db.collection("prescriptions");

      const query: Record<string, unknown> = {};
      const search = textSearch(params.get("q"), [
        "patientName",
        "diagnosis",
        "doctorName",
      ]);
      if (search) query.$or = search.$or ?? search;

      if (pagination) {
        const [prescriptions, total] = await Promise.all([
          collection
            .find(query)
            .sort({ createdAt: -1 })
            .skip(pagination.skip)
            .limit(pagination.pageSize)
            .toArray(),
          collection.countDocuments(query),
        ]);
        return reply.send({
          prescriptions: paged(prescriptions.map(mapDoc), total, pagination),
        });
      }

      const prescriptions = await collection
        .find(query)
        .sort({ createdAt: -1 })
        .limit(DEFAULT_LIMIT)
        .toArray();
      return reply.send({ prescriptions: prescriptions.map(mapDoc) });
    } catch (error) {
      handleError(reply, error, "List prescriptions");
    }
  });

  app.post("/api/prescriptions", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;

    try {
      await hasAuth(request);
      const body = (request.body ?? {}) as Record<string, unknown>;
      const {
        patientName,
        age,
        gender,
        phone,
        visitDate,
        diagnosis,
        medicines,
        symptoms,
        testsRecommended,
        followUpDate,
      } = body;

      if (!patientName || !diagnosis) {
        return reply.code(400).send({
          error: "Patient name and diagnosis are required",
        });
      }

      const db = await getDb();
      const result = await db.collection("prescriptions").insertOne({
        patientName,
        age: age ?? null,
        gender: gender ?? null,
        phone: phone ?? null,
        visitDate: visitDate ?? null,
        diagnosis,
        medicines: Array.isArray(medicines) ? medicines : [],
        symptoms: symptoms ?? null,
        testsRecommended: testsRecommended ?? null,
        followUpDate: followUpDate ?? null,
        doctorName: request.user?.name ?? "Doctor",
        createdAt: new Date(),
      });

      return reply.code(201).send({
        prescription: { id: result.insertedId.toString(), patientName },
      });
    } catch (error) {
      handleError(reply, error, "Create prescription");
    }
  });

  app.put("/api/prescriptions/:id", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;

    try {
      const { id } = request.params as { id: string };
      if (!ObjectId.isValid(id)) {
        return reply.code(400).send({ error: "Invalid prescription id" });
      }

      const body = (request.body ?? {}) as Record<string, unknown>;
      const {
        patientName,
        age,
        gender,
        phone,
        visitDate,
        diagnosis,
        medicines,
        symptoms,
        testsRecommended,
        followUpDate,
      } = body;

      if (!patientName || !diagnosis) {
        return reply.code(400).send({
          error: "Patient name and diagnosis are required",
        });
      }

      const db = await getDb();
      const result = await db.collection("prescriptions").updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            patientName,
            age: age ?? null,
            gender: gender ?? null,
            phone: phone ?? null,
            visitDate: visitDate ?? null,
            diagnosis,
            medicines: Array.isArray(medicines) ? medicines : [],
            symptoms: symptoms ?? null,
            testsRecommended: testsRecommended ?? null,
            followUpDate: followUpDate ?? null,
            updatedAt: new Date(),
          },
        }
      );

      if (result.matchedCount === 0) {
        return reply.code(404).send({ error: "Prescription not found" });
      }

      return reply.send({ ok: true });
    } catch (error) {
      handleError(reply, error, "Update prescription");
    }
  });

  app.delete("/api/prescriptions/:id", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;

    try {
      const { id } = request.params as { id: string };
      if (!ObjectId.isValid(id)) {
        return reply.code(400).send({ error: "Invalid prescription id" });
      }

      const db = await getDb();
      const result = await db.collection("prescriptions").deleteOne({
        _id: new ObjectId(id),
      });

      if (result.deletedCount === 0) {
        return reply.code(404).send({ error: "Prescription not found" });
      }

      return reply.send({ ok: true });
    } catch (error) {
      handleError(reply, error, "Delete prescription");
    }
  });
}