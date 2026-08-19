import type { Db } from "mongodb";
import { writeAudit } from "@/clinic/core/audit";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import { requireClinicOf, type ClinicContext } from "@/clinic/core/context";
import { BadRequestError, NotFoundError } from "@/clinic/core/errors";
import { generateFileId, generateFolderId } from "@/clinic/core/ids";
import { deleteFromR2, getDownloadUrl, uploadToR2 } from "@/lib/r2";
import { enqueueNotification } from "@/services/whatsapp/notification.service";
import { ensureDefaultOrganization } from "@/services/customer/customer-context.service";
import {
  type MedicalRecordFileDoc,
  type MedicalRecordFolderDoc,
  medicalRecordFileToPublic,
  medicalRecordFolderToPublic,
} from "@/clinic/modules/medical-record/medical-record.schema";

export interface UploadMedicalRecordFileInput {
  patientId: string;
  fileName: string;
  mimeType: string | null;
  data: Buffer;
  /** Folder key the file belongs to — "medicine" | "medical" | "prescriptions" or a custom folder id. */
  folder?: string;
}

export interface CreateMedicalRecordFolderInput {
  patientId: string;
  name: string;
}

export const DEFAULT_FOLDER = "medical";

function sanitizeFileName(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return base || "file";
}

function r2Key(clinicId: string, patientId: string, fileId: string, fileName: string): string {
  return `medical-record/${clinicId}/${patientId}/${fileId}_${sanitizeFileName(fileName)}`;
}

export class MedicalRecordService {
  constructor(private readonly db: Db) {}

  private collection() {
    return this.db.collection<MedicalRecordFileDoc>(CLINIC_COLLECTIONS.medicalRecordFiles);
  }

  private folderCollection() {
    return this.db.collection<MedicalRecordFolderDoc>(CLINIC_COLLECTIONS.medicalRecordFolders);
  }

  async uploadFile(
    ctx: ClinicContext,
    input: UploadMedicalRecordFileInput
  ): Promise<MedicalRecordFileDoc> {
    const clinicId = requireClinicOf(ctx);
    const patient = await this.db
      .collection(CLINIC_COLLECTIONS.patients)
      .findOne({ clinicId, patientId: input.patientId, status: { $ne: "deleted" } });
    if (!patient) throw new NotFoundError("Patient not found");

    const folder = (input.folder ?? DEFAULT_FOLDER).trim().slice(0, 80) || DEFAULT_FOLDER;
    if (folder !== DEFAULT_FOLDER && folder !== "medicine" && folder !== "prescriptions") {
      const custom = await this.folderCollection().findOne({ clinicId, folderId: folder });
      if (!custom) throw new NotFoundError("Folder not found");
    }

    const fileId = generateFileId();
    const key = r2Key(clinicId, input.patientId, fileId, input.fileName);
    await uploadToR2(key, input.data, input.mimeType ?? "application/octet-stream");

    const now = new Date();
    const patientPhone = String(patient.whatsapp ?? patient.mobile ?? patient.phone ?? "");
    const doc: MedicalRecordFileDoc = {
      clinicId,
      fileId,
      patientId: input.patientId,
      patientName: String(patient.fullName ?? patient.name ?? "Patient"),
      patientPhone: patientPhone || null,
      fileName: input.fileName,
      r2Key: key,
      folder,
      mimeType: input.mimeType,
      size: input.data.length,
      uploadedBy: ctx.userId,
      uploadedByName: ctx.name,
      createdAt: now,
    };
    await this.collection().insertOne(doc as never);

    await writeAudit(this.db, ctx, {
      action: "create",
      entity: "medical_record_file",
      entityId: fileId,
      metadata: {
        patientId: input.patientId,
        patientName: doc.patientName,
        fileName: input.fileName,
        folder,
        size: doc.size,
      },
    });

    // Send a copy of the file to the patient's WhatsApp number.
    if (doc.patientPhone) {
      const org = await ensureDefaultOrganization(this.db);
      await enqueueNotification(
        this.db,
        org.id,
        doc.patientPhone,
        `Your medical document "${input.fileName}" has been added to your records.`,
        "medical_record",
        {
          filename: input.fileName,
          mimetype: input.mimeType ?? "application/octet-stream",
          data: input.data.toString("base64"),
        }
      ).catch((err) => {
        // The file is saved even when the WhatsApp delivery cannot be queued.
        void err;
      });
    }

    return doc;
  }

  async listFiles(ctx: ClinicContext): Promise<MedicalRecordFileDoc[]> {
    const clinicId = requireClinicOf(ctx);
    const docs = await this.collection()
      .find({ clinicId })
      .sort({ createdAt: -1 })
      .toArray();
    return docs as unknown as MedicalRecordFileDoc[];
  }

  async createFolder(
    ctx: ClinicContext,
    input: CreateMedicalRecordFolderInput
  ): Promise<MedicalRecordFolderDoc> {
    const clinicId = requireClinicOf(ctx);
    const patient = await this.db
      .collection(CLINIC_COLLECTIONS.patients)
      .findOne({ clinicId, patientId: input.patientId, status: { $ne: "deleted" } });
    if (!patient) throw new NotFoundError("Patient not found");

    const name = input.name.trim().replace(/\s+/g, " ").slice(0, 60);
    if (!name) throw new BadRequestError("Folder name is required");

    const folderId = generateFolderId();
    const now = new Date();
    const doc: MedicalRecordFolderDoc = {
      clinicId,
      folderId,
      patientId: input.patientId,
      name,
      createdBy: ctx.userId,
      createdByName: ctx.name,
      createdAt: now,
    };
    await this.folderCollection().insertOne(doc as never);

    await writeAudit(this.db, ctx, {
      action: "create",
      entity: "medical_record_folder",
      entityId: folderId,
      metadata: { patientId: input.patientId, name },
    });

    return doc;
  }

  async listFolders(ctx: ClinicContext): Promise<MedicalRecordFolderDoc[]> {
    const clinicId = requireClinicOf(ctx);
    const docs = await this.folderCollection()
      .find({ clinicId })
      .sort({ createdAt: 1 })
      .toArray();
    return docs as unknown as MedicalRecordFolderDoc[];
  }

  async deleteFolder(ctx: ClinicContext, folderId: string): Promise<void> {
    const clinicId = requireClinicOf(ctx);
    const folder = await this.folderCollection().findOne({ clinicId, folderId });
    if (!folder) throw new NotFoundError("Folder not found");

    await this.collection().deleteMany({ clinicId, folder: folderId });
    await this.folderCollection().deleteOne({ clinicId, folderId });

    await writeAudit(this.db, ctx, {
      action: "delete",
      entity: "medical_record_folder",
      entityId: folderId,
      metadata: { patientId: folder.patientId, name: folder.name },
    });
  }

  async getFile(ctx: ClinicContext, fileId: string): Promise<MedicalRecordFileDoc> {
    const clinicId = requireClinicOf(ctx);
    const doc = await this.collection().findOne({ clinicId, fileId });
    if (!doc) throw new NotFoundError("File not found");
    return doc as unknown as MedicalRecordFileDoc;
  }

  async getDownloadUrl(ctx: ClinicContext, fileId: string): Promise<{ url: string }> {
    const doc = await this.getFile(ctx, fileId);
    return { url: await getDownloadUrl(doc.r2Key, 3600) };
  }

  async deleteFile(ctx: ClinicContext, fileId: string): Promise<void> {
    const doc = await this.getFile(ctx, fileId);
    await deleteFromR2(doc.r2Key).catch(() => void 0);
    await this.collection().deleteOne({ clinicId: requireClinicOf(ctx), fileId });

    await writeAudit(this.db, ctx, {
      action: "delete",
      entity: "medical_record_file",
      entityId: fileId,
      metadata: { patientId: doc.patientId, fileName: doc.fileName },
    });
  }
}

export { medicalRecordFileToPublic, medicalRecordFolderToPublic, type MedicalRecordFileDoc };