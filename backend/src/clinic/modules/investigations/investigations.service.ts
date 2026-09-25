import type { Db, WithId } from "mongodb";
import { writeAudit } from "@/clinic/core/audit";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import { requireClinicOf, type ClinicContext } from "@/clinic/core/context";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "@/clinic/core/errors";
import { generateInvestigationId } from "@/clinic/core/ids";
import type {
  CreateInvestigationInput,
  UpdateInvestigationInput,
} from "@/clinic/modules/investigations/investigations.dto";
import { InvestigationRepository } from "@/clinic/modules/investigations/investigations.repository";
import type { InvestigationDoc } from "@/clinic/modules/investigations/investigations.schema";

/** Upper bound for the serialised odontogram chart payload (~1MB JSON). */
const MAX_CHART_BYTES = 1024 * 1024;

function chartByteSize(chart: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(chart) ?? "", "utf8");
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

export class InvestigationService {
  constructor(private readonly db: Db) {}

  private repo(ctx: ClinicContext): InvestigationRepository {
    return new InvestigationRepository(this.db, requireClinicOf(ctx), {
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

  /**
   * Validate the optional medical-record link: the record must exist in this
   * clinic and belong to the same patient (medical record connection).
   */
  private async resolveMedicalRecord(
    clinicId: string,
    medicalRecordId: string | null | undefined,
    patientId: string
  ): Promise<string | null> {
    if (!medicalRecordId) return null;
    const record = await this.db
      .collection<{ recordId: string; patientId: string }>(
        CLINIC_COLLECTIONS.medicalRecords
      )
      .findOne({ clinicId, recordId: medicalRecordId });
    if (!record) {
      throw new BadRequestError("The linked medical record does not exist");
    }
    if (record.patientId !== patientId) {
      throw new BadRequestError(
        "The linked medical record belongs to a different patient"
      );
    }
    return medicalRecordId;
  }

  async createInvestigation(
    ctx: ClinicContext,
    input: CreateInvestigationInput
  ): Promise<WithId<InvestigationDoc>> {
    const clinicId = requireClinicOf(ctx);
    const patient = await this.resolvePatient(clinicId, input.patientId);

    // Doctors may only create investigations for their own patients.
    if (ctx.role === "doctor" && patient.doctorId !== ctx.doctorId) {
      throw new ForbiddenError(
        "You can only create investigations for your own patients"
      );
    }

    if (input.chartData && chartByteSize(input.chartData) > MAX_CHART_BYTES) {
      throw new BadRequestError("Chart data is too large");
    }

    const doctorId = await this.resolveDoctor(clinicId, input.doctorId, ctx);
    const medicalRecordId = await this.resolveMedicalRecord(
      clinicId,
      input.medicalRecordId,
      input.patientId
    );

    const investigation = await this.repo(ctx).insert({
      investigationId: generateInvestigationId(),
      patientId: input.patientId,
      patientName: patient.fullName,
      doctorId,
      title: input.title,
      notes: input.notes ?? null,
      visitDate: input.visitDate,
      status: input.status ?? "pending",
      chartData: (input.chartData as Record<string, unknown> | undefined) ?? null,
      medicalRecordId,
      createdBy: ctx.userId,
      createdByName: ctx.name,
    });

    await writeAudit(this.db, ctx, {
      action: "create",
      entity: "investigation",
      entityId: investigation.investigationId,
      metadata: {
        patientId: input.patientId,
        doctorId,
        title: input.title,
        medicalRecordId,
      },
    });

    return investigation;
  }

  async getInvestigation(
    ctx: ClinicContext,
    investigationId: string
  ): Promise<WithId<InvestigationDoc>> {
    const investigation = await this.repo(ctx).findByInvestigationId(
      investigationId
    );
    if (!investigation || investigation.status === "deleted") {
      throw new NotFoundError("Investigation not found");
    }
    return investigation;
  }

  async listInvestigations(
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

  async updateInvestigation(
    ctx: ClinicContext,
    investigationId: string,
    input: UpdateInvestigationInput
  ): Promise<WithId<InvestigationDoc>> {
    const clinicId = requireClinicOf(ctx);
    const existing = await this.repo(ctx).findByInvestigationId(investigationId);
    if (!existing || existing.status === "deleted") {
      throw new NotFoundError("Investigation not found");
    }

    const patch: Record<string, unknown> = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.notes !== undefined) patch.notes = input.notes;
    if (input.visitDate !== undefined) patch.visitDate = input.visitDate;
    if (input.status !== undefined) patch.status = input.status;
    if (input.chartData !== undefined) {
      if (input.chartData && chartByteSize(input.chartData) > MAX_CHART_BYTES) {
        throw new BadRequestError("Chart data is too large");
      }
      patch.chartData = input.chartData;
    }
    if (input.doctorId !== undefined) {
      patch.doctorId = await this.resolveDoctor(clinicId, input.doctorId, ctx);
    }
    if (input.medicalRecordId !== undefined) {
      patch.medicalRecordId = await this.resolveMedicalRecord(
        clinicId,
        input.medicalRecordId,
        existing.patientId
      );
    }

    if (Object.keys(patch).length === 0) return existing;
    await this.repo(ctx).update(investigationId, patch);
    await writeAudit(this.db, ctx, {
      action: "update",
      entity: "investigation",
      entityId: investigationId,
      metadata: { fields: Object.keys(patch) },
    });
    return (await this.repo(ctx).findByInvestigationId(investigationId)) ?? existing;
  }

  async deleteInvestigation(
    ctx: ClinicContext,
    investigationId: string
  ): Promise<void> {
    if (ctx.role !== "clinic_admin") {
      throw new ForbiddenError("Only clinic admin can remove investigations");
    }
    const existing = await this.repo(ctx).findByInvestigationId(investigationId);
    if (!existing || existing.status === "deleted") {
      throw new NotFoundError("Investigation not found");
    }
    await this.repo(ctx).softDelete(investigationId);
    await writeAudit(this.db, ctx, {
      action: "delete",
      entity: "investigation",
      entityId: investigationId,
      metadata: { title: existing.title, patientId: existing.patientId },
    });
  }
}
