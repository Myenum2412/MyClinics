import type { Db, WithId } from "mongodb";
import { writeAudit } from "@/clinic/core/audit";
import { requireClinicOf, type ClinicContext } from "@/clinic/core/context";
import { ForbiddenError, NotFoundError } from "@/clinic/core/errors";
import { generateStaffId } from "@/clinic/core/ids";
import type { CreateStaffInput, UpdateStaffInput } from "@/clinic/modules/staff/staff.dto";
import { StaffRepository } from "@/clinic/modules/staff/staff.repository";
import type { StaffDoc } from "@/clinic/modules/staff/staff.schema";

export class StaffService {
  constructor(private readonly db: Db) {}

  private repo(ctx: ClinicContext): StaffRepository {
    return new StaffRepository(this.db, requireClinicOf(ctx));
  }

  async createStaff(ctx: ClinicContext, input: CreateStaffInput): Promise<WithId<StaffDoc>> {
    const staff = await this.repo(ctx).insert({
      staffId: generateStaffId(),
      userId: null,
      name: input.name,
      position: input.position,
      phone: input.phone ?? null,
      email: input.email ?? null,
      joinedAt: input.joinedAt ?? null,
      status: input.status ?? "active",
      createdBy: ctx.userId,
    });

    await writeAudit(this.db, ctx, {
      action: "create",
      entity: "staff",
      entityId: staff.staffId,
      metadata: { name: staff.name, position: staff.position },
    });
    return staff;
  }

  async getStaff(ctx: ClinicContext, staffId: string): Promise<WithId<StaffDoc>> {
    const staff = await this.repo(ctx).findByStaffId(staffId);
    if (!staff) throw new NotFoundError("Staff member not found");
    return staff;
  }

  async listStaff(
    ctx: ClinicContext,
    query: { q?: string; position?: string; status?: string; skip: number; limit: number }
  ) {
    const [items, total] = await this.repo(ctx).list(query);
    return { items, total };
  }

  async updateStaff(
    ctx: ClinicContext,
    staffId: string,
    input: UpdateStaffInput
  ): Promise<WithId<StaffDoc>> {
    // A staff member may only edit their OWN profile.
    if (ctx.role === "staff") {
      const own = await this.repo(ctx).findByStaffId(ctx.role === "staff" ? staffId : "");
      if (!own || own.userId !== ctx.userId) {
        throw new ForbiddenError("Staff members may only edit their own profile");
      }
    }

    const existing = await this.repo(ctx).findByStaffId(staffId);
    if (!existing) throw new NotFoundError("Staff member not found");

    const patch: Record<string, unknown> = {};
    for (const key of ["name", "position", "phone", "email", "joinedAt", "status"] as const) {
      const value = input[key];
      if (value !== undefined) patch[key] = value;
    }
    if (Object.keys(patch).length === 0) return existing;

    await this.repo(ctx).update(staffId, patch);

    await writeAudit(this.db, ctx, {
      action: "update",
      entity: "staff",
      entityId: staffId,
      metadata: { fields: Object.keys(patch) },
    });

    const updated = await this.repo(ctx).findByStaffId(staffId);
    return updated ?? existing;
  }

  async deleteStaff(ctx: ClinicContext, staffId: string): Promise<void> {
    const existing = await this.repo(ctx).findByStaffId(staffId);
    if (!existing) throw new NotFoundError("Staff member not found");

    await this.repo(ctx).softDelete(staffId);

    await writeAudit(this.db, ctx, {
      action: "delete",
      entity: "staff",
      entityId: staffId,
      metadata: { name: existing.name },
    });
  }
}