import type { Db } from "mongodb";
import { MT_COLLECTIONS } from "@/mt/core/collections";
import type { TenantContext } from "@/mt/core/tenant-context";
import { TenantRepository } from "@/mt/core/tenant-repository";
import type { MedicalRecordDoc } from "@/mt/modules/medical-records/medical-records.schema";

export class MedicalRecordRepository extends TenantRepository<MedicalRecordDoc> {
  constructor(db: Db, ctx: TenantContext) {
    super(db, MT_COLLECTIONS.medicalRecords, ctx);
  }

  async findByRecordId(recordId: string): Promise<MedicalRecordDoc | null> {
    return this.collection.findOne(this.scoped({ recordId }));
  }

  async listByPatient(
    patientId: string,
    options: { skip: number; limit: number }
  ): Promise<{ items: MedicalRecordDoc[]; total: number }> {
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