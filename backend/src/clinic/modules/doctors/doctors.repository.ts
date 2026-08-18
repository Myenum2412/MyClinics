import type { Db, WithId } from "mongodb";
import type { DoctorDoc } from "@/clinic/modules/doctors/doctors.schema";

/**
 * Doctor repository — clinic-scoped only. Doctor records are a directory,
 * not patient medical data, so they are readable clinic-wide by staff.
 */
export class DoctorRepository {
  constructor(
    private readonly db: Db,
    private readonly clinicId: string
  ) {}

  private collection() {
    return this.db.collection<DoctorDoc>("clc_doctors");
  }

  async findByDoctorId(doctorId: string): Promise<WithId<DoctorDoc> | null> {
    return this.collection().findOne({ clinicId: this.clinicId, doctorId });
  }

  async findByUserId(userId: string): Promise<WithId<DoctorDoc> | null> {
    return this.collection().findOne({ clinicId: this.clinicId, userId });
  }

  async list(query: {
    q?: string;
    specialization?: string;
    status?: string;
    skip: number;
    limit: number;
  }): Promise<[WithId<DoctorDoc>[], number]> {
    const filter: Record<string, unknown> = {
      clinicId: this.clinicId,
      status: { $ne: "deleted" },
    };
    if (query.specialization) filter.specialization = query.specialization;
    if (query.status) filter.status = query.status;
    if (query.q) {
      filter.$or = [
        { name: { $regex: query.q, $options: "i" } },
        { specialization: { $regex: query.q, $options: "i" } },
        { licenseNo: { $regex: query.q, $options: "i" } },
      ];
    }
    const [items, total] = await Promise.all([
      this.collection()
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .toArray(),
      this.collection().countDocuments(filter),
    ]);
    return [items, total];
  }

  async insert(doc: Omit<DoctorDoc, "_id" | "clinicId" | "createdAt" | "updatedAt">): Promise<WithId<DoctorDoc>> {
    const now = new Date();
    await this.collection().insertOne({
      ...doc,
      clinicId: this.clinicId,
      status: doc.status ?? "active",
      createdAt: now,
      updatedAt: now,
    } as never);
    return (await this.findByDoctorId(doc.doctorId)) as WithId<DoctorDoc>;
  }

  async update(doctorId: string, patch: Record<string, unknown>): Promise<boolean> {
    const result = await this.collection().updateOne(
      { clinicId: this.clinicId, doctorId },
      { $set: { ...patch, updatedAt: new Date() } }
    );
    return result.matchedCount === 1;
  }

  async softDelete(doctorId: string): Promise<boolean> {
    const result = await this.collection().updateOne(
      { clinicId: this.clinicId, doctorId },
      { $set: { status: "deleted", deletedAt: new Date(), updatedAt: new Date() } }
    );
    return result.matchedCount === 1;
  }
}