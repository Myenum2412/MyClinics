import type { FastifyReply, FastifyRequest } from "fastify";
import type { Db } from "mongodb";
import { getDb } from "@/lib/db";
import { BadRequestError, UnauthorizedError } from "@/clinic/core/errors";
import { ClinicWelcomeDocumentService } from "@/clinic/modules/clinics/clinic-welcome-documents.service";
import { clinicWelcomeDocumentToPublic } from "@/clinic/modules/clinics/clinic-welcome-documents.schema";

const MAX_FILE_BYTES = 50 * 1024 * 1024;

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

const ALLOWED_MIME_PREFIXES = ["video/"];

export class ClinicWelcomeDocumentsController {
  private service(db: Db): ClinicWelcomeDocumentService {
    return new ClinicWelcomeDocumentService(db);
  }

  private async parseUpload(
    request: FastifyRequest
  ): Promise<{ fileName: string; mimeType: string | null; data: Buffer }> {
    let fileName = "";
    let mimeType: string | null = null;
    let data: Buffer | null = null;

    for await (const part of request.parts()) {
      if (part.type === "file") {
        const buf = await part.toBuffer();
        if (buf.length > MAX_FILE_BYTES) {
          throw new BadRequestError("File exceeds the 50MB limit");
        }
        data = buf;
        fileName = part.filename ?? "file";
        mimeType = part.mimetype ?? null;
      }
    }

    if (!data || data.length === 0) throw new BadRequestError("A file is required");

    const mime = (mimeType ?? "").toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(mime) && !ALLOWED_MIME_PREFIXES.some((p) => mime.startsWith(p))) {
      throw new BadRequestError(
        "Unsupported file type. Only PDF, images (JPG, PNG, WebP), and videos are allowed."
      );
    }

    return { fileName, mimeType, data };
  }

  async upload(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { fileName, mimeType, data } = await this.parseUpload(request);
    const db = await getDb();
    const doc = await this.service(db).uploadDocument(ctx, {
      fileName,
      mimeType,
      data,
    });
    return reply.code(201).send(clinicWelcomeDocumentToPublic(doc));
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const params = request.query as Record<string, string | undefined>;
    const db = await getDb();
    const result = await this.service(db).listDocuments(ctx, {
      q: params.q,
    });
    return reply.send({ documents: result.documents });
  }

  async get(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { documentId } = request.params as { documentId: string };
    const db = await getDb();
    const doc = await this.service(db).getDocumentById(ctx, documentId);
    if (!doc) {
      return reply.code(404).send({ error: "Welcome document not found" });
    }
    return reply.send(clinicWelcomeDocumentToPublic(doc));
  }

  async download(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { documentId } = request.params as { documentId: string };
    const db = await getDb();
    const { url, fileName, mimeType } = await this.service(db).getDownloadUrl(ctx, documentId);
    return reply.send({ url, fileName, mimeType });
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { documentId } = request.params as { documentId: string };
    const db = await getDb();
    await this.service(db).deleteDocument(ctx, documentId);
    return reply.code(204).send();
  }
}