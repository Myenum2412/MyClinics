import type { Db, WithId } from "mongodb";
import { writeAudit } from "@/clinic/core/audit";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import { requireClinicOf, type ClinicContext } from "@/clinic/core/context";
import { ForbiddenError, NotFoundError } from "@/clinic/core/errors";
import { generateDoctorId } from "@/clinic/core/ids";
import type { CreateDoctorInput, UpdateDoctorInput } from "@/clinic/modules/doctors/doctors.dto";
import { DoctorRepository } from "@/clinic/modules/doctors/doctors.repository";
import type { DoctorDoc } from "@/clinic/modules/doctors/doctors.schema";
import {
  notifyDoctorRegistered,
  notifyDoctorUpdated,
} from "@/services/whatsapp/save-notification.service";

export class DoctorService {
  constructor(private readonly db: Db) {}

  private repo(ctx: ClinicContext): DoctorRepository {
    return new DoctorRepository(this.db, requireClinicOf(ctx));
  }

  async createDoctor(ctx: ClinicContext, input: CreateDoctorInput): Promise<WithId<DoctorDoc>> {
    const now = new Date();
    const doctor = await this.repo(ctx).insert({
      doctorId: generateDoctorId(),
      userId: null,
      name: input.name,
      specialization: input.specialization,
      licenseNo: input.licenseNo ?? null,
      qualification: input.qualification ?? null,
      phone: input.phone ?? null,
      whatsapp: input.whatsapp ?? null,
      email: input.email ?? null,
      fee: input.fee ?? null,
      schedule: input.schedule ?? [],
      status: input.status ?? "active",
      gender: input.gender ?? null,
      dateOfBirth: input.dateOfBirth ?? null,
      nationality: input.nationality ?? null,
      address: input.address ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      pincode: input.pincode ?? null,
      experienceYears: input.experienceYears ?? null,
      registrationNo: input.registrationNo ?? null,
      issuingAuthority: input.issuingAuthority ?? null,
      department: input.department ?? null,
      about: input.about ?? null,
      languages: input.languages ?? null,
      notes: input.notes ?? null,
      username: input.username ?? null,
      allowLogin: input.allowLogin ?? null,
      profileImage: input.profileImage ?? null,
      scheduleDays: input.scheduleDays ?? null,
      createdBy: ctx.userId,
    });

    await writeAudit(this.db, ctx, {
      action: "create",
      entity: "doctor",
      entityId: doctor.doctorId,
      metadata: { name: doctor.name, specialization: doctor.specialization },
    });

    // Notify the doctor that their profile was created.
    await notifyDoctorRegistered(this.db, doctor, requireClinicOf(ctx));

    return doctor;
  }

  async getDoctor(ctx: ClinicContext, doctorId: string): Promise<WithId<DoctorDoc>> {
    const doctor = await this.repo(ctx).findByDoctorId(doctorId);
    if (!doctor) throw new NotFoundError("Doctor not found");
    return doctor;
  }

  async listDoctors(
    ctx: ClinicContext,
    query: { q?: string; specialization?: string; status?: string; skip: number; limit: number }
  ) {
    const [items, total] = await this.repo(ctx).list(query);
    return { items, total };
  }

  async updateDoctor(
    ctx: ClinicContext,
    doctorId: string,
    input: UpdateDoctorInput
  ): Promise<WithId<DoctorDoc>> {
    // A doctor may only edit their OWN profile; clinic_admin edits any.
    if (ctx.role === "doctor" && ctx.doctorId !== doctorId) {
      throw new ForbiddenError("Doctors may only edit their own profile");
    }

    const existing = await this.repo(ctx).findByDoctorId(doctorId);
    if (!existing) throw new NotFoundError("Doctor not found");

    const patch: Record<string, unknown> = {};
    for (const key of [
      "name",
      "specialization",
      "licenseNo",
      "qualification",
      "phone",
      "whatsapp",
      "email",
      "fee",
      "schedule",
      "status",
      "gender",
      "dateOfBirth",
      "nationality",
      "address",
      "city",
      "state",
      "pincode",
      "experienceYears",
      "registrationNo",
      "issuingAuthority",
      "department",
      "about",
      "languages",
      "notes",
      "username",
      "allowLogin",
      "profileImage",
      "scheduleDays",
    ] as const) {
      const value = input[key];
      if (value !== undefined) patch[key] = value;
    }
    if (Object.keys(patch).length === 0) return existing;

    await this.repo(ctx).update(doctorId, patch);

    await writeAudit(this.db, ctx, {
      action: "update",
      entity: "doctor",
      entityId: doctorId,
      metadata: { fields: Object.keys(patch) },
    });

    const updated = await this.repo(ctx).findByDoctorId(doctorId);
    const saved = updated ?? existing;

    // Notify the doctor that their profile changed.
    await notifyDoctorUpdated(this.db, saved, requireClinicOf(ctx));

    return saved;
  }

  async deleteDoctor(ctx: ClinicContext, doctorId: string): Promise<void> {
    if (ctx.role !== "clinic_admin") {
      throw new ForbiddenError("Only the clinic admin can remove doctors");
    }
    const clinicId = requireClinicOf(ctx);
    const existing = await this.repo(ctx).findByDoctorId(doctorId);
    if (!existing) throw new NotFoundError("Doctor not found");

    await this.repo(ctx).softDelete(doctorId);

    // Deactivate the doctor's login account so it can no longer sign in and
    // its email is freed for reuse when the doctor is re-created.
    await this.db
      .collection(CLINIC_COLLECTIONS.users)
      .updateMany(
        { clinicId, role: "doctor", doctorId },
        { $set: { status: "deleted", deletedAt: new Date(), updatedAt: new Date() } }
      );

    await writeAudit(this.db, ctx, {
      action: "delete",
      entity: "doctor",
      entityId: doctorId,
      metadata: { name: existing.name },
    });
  }
}