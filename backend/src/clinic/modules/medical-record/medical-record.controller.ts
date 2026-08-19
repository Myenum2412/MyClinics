import type { FastifyReply, FastifyRequest } from "fastify";
import type { Db } from "mongodb";
import { getDb } from "@/lib/db";
import { BadRequestError, UnauthorizedError } from "@/clinic/core/errors";
import { isAllowedUpload } from "@/clinic/core/upload-guard";
import {
  MedicalRecordService,
  medicalRecordFileToPublic,
  medicalRecordFolderToPublic,
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
    let folder = "";
    let mimeType: string | null = null;
    let data: Buffer | null = null;

    for await (const part of request.parts()) {
      if (part.type === "field") {
        if (part.fieldname === "patientId") patientId = String(part.value ?? "");
        if (part.fieldname === "folder") folder = String(part.value ?? "");
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
    if (!isAllowedUpload(fileName, mimeType)) {
      throw new BadRequestError(
        "Unsupported file type. Only images, PDFs, and Office documents (DOC, XLS, PPT, CSV, TXT) are allowed."
      );
    }

    const db = await getDb();
    const file = await this.service(db).uploadFile(ctx, {
      patientId,
      fileName,
      mimeType,
      data,
      folder: folder || undefined,
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

  async createFolder(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const body = (request.body ?? {}) as { patientId?: string; name?: string };
    if (!body.patientId) throw new BadRequestError("patientId is required");
    if (!body.name || !String(body.name).trim()) {
      throw new BadRequestError("Folder name is required");
    }
    const db = await getDb();
    const folder = await this.service(db).createFolder(ctx, {
      patientId: String(body.patientId),
      name: String(body.name),
    });
    return reply.code(201).send(medicalRecordFolderToPublic(folder));
  }

  async listFolders(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const db = await getDb();
    const folders = await this.service(db).listFolders(ctx);
    return reply.send({ folders: folders.map(medicalRecordFolderToPublic) });
  }

  async removeFolder(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { folderId } = request.params as { folderId: string };
    if (!folderId) throw new BadRequestError("folderId is required");
    const db = await getDb();
    await this.service(db).deleteFolder(ctx, folderId);
    return reply.send({ ok: true });
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