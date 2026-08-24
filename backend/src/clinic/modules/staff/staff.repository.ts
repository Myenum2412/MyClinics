import { now as nowFn } from "@/clinic/core/datetime";
import type { Db, WithId } from "mongodb";
import type { StaffDoc } from "@/clinic/modules/staff/staff.schema";

export class StaffRepository {
  constructor(
    private readonly db: Db,
    private readonly clinicId: string
  ) {}

  private collection() {
    return this.db.collection<StaffDoc>("clc_staff");
  }

  async findByStaffId(staffId: string): Promise<WithId<StaffDoc> | null> {
    return this.collection().findOne({ clinicId: this.clinicId, staffId });
  }

  async list(query: {
    q?: string;
    position?: string;
    status?: string;
    skip: number;
    limit: number;
  }): Promise<[WithId<StaffDoc>[], number]> {
    const filter: Record<string, unknown> = {
      clinicId: this.clinicId,
      status: { $ne: "deleted" },
    };
    if (query.position) filter.position = query.position;
    if (query.status) filter.status = query.status;
    if (query.q) {
      filter.$or = [
        { name: { $regex: query.q, $options: "i" } },
        { position: { $regex: query.q, $options: "i" } },
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

  async insert(doc: Omit<StaffDoc, "_id" | "clinicId" | "createdAt" | "updatedAt">): Promise<WithId<StaffDoc>> {
    const now = nowFn();
    await this.collection().insertOne({
      ...doc,
      clinicId: this.clinicId,
      status: doc.status ?? "active",
      createdAt: now,
      updatedAt: now,
    } as never);
    return (await this.findByStaffId(doc.staffId)) as WithId<StaffDoc>;
  }

  async update(staffId: string, patch: Record<string, unknown>): Promise<boolean> {
    const result = await this.collection().updateOne(
      { clinicId: this.clinicId, staffId },
      { $set: { ...patch, updatedAt: nowFn() } }
    );
    return result.matchedCount === 1;
  }

  async softDelete(staffId: string): Promise<boolean> {
    const result = await this.collection().updateOne(
      { clinicId: this.clinicId, staffId },
      { $set: { status: "deleted", deletedAt: nowFn(), updatedAt: nowFn() } }
    );
    return result.matchedCount === 1;
  }
}