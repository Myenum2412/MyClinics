import type { Db, WithId } from "mongodb";
import { writeAudit } from "@/clinic/core/audit";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import { requireClinicOf, type ClinicContext } from "@/clinic/core/context";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/clinic/core/errors";
import { generateFileId, generateFolderId } from "@/clinic/core/ids";
import {
  deleteFromR2,
  getDownloadUrl,
  listR2Objects,
  uploadToR2,
  copyObjectInR2,
} from "@/lib/r2";
import { enqueueNotification } from "@/services/whatsapp/notification.service";
import { ensureDefaultOrganization } from "@/services/customer/customer-context.service";
import type { PatientDoc } from "@/clinic/modules/patients/patients.schema";
import {
  type MedicalRecordFileDoc,
  type MedicalRecordFileVersion,
  type MedicalRecordFolderDoc,
  medicalRecordFileToPublic,
  medicalRecordFolderToPublic,
  DEFAULT_SUBFOLDERS,
  VIRTUAL_FOLDER_R2_DIR,
  isVirtualFolderKey,
  defaultFolderKeyToId,
} from "@/clinic/modules/medical-record/medical-record.schema";

export interface UploadMedicalRecordFileInput {
  patientId: string;
  fileName: string;
  mimeType: string | null;
  data: Buffer;
  /** Folder key or custom folder id. Defaults to "other-documents". */
  folder?: string;
}

export interface CreateMedicalRecordFolderInput {
  patientId: string;
  name: string;
  parentFolderId?: string | null;
}

export const DEFAULT_FOLDER = "other-documents";

/** Map legacy folder keys ("medical") onto the new default set. */
const LEGACY_FOLDER_MAP: Record<string, string> = {
  medical: "medical-records",
  prescriptions: "prescriptions",
};

/** Prefix for pseudo fileIds that point at legacy R2 objects. */
const LEGACY_FILE_ID_PREFIX = "mrl_";

function legacyFileId(r2Key: string): string {
  return `${LEGACY_FILE_ID_PREFIX}${Buffer.from(r2Key).toString("base64url")}`;
}

function decodeLegacyFileId(fileId: string): string | null {
  if (!fileId.startsWith(LEGACY_FILE_ID_PREFIX)) return null;
  try {
    return Buffer.from(fileId.slice(LEGACY_FILE_ID_PREFIX.length), "base64url").toString("utf8");
  } catch {
    return null;
  }
}

function legacyPatientId(r2Key: string): string | null {
  // reports/patients/{patientId}/...
  const parts = r2Key.split("/");
  return parts.length >= 3 && parts[0] === "reports" && parts[1] === "patients"
    ? parts[2]
    : null;
}

function mimeFromName(name: string): string {
  const ext = name.toLowerCase().slice(name.lastIndexOf("."));
  const map: Record<string, string> = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".tif": "image/tiff",
    ".tiff": "image/tiff",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".dcm": "application/dicom",
  };
  return map[ext] ?? "application/octet-stream";
}

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

  private patients() {
    return this.db.collection(CLINIC_COLLECTIONS.patients);
  }

  /** Doctors may only touch folders/files of patients assigned to them. */
  private async assertPatientAccess(ctx: ClinicContext, patientId: string): Promise<WithId<PatientDoc>> {
    const clinicId = requireClinicOf(ctx);
    const patient = await this.patients().findOne({
      clinicId,
      patientId,
      status: { $ne: "deleted" },
    });
    if (!patient) throw new NotFoundError("Patient not found");
    if (ctx.role === "doctor" && patient.doctorId !== ctx.doctorId) {
      throw new ForbiddenError("You can only access records of patients assigned to you");
    }
    if (ctx.role === "patient" && patient.patientId !== ctx.patientId) {
      throw new ForbiddenError("You can only access your own records");
    }
    return patient as unknown as WithId<PatientDoc>;
  }

  /** Staff may only upload (no delete/rename/move/copy/version operations). */
  private assertCanManage(ctx: ClinicContext): void {
    if (ctx.role === "staff") {
      throw new ForbiddenError("Staff have upload-only access to medical records");
    }
  }

  /** Ensure the default per-patient subfolders exist (idempotent). */
  async ensureDefaultFolders(ctx: ClinicContext, patientId: string): Promise<void> {
    const clinicId = requireClinicOf(ctx);
    const existing = await this.folderCollection().find({ clinicId, patientId }).toArray();
    const byKey = new Map(
      existing.filter((f) => f.defaultKey).map((f) => [f.defaultKey, f])
    );
    const now = new Date();
    const ops = DEFAULT_SUBFOLDERS.filter((d) => !byKey.has(d.key)).map((d) => ({
      clinicId,
      folderId: defaultFolderKeyToId(patientId, d.key),
      patientId,
      name: d.name,
      isDefault: true,
      defaultKey: d.key,
      parentFolderId: null,
      createdBy: ctx.userId,
      createdByName: ctx.name,
      createdAt: now,
    }));
    if (ops.length > 0) {
      await this.folderCollection().insertMany(ops as never[]);
    }
  }

  /** Normalize a legacy folder key / custom folder id, ensuring it exists. */
  private async resolveFolderKey(
    ctx: ClinicContext,
    patientId: string,
    folder: string | undefined
  ): Promise<string> {
    const raw = (folder ?? DEFAULT_FOLDER).trim().slice(0, 80) || DEFAULT_FOLDER;
    const key = LEGACY_FOLDER_MAP[raw] ?? raw;
    const defaultMeta = DEFAULT_SUBFOLDERS.find((d) => d.key === key);
    if (defaultMeta) {
      await this.ensureDefaultFolders(ctx, patientId);
      return key;
    }
    const custom = await this.folderCollection().findOne({
      clinicId: requireClinicOf(ctx),
      folderId: key,
      patientId,
    });
    if (!custom) throw new NotFoundError("Folder not found");
    // Moving a file onto a default folder (by its id) stores it under the
    // default key so listings match it.
    if (custom.isDefault && custom.defaultKey) return custom.defaultKey;
    return key;
  }

  async uploadFile(
    ctx: ClinicContext,
    input: UploadMedicalRecordFileInput
  ): Promise<MedicalRecordFileDoc> {
    const patient = await this.assertPatientAccess(ctx, input.patientId);
    const folder = await this.resolveFolderKey(ctx, input.patientId, input.folder);

    const fileId = generateFileId();
    const key = r2Key(requireClinicOf(ctx), input.patientId, fileId, input.fileName);
    await uploadToR2(key, input.data, input.mimeType ?? "application/octet-stream");

    const now = new Date();
    const patientPhone = patient.whatsapp ?? patient.mobile ?? "";
    const doc: MedicalRecordFileDoc = {
      clinicId: requireClinicOf(ctx),
      fileId,
      patientId: input.patientId,
      patientName: patient.fullName,
      patientPhone: patientPhone || null,
      fileName: input.fileName,
      r2Key: key,
      folder,
      mimeType: input.mimeType,
      size: input.data.length,
      version: 1,
      versions: [],
      downloadCount: 0,
      lastDownloadedAt: null,
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
        version: 1,
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
      ).catch(() => void 0);
    }

    return doc;
  }

  /** Upload a new version of an existing file (replaces content, keeps fileId). */
  async uploadVersion(
    ctx: ClinicContext,
    fileId: string,
    fileName: string,
    mimeType: string | null,
    data: Buffer
  ): Promise<MedicalRecordFileDoc> {
    this.assertCanManage(ctx);
    if (decodeLegacyFileId(fileId)) {
      throw new BadRequestError("Legacy files cannot be versioned");
    }
    const doc = await this.getFile(ctx, fileId);
    const newVersion: MedicalRecordFileVersion = {
      version: doc.version,
      r2Key: doc.r2Key,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      size: doc.size,
      uploadedBy: doc.uploadedBy,
      uploadedByName: doc.uploadedByName,
      createdAt: doc.createdAt,
    };
    const key = r2Key(requireClinicOf(ctx), doc.patientId, fileId, fileName);
    await uploadToR2(key, data, mimeType ?? "application/octet-stream");

    const now = new Date();
    const updated: Partial<MedicalRecordFileDoc> = {
      r2Key: key,
      fileName,
      mimeType,
      size: data.length,
      version: doc.version + 1,
      versions: [newVersion, ...(doc.versions ?? [])].slice(0, 20),
      updatedAt: now,
    };
    await this.collection().updateOne({ clinicId: requireClinicOf(ctx), fileId }, { $set: updated });

    await writeAudit(this.db, ctx, {
      action: "update",
      entity: "medical_record_file",
      entityId: fileId,
      metadata: { fileName, version: doc.version + 1, size: data.length },
    });

    const patientPhone = doc.patientPhone ?? "";
    if (patientPhone) {
      const org = await ensureDefaultOrganization(this.db);
      await enqueueNotification(
        this.db,
        org.id,
        patientPhone,
        `Updated version of "${fileName}" (v${doc.version + 1}) has been added to your records.`,
        "medical_record",
        { filename: fileName, mimetype: mimeType ?? "application/octet-stream", data: data.toString("base64") }
      ).catch(() => void 0);
    }

    return this.getFile(ctx, fileId);
  }

  /** Rename a file. */
  async renameFile(ctx: ClinicContext, fileId: string, newName: string): Promise<MedicalRecordFileDoc> {
    this.assertCanManage(ctx);
    const doc = await this.getFile(ctx, fileId);
    if (decodeLegacyFileId(fileId)) {
      throw new BadRequestError("Legacy files cannot be renamed");
    }
    const name = newName.trim().slice(0, 255);
    if (!name) throw new BadRequestError("File name is required");
    await this.collection().updateOne(
      { clinicId: requireClinicOf(ctx), fileId },
      { $set: { fileName: name, updatedAt: new Date() } }
    );
    await writeAudit(this.db, ctx, {
      action: "update",
      entity: "medical_record_file",
      entityId: fileId,
      metadata: { oldName: doc.fileName, fileName: name, patientId: doc.patientId },
    });
    return this.getFile(ctx, fileId);
  }

  /** Move a file into another folder (or root level via folder "root"). */
  async moveFile(
    ctx: ClinicContext,
    fileId: string,
    targetFolder: string
  ): Promise<MedicalRecordFileDoc> {
    this.assertCanManage(ctx);
    const doc = await this.getFile(ctx, fileId);
    if (decodeLegacyFileId(fileId)) {
      throw new BadRequestError("Legacy files cannot be moved");
    }
    const folder = await this.resolveFolderKey(ctx, doc.patientId, targetFolder);
    await this.collection().updateOne(
      { clinicId: requireClinicOf(ctx), fileId },
      { $set: { folder, updatedAt: new Date() } }
    );
    await writeAudit(this.db, ctx, {
      action: "update",
      entity: "medical_record_file",
      entityId: fileId,
      metadata: { patientId: doc.patientId, fromFolder: doc.folder, toFolder: folder },
    });
    return this.getFile(ctx, fileId);
  }

  /** Copy a file into a folder (or root level). */
  async copyFile(
    ctx: ClinicContext,
    fileId: string,
    targetFolder: string
  ): Promise<MedicalRecordFileDoc> {
    this.assertCanManage(ctx);
    const doc = await this.getFile(ctx, fileId);
    const folder = await this.resolveFolderKey(ctx, doc.patientId, targetFolder);

    const newFileId = generateFileId();
    const clinicId = requireClinicOf(ctx);
    const key = r2Key(clinicId, doc.patientId, newFileId, doc.fileName);
    await copyObjectInR2(doc.r2Key, key);

    const now = new Date();
    const copy: MedicalRecordFileDoc = {
      ...doc,
      clinicId,
      fileId: newFileId,
      r2Key: key,
      folder,
      version: 1,
      versions: [],
      downloadCount: 0,
      lastDownloadedAt: null,
      uploadedBy: ctx.userId,
      uploadedByName: ctx.name,
      createdAt: now,
      updatedAt: now,
    };
    await this.collection().insertOne(copy as never);

    await writeAudit(this.db, ctx, {
      action: "create",
      entity: "medical_record_file",
      entityId: newFileId,
      metadata: { patientId: doc.patientId, sourceFileId: fileId, fileName: doc.fileName, folder },
    });
    return copy;
  }

  /** List legacy R2 files (`reports/patients/{patientId}/...`) as pseudo docs. */
  private async listLegacyFiles(
    ctx: ClinicContext,
    patientId: string
  ): Promise<MedicalRecordFileDoc[]> {
    const clinicId = requireClinicOf(ctx);
    const patient = await this.assertPatientAccess(ctx, patientId);
    const docs: MedicalRecordFileDoc[] = [];
    for (const [key, dir] of Object.entries(VIRTUAL_FOLDER_R2_DIR)) {
      const objects = await listR2Objects(`reports/patients/${patientId}/${dir}/`, 1000);
      for (const obj of objects) {
        const fileName = obj.key.slice(obj.key.lastIndexOf("/") + 1);
        if (!fileName || fileName === ".folder" || fileName.endsWith("/.folder")) continue;
        docs.push({
          clinicId,
          fileId: legacyFileId(obj.key),
          patientId,
          patientName: patient.fullName,
          patientPhone: patient.whatsapp ?? patient.mobile ?? null,
          fileName,
          r2Key: obj.key,
          folder: key,
          mimeType: mimeFromName(fileName),
          size: obj.size,
          version: 1,
          versions: [],
          downloadCount: 0,
          lastDownloadedAt: null,
          uploadedBy: "system",
          uploadedByName: "Legacy upload",
          createdAt: obj.lastModified ?? new Date(),
        });
      }
    }
    return docs;
  }

  async listFiles(
    ctx: ClinicContext,
    filter: {
      q?: string;
      patientId?: string;
      folder?: string;
      type?: string;
      from?: string;
      to?: string;
      limit?: number;
    } = {}
  ): Promise<MedicalRecordFileDoc[]> {
    const clinicId = requireClinicOf(ctx);
    const query: Record<string, unknown> = { clinicId };

    if (ctx.role === "doctor") {
      const patientIds = await this.patients()
        .find({ clinicId, doctorId: ctx.doctorId, status: { $ne: "deleted" } }, { projection: { patientId: 1 } })
        .toArray();
      query.patientId = { $in: patientIds.map((p) => p.patientId) };
      if (filter.patientId && !(query.patientId as { $in: string[] }).$in.includes(filter.patientId)) {
        throw new ForbiddenError("You can only access records of patients assigned to you");
      }
    } else if (ctx.role === "patient") {
      query.patientId = ctx.patientId;
      if (filter.patientId && filter.patientId !== ctx.patientId) {
        throw new ForbiddenError("You can only access your own records");
      }
    }

    if (filter.patientId) query.patientId = filter.patientId;
    if (filter.folder) query.folder = filter.folder;
    if (filter.q) {
      query.fileName = { $regex: filter.q, $options: "i" };
    }
    if (filter.type) {
      const t = filter.type.toLowerCase();
      const ext = t.startsWith(".") ? t : `.${t}`;
      const or: Record<string, unknown>[] = [{ fileName: { $regex: `\\${ext}$`, $options: "i" } }];
      if (!t.startsWith(".")) {
        or.push({ mimeType: { $regex: `^${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, $options: "i" } });
      }
      query.$or = or;
    }
    if (filter.from || filter.to) {
      query.createdAt = {
        ...(filter.from ? { $gte: new Date(`${filter.from}T00:00:00.000Z`) } : {}),
        ...(filter.to ? { $lte: new Date(`${filter.to}T23:59:59.999Z`) } : {}),
      };
    }

    const docs = await this.collection()
      .find(query as never)
      .sort({ createdAt: -1 })
      .limit(Math.min(filter.limit ?? 500, 1000))
      .toArray();

    // Merge legacy R2 files when listing a patient (or a specific virtual folder).
    if (filter.patientId && (!filter.folder || isVirtualFolderKey(filter.folder))) {
      const legacy = await this.listLegacyFiles(ctx, filter.patientId);
      const filteredLegacy = filter.folder
        ? legacy.filter((f) => f.folder === filter.folder)
        : legacy;
      return [...(docs as unknown as MedicalRecordFileDoc[]), ...filteredLegacy];
    }

    return docs as unknown as MedicalRecordFileDoc[];
  }

  async createFolder(
    ctx: ClinicContext,
    input: CreateMedicalRecordFolderInput
  ): Promise<MedicalRecordFolderDoc> {
    this.assertCanManage(ctx);
    await this.assertPatientAccess(ctx, input.patientId);

    const name = input.name.trim().replace(/\s+/g, " ").slice(0, 60);
    if (!name) throw new BadRequestError("Folder name is required");

    if (input.parentFolderId) {
      const parent = await this.folderCollection().findOne({
        clinicId: requireClinicOf(ctx),
        folderId: input.parentFolderId,
        patientId: input.patientId,
      });
      if (!parent) throw new NotFoundError("Parent folder not found");
    }

    const folderId = generateFolderId();
    const now = new Date();
    const doc: MedicalRecordFolderDoc = {
      clinicId: requireClinicOf(ctx),
      folderId,
      patientId: input.patientId,
      name,
      isDefault: false,
      defaultKey: null,
      parentFolderId: input.parentFolderId ?? null,
      createdBy: ctx.userId,
      createdByName: ctx.name,
      createdAt: now,
    };
    await this.folderCollection().insertOne(doc as never);

    await writeAudit(this.db, ctx, {
      action: "create",
      entity: "medical_record_folder",
      entityId: folderId,
      metadata: { patientId: input.patientId, name, parentFolderId: doc.parentFolderId },
    });

    return doc;
  }

  async listFolders(ctx: ClinicContext, patientId?: string): Promise<MedicalRecordFolderDoc[]> {
    const clinicId = requireClinicOf(ctx);
    const query: Record<string, unknown> = { clinicId };
    if (patientId) {
      await this.assertPatientAccess(ctx, patientId);
      // Ensure the patient's default folders exist (pre-existing patients
      // never had them provisioned at creation time).
      await this.ensureDefaultFolders(ctx, patientId);
      query.patientId = patientId;
    } else if (ctx.role === "doctor") {
      const patientIds = await this.patients()
        .find({ clinicId, doctorId: ctx.doctorId, status: { $ne: "deleted" } }, { projection: { patientId: 1 } })
        .toArray();
      query.patientId = { $in: patientIds.map((p) => p.patientId) };
    } else if (ctx.role === "patient") {
      query.patientId = ctx.patientId;
      if (patientId && patientId !== ctx.patientId) {
        throw new ForbiddenError("You can only access your own records");
      }
    }
    const docs = await this.folderCollection().find(query as never).sort({ isDefault: -1, createdAt: 1 }).toArray();
    return docs as unknown as MedicalRecordFolderDoc[];
  }

  /** Recursively delete a folder: subfolders, files, and their R2 objects. */
  private async collectFolderTree(clinicId: string, folderId: string): Promise<{ folders: MedicalRecordFolderDoc[]; files: MedicalRecordFileDoc[] }> {
    const folders: MedicalRecordFolderDoc[] = [];
    const queue = [folderId];
    const files: MedicalRecordFileDoc[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const folder = await this.folderCollection().findOne({ clinicId, folderId: current });
      if (!folder) continue;
      folders.push(folder);
      const children = await this.folderCollection().find({ clinicId, parentFolderId: current }).toArray();
      queue.push(...children.map((c) => c.folderId));
      const folderFiles = await this.collection().find({ clinicId, folder: current }).toArray();
      files.push(...folderFiles);
    }
    return { folders, files };
  }

  async deleteFolder(ctx: ClinicContext, folderId: string): Promise<void> {
    this.assertCanManage(ctx);
    const clinicId = requireClinicOf(ctx);
    const folder = await this.folderCollection().findOne({ clinicId, folderId });
    if (!folder) throw new NotFoundError("Folder not found");
    await this.assertPatientAccess(ctx, folder.patientId);
    if (folder.isDefault) {
      throw new BadRequestError("Default folders cannot be deleted");
    }

    const { folders, files } = await this.collectFolderTree(clinicId, folderId);
    await Promise.all(files.map((f) => deleteFromR2(f.r2Key).catch(() => void 0)));
    await this.collection().deleteMany({ clinicId, folderId: { $in: [...new Set(files.map((f) => f.folder))] } });
    await this.folderCollection().deleteMany({ clinicId, folderId: { $in: folders.map((f) => f.folderId) } });

    await writeAudit(this.db, ctx, {
      action: "delete",
      entity: "medical_record_folder",
      entityId: folderId,
      metadata: { patientId: folder.patientId, name: folder.name, subfolders: folders.length - 1, files: files.length },
    });
  }

  async renameFolder(ctx: ClinicContext, folderId: string, newName: string): Promise<MedicalRecordFolderDoc> {
    this.assertCanManage(ctx);
    const clinicId = requireClinicOf(ctx);
    const folder = await this.folderCollection().findOne({ clinicId, folderId });
    if (!folder) throw new NotFoundError("Folder not found");
    await this.assertPatientAccess(ctx, folder.patientId);
    if (folder.isDefault) throw new BadRequestError("Default folders cannot be renamed");

    const name = newName.trim().replace(/\s+/g, " ").slice(0, 60);
    if (!name) throw new BadRequestError("Folder name is required");
    await this.folderCollection().updateOne(
      { clinicId, folderId },
      { $set: { name, updatedAt: new Date() } }
    );
    await writeAudit(this.db, ctx, {
      action: "update",
      entity: "medical_record_folder",
      entityId: folderId,
      metadata: { patientId: folder.patientId, oldName: folder.name, name },
    });
    return (await this.folderCollection().findOne({ clinicId, folderId })) as unknown as MedicalRecordFolderDoc;
  }

  /** Move a folder under another parent folder. */
  async moveFolder(
    ctx: ClinicContext,
    folderId: string,
    targetParentFolderId: string | null
  ): Promise<MedicalRecordFolderDoc> {
    this.assertCanManage(ctx);
    const clinicId = requireClinicOf(ctx);
    const folder = await this.folderCollection().findOne({ clinicId, folderId });
    if (!folder) throw new NotFoundError("Folder not found");
    await this.assertPatientAccess(ctx, folder.patientId);
    if (folder.isDefault) throw new BadRequestError("Default folders cannot be moved");

    if (targetParentFolderId) {
      if (targetParentFolderId === folderId) throw new BadRequestError("A folder cannot be moved into itself");
      const parent = await this.folderCollection().findOne({ clinicId, folderId: targetParentFolderId, patientId: folder.patientId });
      if (!parent) throw new NotFoundError("Target folder not found");
      // Cycle guard: walk up from target to ensure it is not a descendant of this folder.
      let cursor: MedicalRecordFolderDoc | null = parent;
      while (cursor) {
        if (cursor.folderId === folderId) throw new BadRequestError("A folder cannot be moved into its own subfolder");
        cursor = cursor.parentFolderId
          ? ((await this.folderCollection().findOne({ clinicId, folderId: cursor.parentFolderId })) as unknown as MedicalRecordFolderDoc | null)
          : null;
      }
    }

    await this.folderCollection().updateOne(
      { clinicId, folderId },
      { $set: { parentFolderId: targetParentFolderId ?? null, updatedAt: new Date() } }
    );
    await writeAudit(this.db, ctx, {
      action: "update",
      entity: "medical_record_folder",
      entityId: folderId,
      metadata: { patientId: folder.patientId, name: folder.name, parentFolderId: targetParentFolderId ?? null },
    });
    return (await this.folderCollection().findOne({ clinicId, folderId })) as unknown as MedicalRecordFolderDoc;
  }

  /** Copy a folder (and its contents) to another parent folder. */
  async copyFolder(
    ctx: ClinicContext,
    folderId: string,
    targetParentFolderId: string | null
  ): Promise<MedicalRecordFolderDoc> {
    this.assertCanManage(ctx);
    const clinicId = requireClinicOf(ctx);
    const source = await this.folderCollection().findOne({ clinicId, folderId });
    if (!source) throw new NotFoundError("Folder not found");
    await this.assertPatientAccess(ctx, source.patientId);
    if (targetParentFolderId) {
      const parent = await this.folderCollection().findOne({ clinicId, folderId: targetParentFolderId, patientId: source.patientId });
      if (!parent) throw new NotFoundError("Target folder not found");
    }

    // Map source folderId → copied folderId.
    const { folders, files } = await this.collectFolderTree(clinicId, folderId);
    const copyId = new Map<string, string>();
    const now = new Date();
    const folderCopies = folders.map((f) => {
      const newId = generateFolderId();
      copyId.set(f.folderId, newId);
      return {
        clinicId,
        folderId: newId,
        patientId: f.patientId,
        name: f.name,
        isDefault: false,
        defaultKey: null,
        parentFolderId: f.folderId === folderId ? targetParentFolderId ?? null : copyId.get(f.parentFolderId ?? "") ?? null,
        createdBy: ctx.userId,
        createdByName: ctx.name,
        createdAt: now,
      };
    });
    await this.folderCollection().insertMany(folderCopies as never[]);

    for (const file of files) {
      const newFileId = generateFileId();
      const key = r2Key(clinicId, file.patientId, newFileId, file.fileName);
      await copyObjectInR2(file.r2Key, key);
      const copy: MedicalRecordFileDoc = {
        ...file,
        clinicId,
        fileId: newFileId,
        r2Key: key,
        folder: copyId.get(file.folder) ?? file.folder,
        version: 1,
        versions: [],
        downloadCount: 0,
        lastDownloadedAt: null,
        uploadedBy: ctx.userId,
        uploadedByName: ctx.name,
        createdAt: now,
        updatedAt: now,
      };
      await this.collection().insertOne(copy as never);
    }

    await writeAudit(this.db, ctx, {
      action: "create",
      entity: "medical_record_folder",
      entityId: copyId.get(folderId) ?? "",
      metadata: { patientId: source.patientId, sourceFolderId: folderId, name: source.name, folders: folders.length, files: files.length },
    });

    return (await this.folderCollection().findOne({ clinicId, folderId: copyId.get(folderId) ?? "" })) as unknown as MedicalRecordFolderDoc;
  }

  async getFile(ctx: ClinicContext, fileId: string): Promise<MedicalRecordFileDoc> {
    const clinicId = requireClinicOf(ctx);

    // Legacy R2 pseudo-file.
    const legacyKey = decodeLegacyFileId(fileId);
    if (legacyKey) {
      const patientId = legacyPatientId(legacyKey);
      if (!patientId) throw new NotFoundError("File not found");
      const patient = await this.assertPatientAccess(ctx, patientId);
      const fileName = legacyKey.slice(legacyKey.lastIndexOf("/") + 1) || "file";
      return {
        clinicId,
        fileId,
        patientId,
        patientName: patient.fullName,
        patientPhone: patient.whatsapp ?? patient.mobile ?? null,
        fileName,
        r2Key: legacyKey,
        folder: "other-documents",
        mimeType: mimeFromName(fileName),
        size: 0,
        version: 1,
        versions: [],
        downloadCount: 0,
        lastDownloadedAt: null,
        uploadedBy: "system",
        uploadedByName: "Legacy upload",
        createdAt: new Date(),
      };
    }

    const doc = await this.collection().findOne({ clinicId, fileId });
    if (!doc) throw new NotFoundError("File not found");
    await this.assertPatientAccess(ctx, doc.patientId);
    return doc as unknown as MedicalRecordFileDoc;
  }

  /** Generate a download URL and record a download audit entry. */
  async getDownloadUrl(ctx: ClinicContext, fileId: string): Promise<{ url: string }> {
    const doc = await this.getFile(ctx, fileId);
    const url = await getDownloadUrl(doc.r2Key, 3600);
    const legacy = decodeLegacyFileId(fileId) !== null;
    if (!legacy) {
      await this.collection().updateOne(
        { clinicId: requireClinicOf(ctx), fileId },
        { $inc: { downloadCount: 1 }, $set: { lastDownloadedAt: new Date() } }
      );
    }
    await writeAudit(this.db, ctx, {
      action: "download",
      entity: "medical_record_file",
      entityId: fileId,
      metadata: { patientId: doc.patientId, fileName: doc.fileName, folder: doc.folder, version: doc.version },
    });
    return { url };
  }

  async deleteFile(ctx: ClinicContext, fileId: string): Promise<void> {
    this.assertCanManage(ctx);
    const doc = await this.getFile(ctx, fileId);
    await deleteFromR2(doc.r2Key).catch(() => void 0);

    const legacy = decodeLegacyFileId(fileId) !== null;
    if (!legacy) {
      await this.collection().deleteOne({ clinicId: requireClinicOf(ctx), fileId });
    }

    await writeAudit(this.db, ctx, {
      action: "delete",
      entity: "medical_record_file",
      entityId: fileId,
      metadata: { patientId: doc.patientId, fileName: doc.fileName, folder: doc.folder },
    });
  }
}

export { medicalRecordFileToPublic, medicalRecordFolderToPublic, type MedicalRecordFileDoc };