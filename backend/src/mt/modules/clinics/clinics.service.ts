import type { Db } from "mongodb";
import { writeAudit } from "@/mt/core/audit";
import { NotFoundError } from "@/mt/core/errors";
import type { TenantContext } from "@/mt/core/tenant-context";
import type { UpdateClinicInput } from "@/mt/modules/clinics/clinics.dto";
import { ClinicRepository } from "@/mt/modules/clinics/clinics.repository";
import type { ClinicDoc } from "@/mt/modules/auth/auth.schema";

export class ClinicService {
  constructor(private readonly db: Db) {}

  private repo(ctx: TenantContext): ClinicRepository {
    return new ClinicRepository(this.db, ctx);
  }

  async getOwnClinic(ctx: TenantContext): Promise<ClinicDoc> {
    const clinic = await this.repo(ctx).findOwn();
    if (!clinic) throw new NotFoundError("Clinic not found");
    return clinic;
  }

  async updateOwnClinic(ctx: TenantContext, input: UpdateClinicInput): Promise<ClinicDoc> {
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.phone !== undefined) patch.phone = input.phone;
    if (input.address !== undefined) patch.address = input.address;

    const clinic = await this.repo(ctx).updateOwn(patch);

    await writeAudit(this.db, ctx, {
      action: "update",
      entity: "clinic",
      entityId: ctx.clinicId,
      metadata: { fields: Object.keys(patch) },
    });

    return clinic;
  }
}