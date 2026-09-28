import type { Db, WithId } from "mongodb";
import { writeAudit } from "@/clinic/core/audit";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import { requireClinicOf, type ClinicContext } from "@/clinic/core/context";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "@/clinic/core/errors";
import { generateExaminationId } from "@/clinic/core/ids";
import type {
  CreateExaminationInput,
  UpdateExaminationInput,
} from "@/clinic/modules/examinations/examinations.dto";
import { ExaminationRepository } from "@/clinic/modules/examinations/examinations.repository";
import type { ExaminationDoc } from "@/clinic/modules/examinations/examinations.schema";

export class ExaminationService {
  constructor(private readonly db: Db) {}

  private repo(ctx: ClinicContext): ExaminationRepository {
    return new ExaminationRepository(this.db, requireClinicOf(ctx), {
      role: ctx.role,
      doctorId: ctx.doctorId,
      patientId: ctx.patientId,
    });
  }

  private async resolvePatient(clinicId: string, patientId: string) {
    const patient = await this.db
      .collection<{ patientId: string; fullName: string; doctorId: string | null }>(
        CLINIC_COLLECTIONS.patients
      )
      .findOne({ clinicId, patientId, status: { $ne: "deleted" } });
    if (!patient) {
      throw new BadRequestError("The patient does not exist in this clinic");
    }
    return patient;
  }

  private async resolveDoctor(
    clinicId: string,
    doctorId: string | null | undefined,
    ctx: ClinicContext
  ): Promise<string | null> {
    const resolved = doctorId ?? (ctx.role === "doctor" ? ctx.doctorId : null);
    if (!resolved) return null;
    const doctor = await this.db
      .collection(CLINIC_COLLECTIONS.doctors)
      .findOne({ clinicId, doctorId: resolved, status: { $ne: "deleted" } });
    if (!doctor) {
      throw new BadRequestError("The doctor does not exist in this clinic");
    }
    return resolved;
  }

  async createExamination(
    ctx: ClinicContext,
    input: CreateExaminationInput
  ): Promise<WithId<ExaminationDoc>> {
    const clinicId = requireClinicOf(ctx);
    const patient = await this.resolvePatient(clinicId, input.patientId);

    // Doctors may only create examinations for their own patients.
    if (ctx.role === "doctor" && patient.doctorId !== ctx.doctorId) {
      throw new ForbiddenError(
        "You can only create examinations for your own patients"
      );
    }

    const doctorId = await this.resolveDoctor(clinicId, input.doctorId, ctx);

    const examination = await this.repo(ctx).insert({
      examinationId: generateExaminationId(),
      patientId: input.patientId,
      patientName: patient.fullName,
      doctorId,
      visitDate: input.visitDate,
      status: input.status ?? "pending",
      oralFindings: input.oralFindings,
      notes: input.notes ?? null,
      createdBy: ctx.userId,
      createdByName: ctx.name,
    });

    await writeAudit(this.db, ctx, {
      action: "create",
      entity: "examination",
      entityId: examination.examinationId,
      metadata: {
        patientId: input.patientId,
        doctorId,
      },
    });

    return examination;
  }

  async getExamination(
    ctx: ClinicContext,
    examinationId: string
  ): Promise<WithId<ExaminationDoc>> {
    const examination = await this.repo(ctx).findByExaminationId(
      examinationId
    );
    if (!examination || examination.status === "deleted") {
      throw new NotFoundError("Examination not found");
    }
    return examination;
  }

  async listExaminations(
    ctx: ClinicContext,
    query: {
      q?: string;
      patientId?: string;
      status?: string;
      from?: string;
      to?: string;
      skip: number;
      limit: number;
    }
  ) {
    const [items, total] = await this.repo(ctx).list(query);
    return {
      items: items.filter((i) => i.status !== "deleted"),
      total,
    };
  }

  async updateExamination(
    ctx: ClinicContext,
    examinationId: string,
    input: UpdateExaminationInput
  ): Promise<WithId<ExaminationDoc>> {
    const clinicId = requireClinicOf(ctx);
    const existing = await this.repo(ctx).findByExaminationId(examinationId);
    if (!existing || existing.status === "deleted") {
      throw new NotFoundError("Examination not found");
    }

    const patch: Record<string, unknown> = {};
    if (input.visitDate !== undefined) patch.visitDate = input.visitDate;
    if (input.status !== undefined) patch.status = input.status;
    if (input.oralFindings !== undefined) patch.oralFindings = input.oralFindings;
    if (input.notes !== undefined) patch.notes = input.notes;
    if (input.doctorId !== undefined) {
      patch.doctorId = await this.resolveDoctor(clinicId, input.doctorId, ctx);
    }

    if (Object.keys(patch).length === 0) return existing;
    await this.repo(ctx).update(examinationId, patch);
    await writeAudit(this.db, ctx, {
      action: "update",
      entity: "examination",
      entityId: examinationId,
      metadata: { fields: Object.keys(patch) },
    });
    return (await this.repo(ctx).findByExaminationId(examinationId)) ?? existing;
  }

  async deleteExamination(
    ctx: ClinicContext,
    examinationId: string
  ): Promise<void> {
    if (ctx.role !== "clinic_admin") {
      throw new ForbiddenError("Only clinic admin can remove examinations");
    }
    const existing = await this.repo(ctx).findByExaminationId(examinationId);
    if (!existing || existing.status === "deleted") {
      throw new NotFoundError("Examination not found");
    }
    await this.repo(ctx).softDelete(examinationId);
    await writeAudit(this.db, ctx, {
      action: "delete",
      entity: "examination",
      entityId: examinationId,
      metadata: { patientId: existing.patientId },
    });
  }
}
