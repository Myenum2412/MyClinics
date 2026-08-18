import type { Db } from "mongodb";
import { writeAudit } from "@/mt/core/audit";
import { NotFoundError } from "@/mt/core/errors";
import { randomToken } from "@/mt/core/ids";
import type { TenantContext } from "@/mt/core/tenant-context";
import type { CreateMedicalRecordInput } from "@/mt/modules/medical-records/medical-records.dto";
import { MedicalRecordRepository } from "@/mt/modules/medical-records/medical-records.repository";
import type { MedicalRecordDoc } from "@/mt/modules/medical-records/medical-records.schema";

export class MedicalRecordService {
  constructor(private readonly db: Db) {}

  private repo(ctx: TenantContext): MedicalRecordRepository {
    return new MedicalRecordRepository(this.db, ctx);
  }

  async createMedicalRecord(
    ctx: TenantContext,
    input: CreateMedicalRecordInput
  ): Promise<MedicalRecordDoc> {
    const repo = this.repo(ctx);

    const patient = await this.db
      .collection("mt_patients")
      .findOne({ clinicId: ctx.clinicId, patientId: input.patientId });
    if (!patient) {
      throw new NotFoundError("Patient not found in this clinic");
    }

    const now = new Date();
    const doc: Omit<MedicalRecordDoc, "clinicId"> = {
      recordId: `mrc_${randomToken(16)}`,
      patientId: input.patientId,
      title: input.title,
      recordType: input.recordType,
      summary: input.summary,
      diagnosis: input.diagnosis ?? null,
      attachments: input.attachments ?? [],
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
    };

    const created = await repo.insert(doc as never);

    await writeAudit(this.db, ctx, {
      action: "create",
      entity: "medical_record",
      entityId: created.recordId,
      metadata: { patientId: input.patientId, title: input.title },
    });

    return created;
  }

  async getMedicalRecordById(ctx: TenantContext, recordId: string): Promise<MedicalRecordDoc> {
    const record = await this.repo(ctx).findByRecordId(recordId);
    if (!record) throw new NotFoundError("Medical record not found");
    return record;
  }

  async listByPatient(
    ctx: TenantContext,
    patientId: string,
    options: { skip: number; limit: number }
  ) {
    return this.repo(ctx).listByPatient(patientId, options);
  }
}