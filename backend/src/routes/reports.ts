import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import type { Document } from "mongodb";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { uploadToR2 } from "@/lib/r2";
import { hasAuth } from "@/plugins/auth";
import { enqueueClinicNotification } from "@/services/whatsapp/notification.service";
import {
  DEFAULT_LIMIT,
  parsePagination,
  paged,
  textSearch,
} from "@/lib/pagination";
import { searchParams, handleError } from "@/lib/http";
import { requireAuth } from "@/plugins/auth";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export type ReportFileDoc = {
  id: string;
  name: string;
  key: string;
  size: number;
  type: string;
  extension: string;
  folderId: string | null;
  category: string | null;
  patientId: string | null;
  patientName: string | null;
  prescriptionId: string | null;
  prescriptionLabel: string | null;
  uploadedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export function mapFile(d: Document): ReportFileDoc {
  return {
    id: (d._id as ObjectId).toString(),
    name: String(d.name ?? ""),
    key: String(d.key ?? ""),
    size: Number(d.size ?? 0),
    type: String(d.type ?? ""),
    extension: String(d.extension ?? ""),
    folderId: d.folderId ? String(d.folderId) : null,
    category: d.category ? String(d.category) : null,
    patientId: d.patientId ? String(d.patientId) : null,
    patientName: d.patientName ? String(d.patientName) : null,
    prescriptionId: d.prescriptionId ? String(d.prescriptionId) : null,
    prescriptionLabel: d.prescriptionLabel ? String(d.prescriptionLabel) : null,
    uploadedBy: d.uploadedBy ? String(d.uploadedBy) : null,
    createdAt: (d.createdAt as Date).toISOString(),
    updatedAt: ((d.updatedAt as Date) ?? (d.createdAt as Date)).toISOString(),
  };
}

export function registerReportsRoutes(app: FastifyInstance): void {
  app.get("/api/reports", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;

    try {
      const params = searchParams(request);
      const pagination = parsePagination(params);
      const folderId = params.get("folder") || null;
      const patientId = params.get("patient") || null;
      const q = params.get("q") || null;

      const db = await getDb();
      const collection = db.collection("reports");

      const query: Record<string, unknown> = {};
      if (folderId) query.folderId = folderId;
      if (patientId) {
        const asObjectId = ObjectId.isValid(patientId)
          ? new ObjectId(patientId)
          : null;
        query.patientId = asObjectId
          ? { $in: [patientId, asObjectId] }
          : patientId;
      }
      const search = textSearch(q, ["name", "patientName"]);
      if (search) query.$or = search.$or ?? search;

      const projection = { key: 0 };

      if (pagination) {
        const [docs, total] = await Promise.all([
          collection
            .find(query, { projection })
            .sort({ createdAt: -1 })
            .skip(pagination.skip)
            .limit(pagination.pageSize)
            .toArray(),
          collection.countDocuments(query),
        ]);
        return reply.send({ files: paged(docs.map(mapFile), total, pagination) });
      }

      const docs = await collection
        .find(query, { projection })
        .sort({ createdAt: -1 })
        .limit(DEFAULT_LIMIT)
        .toArray();
      return reply.send({ files: docs.map(mapFile) });
    } catch (error) {
      handleError(reply, error, "List reports");
    }
  });

  app.post("/api/reports", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;

    try {
      await hasAuth(request);
      const data = await request.file();
      if (!data) {
        return reply.code(400).send({ error: "No file uploaded" });
      }

      const file = data.file;
      const name = data.filename || "upload";
      const type = data.mimetype || "application/octet-stream";

      let bytes: Buffer;
      try {
        bytes = await data.toBuffer();
      } catch (err) {
        if (err instanceof Error && /file size limit/i.test(err.message)) {
          return reply.code(400).send({
            error: "File is too large. Maximum size is 50 MB.",
          });
        }
        throw err;
      }
      if (bytes.byteLength > MAX_FILE_SIZE) {
        return reply.code(400).send({
          error: "File is too large. Maximum size is 50 MB.",
        });
      }

      const fields = data.fields;
      const fieldValue = (key: string): string | null => {
        const raw = fields[key];
        const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
        for (const part of values) {
          if (part.type === "field") return String(part.value);
        }
        return null;
      };

      const folderId = fieldValue("folderId") || null;
      const category = fieldValue("category") || null;
      const patientId = fieldValue("patientId") || null;
      const patientIdStored =
        patientId && ObjectId.isValid(patientId)
          ? new ObjectId(patientId)
          : patientId;
      const patientName = fieldValue("patientName") || null;
      const prescriptionId = fieldValue("prescriptionId") || null;
      const prescriptionLabel = fieldValue("prescriptionLabel") || null;

      const ext = name.includes(".")
        ? name.split(".").pop()?.toLowerCase() ?? ""
        : "";

      const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const key = `reports/${randomUUID()}-${safeName}`;

      await uploadToR2(key, bytes, type);

      const db = await getDb();
      const result = await db.collection("reports").insertOne({
        name,
        key,
        size: bytes.byteLength,
        type,
        extension: ext,
        folderId,
        category,
        patientId: patientIdStored,
        patientName,
        prescriptionId,
        prescriptionLabel,
        uploadedBy: request.user?.name ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const doc = await db.collection("reports").findOne({
        _id: result.insertedId,
      });

      let patientPhone: string | null = null;
      if (patientId) {
        const patient = await db
          .collection("patients")
          .findOne({ _id: new ObjectId(patientId) });
        if (patient) patientPhone = patient.whatsapp ?? patient.mobile ?? null;
      }
      if (patientPhone) {
        await enqueueClinicNotification(
          db,
          String(patientPhone),
          `Hi ${patientName ?? "there"}, your report "${name}" has been uploaded. ` +
            `You can view and download it from your patient portal.`,
          "report"
        );
      }

      return reply
        .code(201)
        .send({ file: doc ? mapFile(doc) : null });
    } catch (error) {
      handleError(reply, error, "Upload report");
    }
  });
}