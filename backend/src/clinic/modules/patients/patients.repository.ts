import { now as nowFn } from "@/clinic/core/datetime";
import type { Db, WithId } from "mongodb";
import type { PatientDoc } from "@/clinic/modules/patients/patients.schema";

/**
 * Patient repository — doctor-scoped. For the `doctor` role, every query
 * automatically gains `doctorId: ctx.doctorId`, so a doctor can NEVER see a
 * patient assigned to another doctor, even if a handler tries. The `patient`
 * role automatically gains `patientId: ctx.patientId` (own record only).
 */
export class PatientRepository {
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
    return this.db.collection<PatientDoc>("clc_patients");
  }

  private scoped(base: Record<string, unknown> = {}): Record<string, unknown> {
    const filter: Record<string, unknown> = {
      clinicId: this.clinicId,
      status: { $ne: "deleted" },
      ...base,
    };
    if (this.scope.role === "doctor") {
      filter.doctorId = this.scope.doctorId ?? null;
    }
    if (this.scope.role === "patient") {
      // A patient may only ever target their OWN record. If the caller tried
      // to query a different patientId, make the query unmatchable (404) —
      // never shadow the scope with the caller's id.
      if (base.patientId !== undefined && base.patientId !== this.scope.patientId) {
        filter.patientId = "__not_your_record__";
      } else {
        filter.patientId = this.scope.patientId ?? "__not_your_record__";
      }
    }
    return filter;
  }

  async findByPatientId(patientId: string): Promise<WithId<PatientDoc> | null> {
    return this.collection().findOne(this.scoped({ patientId }));
  }

  async findById(patientId: string): Promise<WithId<PatientDoc> | null> {
    return this.findByPatientId(patientId);
  }

  async list(query: {
    q?: string;
    doctorId?: string;
    status?: string;
    skip: number;
    limit: number;
  }): Promise<[WithId<PatientDoc>[], number]> {
    const filter: Record<string, unknown> = { status: { $ne: "deleted" } };
    if (query.doctorId) filter.doctorId = query.doctorId;
    if (query.status) filter.status = query.status;
    if (query.q) {
      filter.$or = [
        { fullName: { $regex: query.q, $options: "i" } },
        { mobile: { $regex: query.q, $options: "i" } },
        { email: { $regex: query.q, $options: "i" } },
        { city: { $regex: query.q, $options: "i" } },
        { state: { $regex: query.q, $options: "i" } },
      ];
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

  async insert(doc: Omit<PatientDoc, "_id" | "clinicId" | "createdAt" | "updatedAt">): Promise<WithId<PatientDoc>> {
    const now = nowFn();
    await this.collection().insertOne({
      ...doc,
      clinicId: this.clinicId,
      status: doc.status ?? "active",
      createdAt: now,
      updatedAt: now,
    } as never);
    return (await this.findByPatientId(doc.patientId)) as WithId<PatientDoc>;
  }

  async update(patientId: string, patch: Record<string, unknown>): Promise<boolean> {
    const result = await this.collection().updateOne(
      this.scoped({ patientId }),
      { $set: { ...patch, updatedAt: nowFn() } }
    );
    return result.matchedCount === 1;
  }

  /** Doctor reassignment — used by the explicit assign endpoint. */
  async assignDoctor(patientId: string, doctorId: string | null): Promise<boolean> {
    const result = await this.collection().updateOne(
      this.scoped({ patientId }),
      { $set: { doctorId, updatedAt: nowFn() } }
    );
    return result.matchedCount === 1;
  }

  async softDelete(patientId: string): Promise<boolean> {
    const result = await this.collection().updateOne(
      this.scoped({ patientId }),
      { $set: { status: "deleted", deletedAt: nowFn(), updatedAt: nowFn() } }
    );
    return result.matchedCount === 1;
  }
}