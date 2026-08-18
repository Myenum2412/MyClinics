import bcrypt from "bcryptjs";
import type { Db, WithId } from "mongodb";
import { writeAudit } from "@/clinic/core/audit";
import {
  ConflictError,
  NotFoundError,
} from "@/clinic/core/errors";
import {
  generateClinicId,
  generateUserId,
  normalizeEmail,
  slugify,
} from "@/clinic/core/ids";
import { requireClinicOf, type ClinicContext } from "@/clinic/core/context";
import type { ClinicDoc, UserDoc } from "@/clinic/core/types";
import type { CreateClinicInput, UpdateClinicInput } from "@/clinic/modules/clinics/clinics.dto";
import { ClinicOwnRepository, ClinicRepository } from "@/clinic/modules/clinics/clinics.repository";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";

export class ClinicService {
  constructor(private readonly db: Db) {}

  private platformRepo() {
    return new ClinicRepository(this.db);
  }

  private ownRepo(ctx: ClinicContext) {
    return new ClinicOwnRepository(this.db, requireClinicOf(ctx));
  }

  // ── Platform admin operations ──────────────────────────────────────────

  async listClinics(query: { status?: string; q?: string; skip: number; limit: number }, ctx: ClinicContext) {
    const repo = this.platformRepo();
    const [items, total] = await Promise.all([
      repo.list(query),
      repo.count(query),
    ]);
    await writeAudit(this.db, ctx, {
      action: "list",
      entity: "clinic",
      entityId: null,
      metadata: { scope: "platform" },
    });
    return { items, total };
  }

  async createClinic(input: CreateClinicInput, ctx: ClinicContext): Promise<WithId<ClinicDoc>> {
    const email = normalizeEmail(input.email);
    const existing = await this.db
      .collection<UserDoc>(CLINIC_COLLECTIONS.users)
      .findOne({ email });
    if (existing) {
      throw new ConflictError("An account with this email already exists");
    }

    const clinicId = generateClinicId();
    const userId = generateUserId();
    const passwordHash = await bcrypt.hash(input.password, 12);

    const clinic = await this.platformRepo().create({
      clinicId,
      slug: slugify(input.name),
      name: input.name,
      phone: input.phone ?? null,
      email: null,
      address: null,
      website: null,
      description: null,
      status: "active",
      settings: {
        workingHours: { open: "09:00", close: "18:00" },
        slotMinutes: 30,
        currency: "INR",
        timezone: "Asia/Kolkata",
      },
    });

    const userDoc: UserDoc = {
      clinicId,
      userId,
      name: input.adminName,
      email,
      passwordHash,
      role: "clinic_admin",
      doctorId: null,
      staffId: null,
      patientId: null,
      phone: input.phone ?? null,
      status: "active",
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.db.collection<UserDoc>(CLINIC_COLLECTIONS.users).insertOne(userDoc as never);

    await writeAudit(this.db, ctx, {
      action: "create",
      entity: "clinic",
      entityId: clinicId,
      metadata: { name: input.name, email, actorUserId: userId },
    });

    return clinic;
  }

  async getClinic(clinicId: string): Promise<WithId<ClinicDoc>> {
    const clinic = await this.platformRepo().findById(clinicId);
    if (!clinic) throw new NotFoundError("Clinic not found");
    return clinic;
  }

  async updateClinic(
    clinicId: string,
    input: UpdateClinicInput,
    ctx: ClinicContext
  ): Promise<WithId<ClinicDoc>> {
    const existing = await this.platformRepo().findById(clinicId);
    if (!existing) throw new NotFoundError("Clinic not found");

    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.phone !== undefined) patch.phone = input.phone;
    if (input.email !== undefined) patch.email = input.email;
    if (input.address !== undefined) patch.address = input.address;
    if (input.website !== undefined) patch.website = input.website;
    if (input.description !== undefined) patch.description = input.description;
    if (input.status !== undefined) patch.status = input.status;
    if (input.settings !== undefined) {
      const current = existing.settings ?? {};
      patch.settings = {
        ...current,
        ...input.settings,
        workingHours: input.settings.workingHours ?? current.workingHours,
      };
    }

    const clinic = await this.platformRepo().update(clinicId, patch);
    if (!clinic) throw new NotFoundError("Clinic not found");

    await writeAudit(this.db, ctx, {
      action: "update",
      entity: "clinic",
      entityId: clinicId,
      metadata: { fields: Object.keys(patch) },
    });
    return clinic;
  }

  async setClinicStatus(
    clinicId: string,
    status: "active" | "suspended",
    ctx: ClinicContext
  ): Promise<void> {
    const ok = await this.platformRepo().updateStatus(clinicId, status);
    if (!ok) throw new NotFoundError("Clinic not found");
    await writeAudit(this.db, ctx, {
      action: status === "suspended" ? "suspend" : "activate",
      entity: "clinic",
      entityId: clinicId,
    });
  }

  // ── Clinic member operations (scoped to own session clinic) ────────────

  async getOwnClinic(ctx: ClinicContext): Promise<WithId<ClinicDoc>> {
    const clinic = await this.ownRepo(ctx).findOwn();
    if (!clinic) throw new NotFoundError("Clinic not found");
    return clinic;
  }

  async updateOwnClinic(ctx: ClinicContext, input: UpdateClinicInput): Promise<WithId<ClinicDoc>> {
    const current = await this.ownRepo(ctx).findOwn();
    if (!current) throw new NotFoundError("Clinic not found");

    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.phone !== undefined) patch.phone = input.phone;
    if (input.email !== undefined) patch.email = input.email;
    if (input.address !== undefined) patch.address = input.address;
    if (input.website !== undefined) patch.website = input.website;
    if (input.description !== undefined) patch.description = input.description;
    if (input.settings !== undefined) {
      patch.settings = {
        ...current.settings,
        ...input.settings,
        workingHours: input.settings.workingHours ?? current.settings.workingHours,
      };
    }

    const clinic = await this.ownRepo(ctx).updateOwn(patch);
    if (!clinic) throw new NotFoundError("Clinic not found");

    await writeAudit(this.db, ctx, {
      action: "update",
      entity: "clinic",
      entityId: ctx.clinicId!,
      metadata: { fields: Object.keys(patch) },
    });
    return clinic;
  }
}