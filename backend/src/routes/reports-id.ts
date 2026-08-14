import type { FastifyInstance } from "fastify";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { deleteFromR2 } from "@/lib/r2";
import { handleError } from "@/lib/http";
import { requireAuth } from "@/plugins/auth";

export function registerReportRoutes(app: FastifyInstance): void {
  app.put("/api/reports/:id", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;

    try {
      const { id } = request.params as { id: string };
      if (!ObjectId.isValid(id)) {
        return reply.code(400).send({ error: "Invalid report id" });
      }

      const body = (request.body ?? {}) as Record<string, unknown>;
      const db = await getDb();
      const collection = db.collection("reports");

      const existing = await collection.findOne({ _id: new ObjectId(id) });
      if (!existing) {
        return reply.code(404).send({ error: "Report not found" });
      }

      const update: Record<string, unknown> = { updatedAt: new Date() };

      if (typeof body.name === "string" && body.name.trim()) {
        update.name = body.name.trim();
      }
      if (typeof body.folderId === "string") {
        update.folderId = body.folderId || null;
      }
      if (typeof body.category === "string") {
        update.category = body.category || null;
      }
      if (typeof body.patientId === "string" || body.patientId === null) {
        update.patientId =
          body.patientId && ObjectId.isValid(body.patientId)
            ? new ObjectId(body.patientId)
            : body.patientId;
        update.patientName =
          typeof body.patientName === "string" ? body.patientName : null;
      }
      if (typeof body.prescriptionId === "string" || body.prescriptionId === null) {
        update.prescriptionId = body.prescriptionId;
        update.prescriptionLabel =
          typeof body.prescriptionLabel === "string" ? body.prescriptionLabel : null;
      }

      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: update },
        { returnDocument: "after" }
      );

      const d = result as unknown as Record<string, unknown>;
      return reply.send({
        file: {
          id: (d._id as ObjectId).toString(),
          name: d.name,
          key: d.key,
          size: d.size,
          type: d.type,
          extension: d.extension ?? "",
          folderId: d.folderId ?? null,
          category: d.category ?? null,
          patientId: d.patientId ?? null,
          patientName: d.patientName ?? null,
          prescriptionId: d.prescriptionId ?? null,
          prescriptionLabel: d.prescriptionLabel ?? null,
          uploadedBy: d.uploadedBy ?? null,
          createdAt: (d.createdAt as Date).toISOString(),
          updatedAt: ((d.updatedAt as Date) ?? (d.createdAt as Date)).toISOString(),
        },
      });
    } catch (error) {
      handleError(reply, error, "Update report");
    }
  });

  app.delete("/api/reports/:id", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;

    try {
      const { id } = request.params as { id: string };
      if (!ObjectId.isValid(id)) {
        return reply.code(400).send({ error: "Invalid report id" });
      }

      const db = await getDb();
      const collection = db.collection("reports");

      const doc = await collection.findOne({ _id: new ObjectId(id) });
      if (!doc) {
        return reply.code(404).send({ error: "Report not found" });
      }

      if (doc.key) {
        try {
          await deleteFromR2(doc.key);
        } catch (error) {
          console.error("Delete R2 object error", error);
        }
      }
      await collection.deleteOne({ _id: new ObjectId(id) });

      return reply.send({ ok: true });
    } catch (error) {
      handleError(reply, error, "Delete report");
    }
  });
}