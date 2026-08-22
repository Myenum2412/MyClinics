import type { FastifyReply, FastifyRequest } from "fastify";
import type { Db } from "mongodb";
import { getMedicalRecordsDb } from "@/lib/db-pools";
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

  /** Parse multipart upload body; enforces the strict file-type allowlist. */
  private async parseUpload(
    request: FastifyRequest
  ): Promise<{ patientId: string; fileName: string; folder?: string; mimeType: string | null; data: Buffer }> {
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
        "Unsupported file type. Only PDF, DOCX, XLSX, JPG, PNG, TIFF, DICOM and video files (MP4, WebM, QuickTime) are allowed."
      );
    }

    return { patientId, fileName, folder: folder || undefined, mimeType, data };
  }

  async upload(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { patientId, fileName, folder, mimeType, data } = await this.parseUpload(request);
    const db = await getMedicalRecordsDb();
    const file = await this.service(db).uploadFile(ctx, {
      patientId,
      fileName,
      mimeType,
      data,
      folder,
    });
    return reply.code(201).send(medicalRecordFileToPublic(file));
  }

  async uploadVersion(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { fileId } = request.params as { fileId: string };
    if (!fileId) throw new BadRequestError("fileId is required");
    const { fileName, mimeType, data } = await this.parseUpload(request);
    const db = await getMedicalRecordsDb();
    const file = await this.service(db).uploadVersion(ctx, fileId, fileName, mimeType, data);
    return reply.send(medicalRecordFileToPublic(file));
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const params = request.query as Record<string, string | undefined>;
    const db = await getMedicalRecordsDb();
    const files = await this.service(db).listFiles(ctx, {
      q: params.q,
      patientId: params.patientId,
      folder: params.folder,
      type: params.type,
      from: params.from,
      to: params.to,
    });
    return reply.send({ files: files.map(medicalRecordFileToPublic) });
  }

  async createFolder(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const body = (request.body ?? {}) as {
      patientId?: string;
      name?: string;
      parentFolderId?: string | null;
    };
    if (!body.patientId) throw new BadRequestError("patientId is required");
    if (!body.name || !String(body.name).trim()) {
      throw new BadRequestError("Folder name is required");
    }
    const db = await getMedicalRecordsDb();
    const folder = await this.service(db).createFolder(ctx, {
      patientId: String(body.patientId),
      name: String(body.name),
      parentFolderId: body.parentFolderId ?? null,
    });
    return reply.code(201).send(medicalRecordFolderToPublic(folder));
  }

  async listFolders(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const params = request.query as Record<string, string | undefined>;
    const db = await getMedicalRecordsDb();
    const folders = await this.service(db).listFolders(ctx, params.patientId);
    return reply.send({ folders: folders.map(medicalRecordFolderToPublic) });
  }

  async removeFolder(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { folderId } = request.params as { folderId: string };
    if (!folderId) throw new BadRequestError("folderId is required");
    const db = await getMedicalRecordsDb();
    await this.service(db).deleteFolder(ctx, folderId);
    return reply.send({ ok: true });
  }

  async renameFolder(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { folderId } = request.params as { folderId: string };
    const body = (request.body ?? {}) as { name?: string };
    if (!folderId) throw new BadRequestError("folderId is required");
    if (!body.name || !String(body.name).trim()) {
      throw new BadRequestError("Folder name is required");
    }
    const db = await getMedicalRecordsDb();
    const folder = await this.service(db).renameFolder(ctx, folderId, String(body.name));
    return reply.send(medicalRecordFolderToPublic(folder));
  }

  async moveFolder(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { folderId } = request.params as { folderId: string };
    const body = (request.body ?? {}) as { parentFolderId?: string | null };
    if (!folderId) throw new BadRequestError("folderId is required");
    const db = await getMedicalRecordsDb();
    const folder = await this.service(db).moveFolder(ctx, folderId, body.parentFolderId ?? null);
    return reply.send(medicalRecordFolderToPublic(folder));
  }

  async copyFolder(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { folderId } = request.params as { folderId: string };
    const body = (request.body ?? {}) as { parentFolderId?: string | null };
    if (!folderId) throw new BadRequestError("folderId is required");
    const db = await getMedicalRecordsDb();
    const folder = await this.service(db).copyFolder(ctx, folderId, body.parentFolderId ?? null);
    return reply.code(201).send(medicalRecordFolderToPublic(folder));
  }

  async renameFile(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { fileId } = request.params as { fileId: string };
    const body = (request.body ?? {}) as { fileName?: string };
    if (!fileId) throw new BadRequestError("fileId is required");
    if (!body.fileName || !String(body.fileName).trim()) {
      throw new BadRequestError("File name is required");
    }
    const db = await getMedicalRecordsDb();
    const file = await this.service(db).renameFile(ctx, fileId, String(body.fileName));
    return reply.send(medicalRecordFileToPublic(file));
  }

  async moveFile(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { fileId } = request.params as { fileId: string };
    const body = (request.body ?? {}) as { folder?: string };
    if (!fileId) throw new BadRequestError("fileId is required");
    if (!body.folder || !String(body.folder).trim()) {
      throw new BadRequestError("folder is required");
    }
    const db = await getMedicalRecordsDb();
    const file = await this.service(db).moveFile(ctx, fileId, String(body.folder));
    return reply.send(medicalRecordFileToPublic(file));
  }

  async copyFile(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { fileId } = request.params as { fileId: string };
    const body = (request.body ?? {}) as { folder?: string };
    if (!fileId) throw new BadRequestError("fileId is required");
    if (!body.folder || !String(body.folder).trim()) {
      throw new BadRequestError("folder is required");
    }
    const db = await getMedicalRecordsDb();
    const file = await this.service(db).copyFile(ctx, fileId, String(body.folder));
    return reply.code(201).send(medicalRecordFileToPublic(file));
  }

  async download(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { fileId } = request.params as { fileId: string };
    if (!fileId) throw new BadRequestError("fileId is required");
    const db = await getMedicalRecordsDb();
    const result = await this.service(db).getDownloadUrl(ctx, fileId);
    return reply.send(result);
  }

  async remove(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { fileId } = request.params as { fileId: string };
    if (!fileId) throw new BadRequestError("fileId is required");
    const db = await getMedicalRecordsDb();
    await this.service(db).deleteFile(ctx, fileId);
    return reply.send({ ok: true });
  }
}