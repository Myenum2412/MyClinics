import { now as nowFn } from "@/clinic/core/datetime";
import { escapeRegex } from "@/clinic/core/pagination";
import { paginatedJoinList, matchEntityIds, idClause } from "@/clinic/core/list-query";
import type { Db, WithId } from "mongodb";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import type { MedicineRecordDoc } from "@/clinic/modules/medicine/medicine.schema";

/** Medicine record joined at read time with the patient/doctor names the list UI needs — never a raw id. */
export type MedicineRecordWithNames = WithId<MedicineRecordDoc> & { patientName: string | null; doctorName: string | null };

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
      if (this.scope.doctorId) filter.doctorId = this.scope.doctorId;
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
    /** Matches patient name, doctor name, or diagnosis. */
    q?: string;
    skip: number;
    limit: number;
  }): Promise<[MedicineRecordWithNames[], number]> {
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

    const match: Record<string, unknown> = { ...scoped };
    if (query.q) {
      const safeQ = escapeRegex(query.q);
      const [patientIds, doctorIds] = await Promise.all([
        matchEntityIds(this.db, CLINIC_COLLECTIONS.patients, this.clinicId, "patientId", [
          { fullName: { $regex: safeQ, $options: "i" } },
          { mobile: { $regex: safeQ, $options: "i" } },
        ]),
        matchEntityIds(this.db, CLINIC_COLLECTIONS.doctors, this.clinicId, "doctorId", [
          { name: { $regex: safeQ, $options: "i" } },
        ]),
      ]);
      match.$or = [
        ...idClause("patientId", patientIds),
        ...idClause("doctorId", doctorIds),
        { diagnosis: { $regex: safeQ, $options: "i" } },
      ];
    }

    return paginatedJoinList<MedicineRecordWithNames>({
      collection: this.collection(),
      match,
      joins: [
        { from: CLINIC_COLLECTIONS.patients, localField: "patientId", foreignField: "patientId", as: "patient" },
        { from: CLINIC_COLLECTIONS.doctors, localField: "doctorId", foreignField: "doctorId", as: "doctor" },
      ],
      sort: { visitDate: -1, createdAt: -1 },
      skip: query.skip,
      limit: query.limit,
      project: [
        { $set: { patientName: "$patient.fullName", doctorName: "$doctor.name" } },
        { $unset: ["patient", "doctor"] },
      ],
    });
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
