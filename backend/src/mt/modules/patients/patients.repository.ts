import type { Db } from "mongodb";
import { MT_COLLECTIONS } from "@/mt/core/collections";
import type { TenantContext } from "@/mt/core/tenant-context";
import { TenantRepository } from "@/mt/core/tenant-repository";
import type { PatientDoc } from "@/mt/modules/patients/patients.schema";

export class PatientRepository extends TenantRepository<PatientDoc> {
  constructor(db: Db, ctx: TenantContext) {
    super(db, MT_COLLECTIONS.patients, ctx);
  }

  /** Finds a patient by its PUBLIC patientId — always inside the tenant scope. */
  async findByPatientId(patientId: string): Promise<PatientDoc | null> {
    return this.collection.findOne(this.scoped({ patientId }));
  }

  /** The caller's own patient record (role = patient). Null when none. */
  async findByUserId(userId: string): Promise<PatientDoc | null> {
    return this.collection.findOne(this.scoped({ userId }));
  }

  async search(
    q: string | undefined,
    options: { skip: number; limit: number }
  ): Promise<{ items: PatientDoc[]; total: number }> {
    const filter = q
      ? {
          $or: [
            { fullName: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
            { mobile: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") } },
            { email: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      this.collection
        .find(this.scoped(filter))
        .sort({ createdAt: -1 })
        .skip(options.skip)
        .limit(options.limit)
        .toArray(),
      this.collection.countDocuments(this.scoped(filter)),
    ]);
    return { items, total };
  }
}