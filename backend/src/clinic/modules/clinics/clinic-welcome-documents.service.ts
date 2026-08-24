import { now as nowFn } from "@/clinic/core/datetime";
import type { Db, WithId } from "mongodb";
import { writeAudit } from "@/clinic/core/audit";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import { requireClinicOf, type ClinicContext } from "@/clinic/core/context";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/clinic/core/errors";
import { uploadToR2, getDownloadUrl, deleteFromR2 } from "@/lib/r2";
import type { PatientDoc } from "@/clinic/modules/patients/patients.schema";
import {
  type ClinicWelcomeDocumentDoc,
  type ClinicWelcomeDocumentVersion,
  clinicWelcomeDocumentToPublic,
  generateWelcomeDocumentId,
  r2KeyForWelcomeDocument,
  mimeFromName,
} from "@/clinic/modules/clinics/clinic-welcome-documents.schema";

export interface UploadWelcomeDocumentInput {
  fileName: string;
  mimeType: string | null;
  data: Buffer;
}

export interface ListWelcomeDocumentsFilter {
  q?: string;
}

export class ClinicWelcomeDocumentService {
  constructor(private readonly db: Db) {}

  private collection() {
    return this.db.collection<ClinicWelcomeDocumentDoc>(CLINIC_COLLECTIONS.clinicWelcomeDocuments);
  }

  async uploadDocument(
    ctx: ClinicContext,
    input: UploadWelcomeDocumentInput
  ): Promise<WithId<ClinicWelcomeDocumentDoc>> {
    const clinicId = requireClinicOf(ctx);
    const documentId = generateWelcomeDocumentId();
    const now = nowFn();
    const r2Key = r2KeyForWelcomeDocument(clinicId, documentId, input.fileName);

    await uploadToR2(r2Key, input.data, input.mimeType ?? "application/octet-stream");

    const doc: ClinicWelcomeDocumentDoc = {
      clinicId,
      documentId,
      fileName: input.fileName,
      r2Key,
      mimeType: input.mimeType,
      size: input.data.length,
      version: 1,
      versions: [
        {
          version: 1,
          r2Key,
          fileName: input.fileName,
          mimeType: input.mimeType,
          size: input.data.length,
          uploadedBy: ctx.userId,
          uploadedByName: ctx.name ?? null,
          createdAt: now,
        },
      ],
      downloadCount: 0,
      lastDownloadedAt: null,
      uploadedBy: ctx.userId,
      uploadedByName: ctx.name ?? null,
      createdAt: now,
    };

    const created = await this.collection().insertOne(doc as never);

    await writeAudit(this.db, ctx, {
      action: "create",
      entity: "clinic_welcome_document",
      entityId: documentId,
      metadata: { fileName: input.fileName, size: input.data.length },
    });

    return { ...doc, _id: created.insertedId } as WithId<ClinicWelcomeDocumentDoc>;
  }

  async listDocuments(
    ctx: ClinicContext,
    filter: ListWelcomeDocumentsFilter = {}
  ): Promise<{ documents: ReturnType<typeof clinicWelcomeDocumentToPublic>[] }> {
    const clinicId = requireClinicOf(ctx);
    const query: Record<string, unknown> = { clinicId, deletedAt: { $exists: false } };

    if (filter.q) {
      query.fileName = { $regex: filter.q, $options: "i" };
    }

    const documents = await this.collection()
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return {
      documents: documents.map((d) => clinicWelcomeDocumentToPublic(d)),
    };
  }

  async getDocumentById(ctx: ClinicContext, documentId: string): Promise<WithId<ClinicWelcomeDocumentDoc> | null> {
    const clinicId = requireClinicOf(ctx);
    return this.collection().findOne({ clinicId, documentId, deletedAt: { $exists: false } });
  }

  async getDownloadUrl(ctx: ClinicContext, documentId: string): Promise<{ url: string; fileName: string; mimeType: string | null }> {
    const clinicId = requireClinicOf(ctx);
    const doc = await this.collection().findOne({ clinicId, documentId, deletedAt: { $exists: false } });
    if (!doc) throw new NotFoundError("Welcome document not found");

    const url = await getDownloadUrl(doc.r2Key, 3600, doc.mimeType);

    await this.collection().updateOne(
      { _id: doc._id },
      {
        $inc: { downloadCount: 1 },
        $set: { lastDownloadedAt: nowFn() },
      }
    );

    return { url, fileName: doc.fileName, mimeType: doc.mimeType };
  }

  async deleteDocument(ctx: ClinicContext, documentId: string): Promise<void> {
    const clinicId = requireClinicOf(ctx);
    const doc = await this.collection().findOne({ clinicId, documentId, deletedAt: { $exists: false } });
    if (!doc) throw new NotFoundError("Welcome document not found");

    await deleteFromR2(doc.r2Key);
    await this.collection().updateOne(
      { _id: doc._id },
      { $set: { deletedAt: nowFn() } }
    );

    await writeAudit(this.db, ctx, {
      action: "delete",
      entity: "clinic_welcome_document",
      entityId: documentId,
      metadata: { fileName: doc.fileName },
    });
  }
}