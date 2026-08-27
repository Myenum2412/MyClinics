import { now as nowFn } from "@/clinic/core/datetime";
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
import type { ClinicDoc, ClinicProfile, UserDoc } from "@/clinic/core/types";
import type { CreateClinicInput, UpdateClinicInput } from "@/clinic/modules/clinics/clinics.dto";
import { ClinicOwnRepository, ClinicRepository } from "@/clinic/modules/clinics/clinics.repository";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";

/** Merges a partial profile patch into the stored profile (preserves arrays/social links). */
function mergeProfile(
  current: ClinicProfile | undefined,
  patch: UpdateClinicInput["profile"]
): ClinicProfile {
  const base: ClinicProfile = {
    clinicType: current?.clinicType ?? null,
    registrationNumber: current?.registrationNumber ?? null,
    establishedYear: current?.establishedYear ?? null,
    whatsapp: current?.whatsapp ?? null,
    addressLine1: current?.addressLine1 ?? null,
    addressLine2: current?.addressLine2 ?? null,
    city: current?.city ?? null,
    state: current?.state ?? null,
    country: current?.country ?? null,
    pincode: current?.pincode ?? null,
    specializations: current?.specializations ?? [],
    services: current?.services ?? [],
    emergencyContact: current?.emergencyContact ?? null,
    gstNumber: current?.gstNumber ?? null,
    taxBusinessId: current?.taxBusinessId ?? null,
    socialMedia: {
      facebook: current?.socialMedia?.facebook ?? null,
      instagram: current?.socialMedia?.instagram ?? null,
      twitter: current?.socialMedia?.twitter ?? null,
      linkedin: current?.socialMedia?.linkedin ?? null,
    },
  };
  if (!patch) return base;

  return {
    clinicType: patch.clinicType !== undefined ? patch.clinicType : base.clinicType,
    registrationNumber:
      patch.registrationNumber !== undefined ? patch.registrationNumber : base.registrationNumber,
    establishedYear:
      patch.establishedYear !== undefined ? patch.establishedYear : base.establishedYear,
    whatsapp: patch.whatsapp !== undefined ? patch.whatsapp : base.whatsapp,
    addressLine1: patch.addressLine1 !== undefined ? patch.addressLine1 : base.addressLine1,
    addressLine2: patch.addressLine2 !== undefined ? patch.addressLine2 : base.addressLine2,
    city: patch.city !== undefined ? patch.city : base.city,
    state: patch.state !== undefined ? patch.state : base.state,
    country: patch.country !== undefined ? patch.country : base.country,
    pincode: patch.pincode !== undefined ? patch.pincode : base.pincode,
    specializations: patch.specializations ?? base.specializations,
    services: patch.services ?? base.services,
    emergencyContact:
      patch.emergencyContact !== undefined ? patch.emergencyContact : base.emergencyContact,
    gstNumber: patch.gstNumber !== undefined ? patch.gstNumber : base.gstNumber,
    taxBusinessId: patch.taxBusinessId !== undefined ? patch.taxBusinessId : base.taxBusinessId,
    socialMedia: {
      facebook: patch.socialMedia?.facebook !== undefined ? patch.socialMedia.facebook : base.socialMedia.facebook,
      instagram: patch.socialMedia?.instagram !== undefined ? patch.socialMedia.instagram : base.socialMedia.instagram,
      twitter: patch.socialMedia?.twitter !== undefined ? patch.socialMedia.twitter : base.socialMedia.twitter,
      linkedin: patch.socialMedia?.linkedin !== undefined ? patch.socialMedia.linkedin : base.socialMedia.linkedin,
    },
  };
}

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
        workingHours: { open: "09:00", close: "18:00", days: "Monday - Saturday" },
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
      authProvider: "password",
      role: "clinic_admin",
      doctorId: null,
      staffId: null,
      patientId: null,
      phone: input.phone ?? null,
      status: "active",
      lastLoginAt: null,
      createdAt: nowFn(),
      updatedAt: nowFn(),
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

  async getClinicStats(clinicId: string): Promise<{
    clinicId: string;
    doctors: number;
    staff: number;
    patients: number;
    appointments: number;
    medicalRecords: number;
    prescriptions: number;
    bills: number;
    users: number;
  }> {
    const clinic = await this.platformRepo().findById(clinicId);
    if (!clinic) throw new NotFoundError("Clinic not found");

    const [
      doctors,
      staff,
      patients,
      appointments,
      medicalRecords,
      prescriptions,
      bills,
      users,
    ] = await Promise.all([
      this.db.collection(CLINIC_COLLECTIONS.doctors).countDocuments({ clinicId }),
      this.db.collection(CLINIC_COLLECTIONS.staff).countDocuments({ clinicId }),
      this.db.collection(CLINIC_COLLECTIONS.patients).countDocuments({ clinicId }),
      this.db.collection(CLINIC_COLLECTIONS.appointments).countDocuments({ clinicId }),
      this.db.collection(CLINIC_COLLECTIONS.medicalRecords).countDocuments({ clinicId }),
      this.db.collection(CLINIC_COLLECTIONS.prescriptions).countDocuments({ clinicId }),
      this.db.collection(CLINIC_COLLECTIONS.bills).countDocuments({ clinicId }),
      this.db.collection(CLINIC_COLLECTIONS.users).countDocuments({ clinicId }),
    ]);

    return {
      clinicId,
      doctors,
      staff,
      patients,
      appointments,
      medicalRecords,
      prescriptions,
      bills,
      users,
    };
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
    if (input.profile !== undefined) {
      patch.profile = mergeProfile(existing.profile, input.profile);
    }
    if (input.profile?.addressLine1 !== undefined || input.profile?.addressLine2 !== undefined) {
      const a1 = input.profile.addressLine1 ?? existing.profile?.addressLine1 ?? null;
      const a2 = input.profile.addressLine2 ?? existing.profile?.addressLine2 ?? null;
      patch.address = [a1, a2].filter(Boolean).join(", ") || null;
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
    if (input.profile !== undefined) {
      patch.profile = mergeProfile(current.profile, input.profile);
    }
    if (input.profile?.addressLine1 !== undefined || input.profile?.addressLine2 !== undefined) {
      const a1 = input.profile.addressLine1 ?? current.profile?.addressLine1 ?? null;
      const a2 = input.profile.addressLine2 ?? current.profile?.addressLine2 ?? null;
      patch.address = [a1, a2].filter(Boolean).join(", ") || null;
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