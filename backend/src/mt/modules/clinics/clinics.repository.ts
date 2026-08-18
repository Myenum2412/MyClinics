import type { Db } from "mongodb";
import { MT_COLLECTIONS } from "@/mt/core/collections";
import type { TenantContext } from "@/mt/core/tenant-context";
import { TenantRepository } from "@/mt/core/tenant-repository";
import type { ClinicDoc } from "@/mt/modules/auth/auth.schema";
import { NotFoundError } from "@/mt/core/errors";
import { invalidateTenantCache } from "@/mt/core/tenant-scope";

export class ClinicRepository extends TenantRepository<ClinicDoc & { _id: unknown }> {
  constructor(db: Db, ctx: TenantContext) {
    super(db, MT_COLLECTIONS.clinics, ctx);
  }

  /** The caller's own clinic — the only clinic a tenant can ever read. */
  async findOwn(): Promise<ClinicDoc | null> {
    return this.collection.findOne(this.scoped({}));
  }

  async updateOwn(patch: Record<string, unknown>): Promise<ClinicDoc> {
    const clinic = await this.findOwn();
    if (!clinic) throw new NotFoundError("Clinic not found");

    await this.updateOne({}, { $set: { ...patch, updatedAt: new Date() } });
    const updated = await this.findOwn();
    if (!updated) throw new NotFoundError("Clinic not found");

    // Tenant-scope middleware caches user+clinic state for 30s; force a
    // refresh so name changes apply immediately.
    invalidateTenantCache(this.ctx.userId, this.ctx.clinicId);
    return updated;
  }
}

export function mapClinic(doc: ClinicDoc) {
  return {
    clinicId: doc.clinicId,
    slug: doc.slug,
    name: doc.name,
    phone: doc.phone ?? null,
    address: doc.address ?? null,
    status: doc.status,
    plan: doc.plan,
    createdAt: doc.createdAt,
  };
}