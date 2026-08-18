import type { Db, WithId } from "mongodb";
import { writeAudit } from "@/clinic/core/audit";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import { requireClinicOf, type ClinicContext } from "@/clinic/core/context";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "@/clinic/core/errors";
import { generateRecordId } from "@/clinic/core/ids";
import type { CreateMedicineRecordInput, UpdateMedicineRecordInput } from "@/clinic/modules/medicine/medicine.dto";
import { MedicineRepository } from "@/clinic/modules/medicine/medicine.repository";
import type { MedicineRecordDoc } from "@/clinic/modules/medicine/medicine.schema";

export class MedicineService {
  constructor(private readonly db: Db) {}

  private repo(ctx: ClinicContext): MedicineRepository {
    return new MedicineRepository(this.db, requireClinicOf(ctx), {
      role: ctx.role,
      doctorId: ctx.doctorId,
      patientId: ctx.patientId,
    });
  }

  async createRecord(
    ctx: ClinicContext,
    input: CreateMedicineRecordInput
  ): Promise<WithId<MedicineRecordDoc>> {
    const clinicId = requireClinicOf(ctx);
    const patient = await this.db
      .collection(CLINIC_COLLECTIONS.patients)
      .findOne({ clinicId, patientId: input.patientId, status: { $ne: "deleted" } });
    if (!patient) {
      throw new BadRequestError("The patient does not exist in this clinic");
    }

    // Doctors may only author records for their own patients.
    if (ctx.role === "doctor" && patient.doctorId !== ctx.doctorId) {
      throw new ForbiddenError("You can only create records for your own patients");
    }

    // DoctorId defaults to the authoring doctor (or stays null for staff).
    const doctorId = input.doctorId ?? (ctx.role === "doctor" ? ctx.doctorId : null);
    if (doctorId) {
      const doctor = await this.db
        .collection(CLINIC_COLLECTIONS.doctors)
        .findOne({ clinicId, doctorId, status: { $ne: "deleted" } });
      if (!doctor) {
        throw new BadRequestError("The doctor does not exist in this clinic");
      }
    }
    if (!doctorId) {
      throw new BadRequestError("A doctor must be associated with the record");
    }

    const record = await this.repo(ctx).insert({
      recordId: generateRecordId(),
      patientId: input.patientId,
      doctorId,
      diagnosis: input.diagnosis,
      symptoms: input.symptoms ?? null,
      treatment: input.treatment ?? null,
      notes: input.notes ?? null,
      visitDate: input.visitDate,
      attachments: input.attachments ?? [],
      createdBy: ctx.userId,
    });

    await writeAudit(this.db, ctx, {
      action: "create",
      entity: "medicine_record",
      entityId: record.recordId,
      metadata: { patientId: input.patientId, doctorId, visitDate: input.visitDate },
    });

    return record;
  }

  async getRecord(ctx: ClinicContext, recordId: string): Promise<WithId<MedicineRecordDoc>> {
    const record = await this.repo(ctx).findByRecordId(recordId);
    if (!record) throw new NotFoundError("Medicine record not found");
    return record;
  }

  async listRecords(
    ctx: ClinicContext,
    query: { patientId?: string; doctorId?: string; from?: string; to?: string; skip: number; limit: number }
  ) {
    const [items, total] = await this.repo(ctx).list(query);
    return { items, total };
  }

  async updateRecord(
    ctx: ClinicContext,
    recordId: string,
    input: UpdateMedicineRecordInput
  ): Promise<WithId<MedicineRecordDoc>> {
    const repo = this.repo(ctx);
    const existing = await repo.findByRecordId(recordId);
    if (!existing) throw new NotFoundError("Medicine record not found");

    const patch: Record<string, unknown> = {};
    for (const key of [
      "diagnosis",
      "symptoms",
      "treatment",
      "notes",
      "visitDate",
      "attachments",
      "doctorId",
    ] as const) {
      const value = input[key];
      if (value !== undefined) patch[key] = value;
    }
    if (Object.keys(patch).length === 0) return existing;

    const ok = await repo.update(recordId, patch);
    if (!ok) throw new NotFoundError("Medicine record not found");

    await writeAudit(this.db, ctx, {
      action: "update",
      entity: "medicine_record",
      entityId: recordId,
      metadata: { fields: Object.keys(patch) },
    });

    const updated = await repo.findByRecordId(recordId);
    return updated ?? existing;
  }

  async deleteRecord(ctx: ClinicContext, recordId: string): Promise<void> {
    const repo = this.repo(ctx);
    const existing = await repo.findByRecordId(recordId);
    if (!existing) throw new NotFoundError("Medicine record not found");

    await repo.softDelete(recordId);

    await writeAudit(this.db, ctx, {
      action: "delete",
      entity: "medicine_record",
      entityId: recordId,
      metadata: { patientId: existing.patientId },
    });
  }
}
