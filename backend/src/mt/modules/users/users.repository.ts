import type { Db } from "mongodb";
import { MT_COLLECTIONS } from "@/mt/core/collections";
import type { TenantContext } from "@/mt/core/tenant-context";
import { TenantRepository } from "@/mt/core/tenant-repository";
import type { MtUserDoc } from "@/mt/modules/auth/auth.schema";
import { invalidateTenantCache } from "@/mt/core/tenant-scope";

export class UserRepository extends TenantRepository<MtUserDoc> {
  constructor(db: Db, ctx: TenantContext) {
    super(db, MT_COLLECTIONS.users, ctx);
  }

  async findByUserId(userId: string): Promise<MtUserDoc | null> {
    return this.collection.findOne(this.scoped({ userId }));
  }

  async list(options: { skip: number; limit: number }): Promise<{ items: MtUserDoc[]; total: number }> {
    const [items, total] = await Promise.all([
      this.collection
        .find(this.scoped({}))
        .sort({ createdAt: -1 })
        .skip(options.skip)
        .limit(options.limit)
        .toArray(),
      this.collection.countDocuments(this.scoped({})),
    ]);
    return { items, total };
  }

  async updateStatus(userId: string, status: "active" | "inactive"): Promise<void> {
    await this.updateOne({ userId }, { $set: { status, updatedAt: new Date() } });
    invalidateTenantCache(userId, this.ctx.clinicId);
  }
}

export function mapUser(doc: Record<string, unknown>) {
  return {
    userId: doc.userId,
    clinicId: doc.clinicId,
    name: doc.name,
    email: doc.email,
    role: doc.role,
    phone: doc.phone ?? null,
    status: doc.status,
    patientId: doc.patientId ?? null,
    lastLoginAt: doc.lastLoginAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}