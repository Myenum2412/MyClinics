import type { Db, WithId } from "mongodb";
import type { ReportDoc } from "@/clinic/modules/reports/reports.schema";

/**
 * Report repository — doctor-patient scoped:
 *   doctor  → doctorId: ctx.doctorId (reports for own patients)
 *   patient → patientId: ctx.patientId (own reports only)
 */
export class ReportRepository {
  constructor(
    private readonly db: Db,
    private readonly clinicId: string,
    private readonly scope: {
      role: string;
      doctorId: string | null;
      patientId: string | null;
    }
  ) {}

  private collection() {
    return this.db.collection<ReportDoc>("clc_reports");
  }

  private scoped(base: Record<string, unknown> = {}): Record<string, unknown> {
    const filter: Record<string, unknown> = { ...base };
    if (this.scope.role === "doctor") {
      filter.doctorId = this.scope.doctorId ?? null;
    }
    if (this.scope.role === "patient") {
      filter.patientId = this.scope.patientId ?? null;
    }
    return { clinicId: this.clinicId, ...filter };
  }

  async findByReportId(reportId: string): Promise<WithId<ReportDoc> | null> {
    return this.collection().findOne(this.scoped({ reportId }));
  }

  async list(query: {
    patientId?: string;
    type?: string;
    status?: string;
    from?: string;
    to?: string;
    skip: number;
    limit: number;
  }): Promise<[WithId<ReportDoc>[], number]> {
    const filter: Record<string, unknown> = {};
    if (query.patientId) filter.patientId = query.patientId;
    if (query.type) filter.type = query.type;
    if (query.status) filter.status = query.status;
    if (query.from || query.to) {
      filter.createdAt = {
        ...(query.from ? { $gte: new Date(`${query.from}T00:00:00Z`) } : {}),
        ...(query.to ? { $lte: new Date(`${query.to}T23:59:59Z`) } : {}),
      };
    }
    const scoped = this.scoped(filter);
    const [items, total] = await Promise.all([
      this.collection()
        .find(scoped)
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .toArray(),
      this.collection().countDocuments(scoped),
    ]);
    return [items, total];
  }

  async insert(doc: Omit<ReportDoc, "_id" | "clinicId" | "createdAt" | "updatedAt">): Promise<WithId<ReportDoc>> {
    const now = new Date();
    await this.collection().insertOne({
      ...doc,
      clinicId: this.clinicId,
      createdAt: now,
      updatedAt: now,
    } as never);
    return (await this.findByReportId(doc.reportId)) as WithId<ReportDoc>;
  }

  async update(reportId: string, patch: Record<string, unknown>): Promise<boolean> {
    const result = await this.collection().updateOne(
      this.scoped({ reportId }),
      { $set: { ...patch, updatedAt: new Date() } }
    );
    return result.matchedCount === 1;
  }

  async softDelete(reportId: string): Promise<boolean> {
    const result = await this.collection().updateOne(
      this.scoped({ reportId }),
      { $set: { status: "failed", deletedAt: new Date(), updatedAt: new Date() } }
    );
    return result.matchedCount === 1;
  }
}