import { now as nowFn } from "@/clinic/core/datetime";
import type { Db, WithId } from "mongodb";
import type { MedicineRecordDoc } from "@/clinic/modules/medicine/medicine.schema";

/**
 * Medicine records repository — doctor-patient scoped:
 *   doctor  → doctorId: ctx.doctorId (own authored records only)
 *   patient → patientId: ctx.patientId (own records only)
 */
export class MedicineRepository {
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
    return this.db.collection<MedicineRecordDoc>("clc_medicine");
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

  async findByRecordId(recordId: string): Promise<WithId<MedicineRecordDoc> | null> {
    return this.collection().findOne(this.scoped({ recordId }));
  }

  async list(query: {
    patientId?: string;
    doctorId?: string;
    from?: string;
    to?: string;
    skip: number;
    limit: number;
  }): Promise<[WithId<MedicineRecordDoc>[], number]> {
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

  async insert(doc: Omit<MedicineRecordDoc, "_id" | "clinicId" | "createdAt" | "updatedAt">): Promise<WithId<MedicineRecordDoc>> {
    const now = nowFn();
    await this.collection().insertOne({
      ...doc,
      clinicId: this.clinicId,
      createdAt: now,
      updatedAt: now,
    } as never);
    return (await this.findByRecordId(doc.recordId)) as WithId<MedicineRecordDoc>;
  }

  async update(recordId: string, patch: Record<string, unknown>): Promise<boolean> {
    const result = await this.collection().updateOne(
      this.scoped({ recordId }),
      { $set: { ...patch, updatedAt: nowFn() } }
    );
    return result.matchedCount === 1;
  }

  async softDelete(recordId: string): Promise<boolean> {
    const result = await this.collection().updateOne(
      this.scoped({ recordId }),
      { $set: { status: "deleted", deletedAt: nowFn(), updatedAt: nowFn() } }
    );
    return result.matchedCount === 1;
  }
}
