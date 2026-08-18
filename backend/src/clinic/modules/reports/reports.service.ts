import type { Db, WithId } from "mongodb";
import { writeAudit } from "@/clinic/core/audit";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import { requireClinicOf, type ClinicContext } from "@/clinic/core/context";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "@/clinic/core/errors";
import { generateReportId } from "@/clinic/core/ids";
import type { CreateReportInput, UpdateReportInput } from "@/clinic/modules/reports/reports.dto";
import { ReportRepository } from "@/clinic/modules/reports/reports.repository";
import type { ReportDoc } from "@/clinic/modules/reports/reports.schema";

export class ReportService {
  constructor(private readonly db: Db) {}

  private repo(ctx: ClinicContext): ReportRepository {
    return new ReportRepository(this.db, requireClinicOf(ctx), {
      role: ctx.role,
      doctorId: ctx.doctorId,
      patientId: ctx.patientId,
    });
  }

  async createReport(ctx: ClinicContext, input: CreateReportInput): Promise<WithId<ReportDoc>> {
    const clinicId = requireClinicOf(ctx);
    const patient = await this.db
      .collection(CLINIC_COLLECTIONS.patients)
      .findOne({ clinicId, patientId: input.patientId, status: { $ne: "deleted" } });
    if (!patient) {
      throw new BadRequestError("The patient does not exist in this clinic");
    }

    // A doctor may only upload reports for their own patients.
    if (ctx.role === "doctor" && patient.doctorId !== ctx.doctorId) {
      throw new ForbiddenError("You can only upload reports for your own patients");
    }

    const doctorId = input.doctorId ?? patient.doctorId ?? null;

    const report = await this.repo(ctx).insert({
      reportId: generateReportId(),
      patientId: input.patientId,
      doctorId,
      type: input.type,
      title: input.title,
      description: input.description ?? null,
      fileUrl: input.fileUrl ?? null,
      mimeType: input.mimeType ?? null,
      status: input.status ?? "uploaded",
      uploadedBy: ctx.userId,
    });

    await writeAudit(this.db, ctx, {
      action: "create",
      entity: "report",
      entityId: report.reportId,
      metadata: { patientId: input.patientId, type: input.type, title: input.title },
    });

    return report;
  }

  async getReport(ctx: ClinicContext, reportId: string): Promise<WithId<ReportDoc>> {
    const report = await this.repo(ctx).findByReportId(reportId);
    if (!report) throw new NotFoundError("Report not found");
    return report;
  }

  async listReports(
    ctx: ClinicContext,
    query: { patientId?: string; type?: string; status?: string; from?: string; to?: string; skip: number; limit: number }
  ) {
    const [items, total] = await this.repo(ctx).list(query);
    return { items, total };
  }

  async updateReport(
    ctx: ClinicContext,
    reportId: string,
    input: UpdateReportInput
  ): Promise<WithId<ReportDoc>> {
    const repo = this.repo(ctx);
    const existing = await repo.findByReportId(reportId);
    if (!existing) throw new NotFoundError("Report not found");

    const patch: Record<string, unknown> = {};
    for (const key of ["type", "title", "description", "fileUrl", "mimeType", "status", "doctorId"] as const) {
      const value = input[key];
      if (value !== undefined) patch[key] = value;
    }
    if (Object.keys(patch).length === 0) return existing;

    const ok = await repo.update(reportId, patch);
    if (!ok) throw new NotFoundError("Report not found");

    await writeAudit(this.db, ctx, {
      action: "update",
      entity: "report",
      entityId: reportId,
      metadata: { fields: Object.keys(patch) },
    });

    const updated = await repo.findByReportId(reportId);
    return updated ?? existing;
  }

  async deleteReport(ctx: ClinicContext, reportId: string): Promise<void> {
    const repo = this.repo(ctx);
    const existing = await repo.findByReportId(reportId);
    if (!existing) throw new NotFoundError("Report not found");

    await repo.softDelete(reportId);

    await writeAudit(this.db, ctx, {
      action: "delete",
      entity: "report",
      entityId: reportId,
      metadata: { patientId: existing.patientId, title: existing.title },
    });
  }
}