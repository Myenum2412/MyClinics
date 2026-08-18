import type { Db, WithId } from "mongodb";
import type { PrescriptionDoc } from "@/clinic/modules/prescriptions/prescriptions.schema";

/**
 * Prescription repository — doctor-patient scoped:
 *   doctor  → doctorId: ctx.doctorId (own prescriptions only)
 *   patient → patientId: ctx.patientId (own prescriptions only)
 */
export class PrescriptionRepository {
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
    return this.db.collection<PrescriptionDoc>("clc_prescriptions");
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

  async findByPrescriptionId(prescriptionId: string): Promise<WithId<PrescriptionDoc> | null> {
    return this.collection().findOne(this.scoped({ prescriptionId }));
  }

  async list(query: {
    patientId?: string;
    doctorId?: string;
    from?: string;
    to?: string;
    skip: number;
    limit: number;
  }): Promise<[WithId<PrescriptionDoc>[], number]> {
    const filter: Record<string, unknown> = {};
    if (query.patientId) filter.patientId = query.patientId;
    if (query.doctorId) filter.doctorId = query.doctorId;
    if (query.from || query.to) {
      filter.visitDate = {
        ...(query.from ? { $gte: query.from } : {}),
        ...(query.to ? { $lte: query.to } : {}),
      };
    }
    const scoped = this.scoped(filter);
    const [items, total] = await Promise.all([
      this.collection()
        .find(scoped)
        .sort({ visitDate: -1, createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .toArray(),
      this.collection().countDocuments(scoped),
    ]);
    return [items, total];
  }

  async insert(doc: Omit<PrescriptionDoc, "_id" | "clinicId" | "createdAt" | "updatedAt">): Promise<WithId<PrescriptionDoc>> {
    const now = new Date();
    await this.collection().insertOne({
      ...doc,
      clinicId: this.clinicId,
      createdAt: now,
      updatedAt: now,
    } as never);
    return (await this.findByPrescriptionId(doc.prescriptionId)) as WithId<PrescriptionDoc>;
  }

  async update(prescriptionId: string, patch: Record<string, unknown>): Promise<boolean> {
    const result = await this.collection().updateOne(
      this.scoped({ prescriptionId }),
      { $set: { ...patch, updatedAt: new Date() } }
    );
    return result.matchedCount === 1;
  }

  async softDelete(prescriptionId: string): Promise<boolean> {
    const result = await this.collection().updateOne(
      this.scoped({ prescriptionId }),
      { $set: { status: "deleted", deletedAt: new Date(), updatedAt: new Date() } }
    );
    return result.matchedCount === 1;
  }
}