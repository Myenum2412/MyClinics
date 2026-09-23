import { now as nowFn } from "@/clinic/core/datetime";
import type { Db, WithId } from "mongodb";
import type { LabDoc } from "@/clinic/modules/labs/labs.schema";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";

export class LabRepository {
  constructor(private readonly db: Db, private readonly clinicId: string) {}
  private collection() { return this.db.collection<LabDoc>(CLINIC_COLLECTIONS.labs); }
  async findByLabId(labId: string): Promise<WithId<LabDoc> | null> {
    return this.collection().findOne({ clinicId: this.clinicId, labId });
  }
  async list(query: { q?: string; status?: string; skip: number; limit: number }): Promise<[WithId<LabDoc>[], number]> {
    const filter: Record<string, unknown> = { clinicId: this.clinicId, status: { $ne: "deleted" } };
    if (query.status) filter.status = query.status;
    if (query.q) filter.$or = [{ labName: { $regex: query.q, $options: "i" } }, { contactPerson: { $regex: query.q, $options: "i" } }, { licenseNo: { $regex: query.q, $options: "i" } }];
    const [items, total] = await Promise.all([
      this.collection().find(filter).sort({ createdAt: -1 }).skip(query.skip).limit(query.limit).toArray(),
      this.collection().countDocuments(filter),
    ]);
    return [items, total];
  }
  async insert(doc: Omit<LabDoc, "_id" | "clinicId" | "createdAt" | "updatedAt">): Promise<WithId<LabDoc>> {
    const now = nowFn();
    await this.collection().insertOne({ ...doc, clinicId: this.clinicId, createdAt: now, updatedAt: now } as never);
    return (await this.findByLabId(doc.labId)) as WithId<LabDoc>;
  }
  async update(labId: string, patch: Record<string, unknown>): Promise<boolean> {
    const result = await this.collection().updateOne({ clinicId: this.clinicId, labId }, { $set: { ...patch, updatedAt: nowFn() } });
    return result.matchedCount === 1;
  }
  async softDelete(labId: string): Promise<boolean> {
    const result = await this.collection().updateOne({ clinicId: this.clinicId, labId }, { $set: { status: "deleted", deletedAt: nowFn(), updatedAt: nowFn() } });
    return result.matchedCount === 1;
  }
}
