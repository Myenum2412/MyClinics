import type { Db } from "mongodb";
import { MT_COLLECTIONS } from "@/mt/core/collections";
import type { TenantContext } from "@/mt/core/tenant-context";
import { TenantRepository } from "@/mt/core/tenant-repository";
import type { PrescriptionDoc } from "@/mt/modules/prescriptions/prescriptions.schema";

export class PrescriptionRepository extends TenantRepository<PrescriptionDoc> {
  constructor(db: Db, ctx: TenantContext) {
    super(db, MT_COLLECTIONS.prescriptions, ctx);
  }

  async findByPrescriptionId(prescriptionId: string): Promise<PrescriptionDoc | null> {
    return this.collection.findOne(this.scoped({ prescriptionId }));
  }

  async listByPatient(
    patientId: string,
    options: { skip: number; limit: number }
  ): Promise<{ items: PrescriptionDoc[]; total: number }> {
    const [items, total] = await Promise.all([
      this.collection
        .find(this.scoped({ patientId }))
        .sort({ createdAt: -1 })
        .skip(options.skip)
        .limit(options.limit)
        .toArray(),
      this.collection.countDocuments(this.scoped({ patientId })),
    ]);
    return { items, total };
  }
}