import bcrypt from "bcryptjs";
import type { Db, WithId } from "mongodb";
import { writeAudit } from "@/clinic/core/audit";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import { requireClinicOf, type ClinicContext } from "@/clinic/core/context";
import { ForbiddenError, NotFoundError } from "@/clinic/core/errors";
import { generateUserId, normalizeEmail, randomToken } from "@/clinic/core/ids";
import { now as nowFn } from "@/clinic/core/datetime";
import type { CreateLabInput, UpdateLabInput } from "@/clinic/modules/labs/labs.dto";
import { LabRepository } from "@/clinic/modules/labs/labs.repository";
import type { LabDoc } from "@/clinic/modules/labs/labs.schema";
import type { UserDoc } from "@/clinic/core/types";

function generateLabId(): string { return `lab_${randomToken(12)}`; }

export class LabService {
  constructor(private readonly db: Db) {}
  private repo(ctx: ClinicContext): LabRepository { return new LabRepository(this.db, requireClinicOf(ctx)); }

  async createLab(ctx: ClinicContext, input: CreateLabInput): Promise<WithId<LabDoc>> {
    const lab = await this.repo(ctx).insert({
      labId: generateLabId(),
      labName: input.labName,
      contactPerson: input.contactPerson ?? null,
      phone: input.phone ?? null,
      email: input.email ? normalizeEmail(input.email) : null,
      address: input.address ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      pincode: input.pincode ?? null,
      licenseNo: input.licenseNo ?? null,
      labType: input.labType ?? null,
      userId: null,
      status: input.status ?? "active",
      createdBy: ctx.userId,
    });

    // Create lab_technician user if email provided
    let userId: string | null = null;
    if (input.email && input.password) {
      const email = normalizeEmail(input.email);
      const existing = await this.db.collection<UserDoc>(CLINIC_COLLECTIONS.users).findOne({ email });
      if (!existing || existing.status === "deleted") {
        const passwordHash = await bcrypt.hash(input.password, 12);
        const now = nowFn();
        const uid = existing?.userId ?? generateUserId();
        userId = uid;
        const doc: UserDoc = {
          clinicId: requireClinicOf(ctx),
          userId: uid,
          name: input.contactPerson ?? input.labName,
          email,
          passwordHash,
          authProvider: "password",
          role: "lab_technician",
          doctorId: null,
          staffId: null,
          patientId: null,
          phone: input.phone ?? null,
          status: "active",
          lastLoginAt: null,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        } as unknown as UserDoc;
        if (existing) await this.db.collection(CLINIC_COLLECTIONS.users).replaceOne({ _id: existing._id }, doc as never);
        else await this.db.collection(CLINIC_COLLECTIONS.users).insertOne(doc as never);
        await this.db.collection(CLINIC_COLLECTIONS.labs).updateOne({ clinicId: requireClinicOf(ctx), labId: lab.labId }, { $set: { userId: uid } });
      }
    }

    await writeAudit(this.db, ctx, { action: "create", entity: "lab", entityId: lab.labId, metadata: { labName: lab.labName } });
    if (userId) return { ...lab, userId } as WithId<LabDoc>;
    return lab;
  }

  async getLab(ctx: ClinicContext, labId: string): Promise<WithId<LabDoc>> {
    const lab = await this.repo(ctx).findByLabId(labId);
    if (!lab) throw new NotFoundError("Lab not found");
    return lab;
  }

  async listLabs(ctx: ClinicContext, query: { q?: string; status?: string; skip: number; limit: number }) {
    const [items, total] = await this.repo(ctx).list(query);
    return { items, total };
  }

  async updateLab(ctx: ClinicContext, labId: string, input: UpdateLabInput): Promise<WithId<LabDoc>> {
    const existing = await this.repo(ctx).findByLabId(labId);
    if (!existing) throw new NotFoundError("Lab not found");
    const patch: Record<string, unknown> = {};
    for (const k of ["labName","contactPerson","phone","email","address","city","state","pincode","licenseNo","labType","status"] as const) {
      if (input[k] !== undefined) patch[k] = input[k];
    }
    if (Object.keys(patch).length === 0) return existing;
    await this.repo(ctx).update(labId, patch);
    await writeAudit(this.db, ctx, { action: "update", entity: "lab", entityId: labId, metadata: { fields: Object.keys(patch) } });
    return (await this.repo(ctx).findByLabId(labId)) ?? existing;
  }

  async deleteLab(ctx: ClinicContext, labId: string): Promise<void> {
    if (ctx.role !== "clinic_admin") throw new ForbiddenError("Only clinic admin can remove labs");
    const existing = await this.repo(ctx).findByLabId(labId);
    if (!existing) throw new NotFoundError("Lab not found");
    await this.repo(ctx).softDelete(labId);
    if (existing.userId) {
      await this.db.collection(CLINIC_COLLECTIONS.users).updateOne({ clinicId: requireClinicOf(ctx), userId: existing.userId }, { $set: { status: "deleted", deletedAt: nowFn(), updatedAt: nowFn() } });
    }
    await writeAudit(this.db, ctx, { action: "delete", entity: "lab", entityId: labId, metadata: { labName: existing.labName } });
  }
}
