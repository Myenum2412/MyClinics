import type { Db, WithId } from "mongodb";
import { writeAudit } from "@/clinic/core/audit";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import { requireClinicOf, type ClinicContext } from "@/clinic/core/context";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "@/clinic/core/errors";
import { generatePrescriptionId } from "@/clinic/core/ids";
import type { CreatePrescriptionInput, UpdatePrescriptionInput } from "@/clinic/modules/prescriptions/prescriptions.dto";
import { PrescriptionRepository } from "@/clinic/modules/prescriptions/prescriptions.repository";
import type { PrescriptionDoc } from "@/clinic/modules/prescriptions/prescriptions.schema";

export class PrescriptionService {
  constructor(private readonly db: Db) {}

  private repo(ctx: ClinicContext): PrescriptionRepository {
    return new PrescriptionRepository(this.db, requireClinicOf(ctx), {
      role: ctx.role,
      doctorId: ctx.doctorId,
      patientId: ctx.patientId,
    });
  }

  async createPrescription(
    ctx: ClinicContext,
    input: CreatePrescriptionInput
  ): Promise<WithId<PrescriptionDoc>> {
    const clinicId = requireClinicOf(ctx);
    const patient = await this.db
      .collection(CLINIC_COLLECTIONS.patients)
      .findOne({ clinicId, patientId: input.patientId, status: { $ne: "deleted" } });
    if (!patient) {
      throw new BadRequestError("The patient does not exist in this clinic");
    }

    // Doctors may only prescribe for their own patients.
    if (ctx.role === "doctor" && patient.doctorId !== ctx.doctorId) {
      throw new ForbiddenError("You can only prescribe for your own patients");
    }

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
      throw new BadRequestError("A doctor must be associated with the prescription");
    }

    const prescription = await this.repo(ctx).insert({
      prescriptionId: generatePrescriptionId(),
      patientId: input.patientId,
      doctorId,
      visitDate: input.visitDate,
      diagnosis: input.diagnosis ?? null,
      medicines: input.medicines,
      notes: input.notes ?? null,
      createdBy: ctx.userId,
    });

    await writeAudit(this.db, ctx, {
      action: "create",
      entity: "prescription",
      entityId: prescription.prescriptionId,
      metadata: { patientId: input.patientId, doctorId, visitDate: input.visitDate },
    });

    return prescription;
  }

  async getPrescription(ctx: ClinicContext, prescriptionId: string): Promise<WithId<PrescriptionDoc>> {
    const prescription = await this.repo(ctx).findByPrescriptionId(prescriptionId);
    if (!prescription) throw new NotFoundError("Prescription not found");
    return prescription;
  }

  async listPrescriptions(
    ctx: ClinicContext,
    query: { patientId?: string; doctorId?: string; from?: string; to?: string; skip: number; limit: number }
  ) {
    const [items, total] = await this.repo(ctx).list(query);
    return { items, total };
  }

  async updatePrescription(
    ctx: ClinicContext,
    prescriptionId: string,
    input: UpdatePrescriptionInput
  ): Promise<WithId<PrescriptionDoc>> {
    const repo = this.repo(ctx);
    const existing = await repo.findByPrescriptionId(prescriptionId);
    if (!existing) throw new NotFoundError("Prescription not found");

    const patch: Record<string, unknown> = {};
    for (const key of ["visitDate", "diagnosis", "medicines", "notes", "doctorId"] as const) {
      const value = input[key];
      if (value !== undefined) patch[key] = value;
    }
    if (Object.keys(patch).length === 0) return existing;

    const ok = await repo.update(prescriptionId, patch);
    if (!ok) throw new NotFoundError("Prescription not found");

    await writeAudit(this.db, ctx, {
      action: "update",
      entity: "prescription",
      entityId: prescriptionId,
      metadata: { fields: Object.keys(patch) },
    });

    const updated = await repo.findByPrescriptionId(prescriptionId);
    return updated ?? existing;
  }

  async deletePrescription(ctx: ClinicContext, prescriptionId: string): Promise<void> {
    const repo = this.repo(ctx);
    const existing = await repo.findByPrescriptionId(prescriptionId);
    if (!existing) throw new NotFoundError("Prescription not found");

    await repo.softDelete(prescriptionId);

    await writeAudit(this.db, ctx, {
      action: "delete",
      entity: "prescription",
      entityId: prescriptionId,
      metadata: { patientId: existing.patientId },
    });
  }
}