import bcrypt from "bcryptjs";
import type { Db, WithId } from "mongodb";
import { writeAudit } from "@/clinic/core/audit";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import { requireClinicOf, type ClinicContext } from "@/clinic/core/context";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "@/clinic/core/errors";
import { generatePatientId, generateUserId, randomToken } from "@/clinic/core/ids";
import type { UserDoc } from "@/clinic/core/types";
import type {
  AssignPatientInput,
  CreatePatientInput,
  UpdatePatientInput,
} from "@/clinic/modules/patients/patients.dto";
import { PatientRepository } from "@/clinic/modules/patients/patients.repository";
import type { PatientDoc } from "@/clinic/modules/patients/patients.schema";

export class PatientService {
  constructor(private readonly db: Db) {}

  private repo(ctx: ClinicContext): PatientRepository {
    return new PatientRepository(this.db, requireClinicOf(ctx), {
      role: ctx.role,
      doctorId: ctx.doctorId,
      patientId: ctx.patientId,
    });
  }

  /**
   * Creates a patient inside the caller's clinic. If email + password are
   * supplied, a portal account (users, role=patient) is created and linked
   * via `userId` / `patientId`. The patientId is stamped on the account so
   * the patient's JWT can prove ownership.
   */
  async createPatient(ctx: ClinicContext, input: CreatePatientInput): Promise<WithId<PatientDoc>> {
    const clinicId = requireClinicOf(ctx);
    const patientId = generatePatientId();
    const now = new Date();

    if (input.doctorId) {
      const doctorExists = await this.db
        .collection(CLINIC_COLLECTIONS.doctors)
        .findOne({ clinicId, doctorId: input.doctorId, status: { $ne: "deleted" } });
      if (!doctorExists) {
        throw new BadRequestError("The assigned doctor does not exist in this clinic");
      }
    }

    const doc: Omit<PatientDoc, "clinicId"> = {
      patientId,
      doctorId: input.doctorId ?? null,
      userId: null,
      fullName: input.fullName,
      mobile: input.mobile,
      email: input.email ?? null,
      gender: input.gender ?? null,
      dateOfBirth: input.dateOfBirth ?? null,
      bloodGroup: input.bloodGroup ?? null,
      address: input.address ?? null,
      city: input.city ?? null,
      pincode: input.pincode ?? null,
      allergies: input.allergies ?? [],
      notes: input.notes ?? null,
      status: "active",
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
    };

    if (input.email && input.password) {
      const users = this.db.collection<UserDoc>(CLINIC_COLLECTIONS.users);
      const existing = await users.findOne({ email: input.email });
      if (existing) {
        throw new ConflictError("An account with this email already exists");
      }
      const passwordHash = await bcrypt.hash(input.password, 12);
      const userId = generateUserId();
      try {
        await users.insertOne({
          clinicId,
          userId,
          name: input.fullName,
          email: input.email,
          passwordHash,
          authProvider: "password",
          role: "patient",
          doctorId: null,
          staffId: null,
          patientId,
          phone: input.mobile,
          status: "active",
          lastLoginAt: null,
          createdAt: now,
          updatedAt: now,
        } as never);
        doc.userId = userId;
      } catch (error) {
        if ((error as { code?: number }).code === 11000) {
          throw new ConflictError("An account with this email already exists");
        }
        throw error;
      }
    }

    const created = await this.repo(ctx).insert(doc as never);

    await writeAudit(this.db, ctx, {
      action: "create",
      entity: "patient",
      entityId: created.patientId,
      metadata: { fullName: created.fullName, mobile: created.mobile, doctorId: created.doctorId },
    });

    return created;
  }

  async getPatientById(ctx: ClinicContext, patientId: string): Promise<WithId<PatientDoc>> {
    // Patients may only ever read their own record. 404 hides existence.
    if (ctx.role === "patient" && patientId !== ctx.patientId) {
      throw new NotFoundError("Patient not found");
    }
    const patient = await this.repo(ctx).findByPatientId(patientId);
    if (!patient) throw new NotFoundError("Patient not found");
    return patient;
  }

  async listPatients(
    ctx: ClinicContext,
    query: { q?: string; doctorId?: string; status?: string; skip: number; limit: number }
  ) {
    const [items, total] = await this.repo(ctx).list(query);
    return { items, total };
  }

  async updatePatient(
    ctx: ClinicContext,
    patientId: string,
    input: UpdatePatientInput
  ): Promise<WithId<PatientDoc>> {
    const repo = this.repo(ctx);
    const patient = await repo.findByPatientId(patientId);
    if (!patient) {
      throw new NotFoundError("Patient not found");
    }

    // Patients may only ever edit their own profile. 404 hides existence.
    if (ctx.role === "patient" && patient.patientId !== ctx.patientId) {
      throw new NotFoundError("Patient not found");
    }

    const patch: Record<string, unknown> = {};
    for (const key of [
      "fullName",
      "mobile",
      "gender",
      "dateOfBirth",
      "bloodGroup",
      "address",
      "city",
      "pincode",
      "allergies",
      "notes",
    ] as const) {
      const value = input[key];
      if (value !== undefined) patch[key] = value;
    }
    if (input.email !== undefined) patch.email = input.email;

    if (Object.keys(patch).length === 0) {
      throw new ConflictError("No fields to update");
    }

    const result = await repo.update(patientId, patch);
    if (!result) throw new NotFoundError("Patient not found");

    await writeAudit(this.db, ctx, {
      action: "update",
      entity: "patient",
      entityId: patientId,
      metadata: { fields: Object.keys(patch) },
    });

    const updated = await repo.findByPatientId(patientId);
    return updated ?? patient;
  }

  /** Reassigns a patient to another doctor (or unassigns). */
  async assignPatient(
    ctx: ClinicContext,
    patientId: string,
    input: AssignPatientInput
  ): Promise<WithId<PatientDoc>> {
    const clinicId = requireClinicOf(ctx);
    const repo = this.repo(ctx);
    const patient = await repo.findByPatientId(patientId);
    if (!patient) throw new NotFoundError("Patient not found");

    if (input.doctorId) {
      const doctorExists = await this.db
        .collection(CLINIC_COLLECTIONS.doctors)
        .findOne({ clinicId, doctorId: input.doctorId, status: { $ne: "deleted" } });
      if (!doctorExists) {
        throw new BadRequestError("The assigned doctor does not exist in this clinic");
      }
    }

    const ok = await repo.assignDoctor(patientId, input.doctorId);
    if (!ok) throw new NotFoundError("Patient not found");

    await writeAudit(this.db, ctx, {
      action: "assign",
      entity: "patient",
      entityId: patientId,
      metadata: { fromDoctorId: patient.doctorId, toDoctorId: input.doctorId },
    });

    const updated = await repo.findByPatientId(patientId);
    return updated ?? patient;
  }

  async deletePatient(ctx: ClinicContext, patientId: string): Promise<void> {
    const repo = this.repo(ctx);
    const patient = await repo.findByPatientId(patientId);
    if (!patient) throw new NotFoundError("Patient not found");

    await repo.softDelete(patientId);

    // Deactivate the linked portal account, if any.
    if (patient.userId) {
      await this.db
        .collection(CLINIC_COLLECTIONS.users)
        .updateOne(
          { clinicId: requireClinicOf(ctx), userId: patient.userId },
          { $set: { status: "deleted", deletedAt: new Date() } }
        );
    }

    await writeAudit(this.db, ctx, {
      action: "delete",
      entity: "patient",
      entityId: patientId,
      metadata: { fullName: patient.fullName },
    });
  }
}

export { randomToken };