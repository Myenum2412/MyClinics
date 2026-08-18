import type { FastifyReply, FastifyRequest } from "fastify";
import type { Db } from "mongodb";
import { getDb } from "@/lib/db";
import { BadRequestError, UnauthorizedError } from "@/clinic/core/errors";
import {
  MedicalRecordService,
  medicalRecordFileToPublic,
} from "@/clinic/modules/medical-record/medical-record.service";

const MAX_FILE_BYTES = 25 * 1024 * 1024;

export class MedicalRecordController {
  private service(db: Db): MedicalRecordService {
    return new MedicalRecordService(db);
  }

  async upload(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();

    let patientId = "";
    let fileName = "";
    let mimeType: string | null = null;
    let data: Buffer | null = null;

    for await (const part of request.parts()) {
      if (part.type === "field") {
        if (part.fieldname === "patientId") patientId = String(part.value ?? "");
      } else if (part.type === "file") {
        const buf = await part.toBuffer();
        if (buf.length > MAX_FILE_BYTES) {
          throw new BadRequestError("File exceeds the 25MB limit");
        }
        data = buf;
        fileName = part.filename ?? "file";
        mimeType = part.mimetype ?? null;
      }
    }

    if (!patientId) throw new BadRequestError("patientId is required");
    if (!data || data.length === 0) throw new BadRequestError("A file is required");

    const db = await getDb();
    const file = await this.service(db).uploadFile(ctx, {
      patientId,
      fileName,
      mimeType,
      data,
    });
    return reply.code(201).send(medicalRecordFileToPublic(file));
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const db = await getDb();
    const files = await this.service(db).listFiles(ctx);
    return reply.send({ files: files.map(medicalRecordFileToPublic) });
  }

  async download(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { fileId } = request.params as { fileId: string };
    if (!fileId) throw new BadRequestError("fileId is required");
    const db = await getDb();
    const result = await this.service(db).getDownloadUrl(ctx, fileId);
    return reply.send(result);
  }

  async remove(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { fileId } = request.params as { fileId: string };
    if (!fileId) throw new BadRequestError("fileId is required");
    const db = await getDb();
    await this.service(db).deleteFile(ctx, fileId);
    return reply.send({ ok: true });
  }
}