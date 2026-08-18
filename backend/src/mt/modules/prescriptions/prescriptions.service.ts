import type { Db } from "mongodb";
import { writeAudit } from "@/mt/core/audit";
import { NotFoundError } from "@/mt/core/errors";
import { randomToken } from "@/mt/core/ids";
import type { TenantContext } from "@/mt/core/tenant-context";
import type { CreatePrescriptionInput } from "@/mt/modules/prescriptions/prescriptions.dto";
import { PrescriptionRepository } from "@/mt/modules/prescriptions/prescriptions.repository";
import type { PrescriptionDoc } from "@/mt/modules/prescriptions/prescriptions.schema";

export class PrescriptionService {
  constructor(private readonly db: Db) {}

  private repo(ctx: TenantContext): PrescriptionRepository {
    return new PrescriptionRepository(this.db, ctx);
  }

  async createPrescription(
    ctx: TenantContext,
    input: CreatePrescriptionInput
  ): Promise<PrescriptionDoc> {
    const repo = this.repo(ctx);

    const patient = await this.db
      .collection("mt_patients")
      .findOne({ clinicId: ctx.clinicId, patientId: input.patientId });
    if (!patient) {
      throw new NotFoundError("Patient not found in this clinic");
    }

    const now = new Date();
    const doc: Omit<PrescriptionDoc, "clinicId"> = {
      prescriptionId: `prx_${randomToken(16)}`,
      patientId: input.patientId,
      doctorName: input.doctorName,
      diagnosis: input.diagnosis,
      medicines: input.medicines.map((m) => ({
        ...m,
        instructions: m.instructions ?? null,
      })),
      notes: input.notes ?? null,
      followUpDate: input.followUpDate ?? null,
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
    };

    const created = await repo.insert(doc as never);

    await writeAudit(this.db, ctx, {
      action: "create",
      entity: "prescription",
      entityId: created.prescriptionId,
      metadata: { patientId: input.patientId, medicines: input.medicines.length },
    });

    return created;
  }

  async getPrescriptionById(
    ctx: TenantContext,
    prescriptionId: string
  ): Promise<PrescriptionDoc> {
    const prescription = await this.repo(ctx).findByPrescriptionId(prescriptionId);
    if (!prescription) throw new NotFoundError("Prescription not found");
    return prescription;
  }

  async listByPatient(
    ctx: TenantContext,
    patientId: string,
    options: { skip: number; limit: number }
  ) {
    return this.repo(ctx).listByPatient(patientId, options);
  }
}