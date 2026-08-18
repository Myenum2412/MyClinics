import bcrypt from "bcryptjs";
import type { Db } from "mongodb";
import { writeAudit } from "@/mt/core/audit";
import { MT_COLLECTIONS } from "@/mt/core/collections";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/mt/core/errors";
import { generateUserId, randomToken } from "@/mt/core/ids";
import { isStaffContext, type TenantContext } from "@/mt/core/tenant-context";
import type { CreatePatientInput, UpdatePatientInput } from "@/mt/modules/patients/patients.dto";
import { PatientRepository } from "@/mt/modules/patients/patients.repository";
import type { PatientDoc } from "@/mt/modules/patients/patients.schema";

export class PatientService {
  constructor(private readonly db: Db) {}

  private repo(ctx: TenantContext): PatientRepository {
    return new PatientRepository(this.db, ctx);
  }

  /**
   * Creates a patient inside the caller's clinic. If email + password are
   * supplied, a portal account (mt_users, role=patient) is created and
   * linked via `userId` / `patientId`. The patientId is returned and stamped
   * on the account so the patient's JWT can prove ownership.
   */
  async createPatient(ctx: TenantContext, input: CreatePatientInput): Promise<PatientDoc> {
    const repo = this.repo(ctx);
    const patientId = `pat_${randomToken(16)}`;
    const now = new Date();

    const doc: Omit<PatientDoc, "clinicId"> = {
      patientId,
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
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
    };

    if (input.email && input.password) {
      const users = this.db.collection(MT_COLLECTIONS.users);
      const existing = await users.findOne({ email: input.email });
      if (existing) {
        throw new ConflictError("An account with this email already exists");
      }
      const passwordHash = await bcrypt.hash(input.password, 12);
      const userId = generateUserId();
      try {
        await users.insertOne({
          clinicId: ctx.clinicId,
          userId,
          name: input.fullName,
          email: input.email,
          passwordHash,
          role: "patient",
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

    const created = await repo.insert(doc as never);

    await writeAudit(this.db, ctx, {
      action: "create",
      entity: "patient",
      entityId: created.patientId,
      metadata: { fullName: created.fullName, mobile: created.mobile },
    });

    return created;
  }

  /**
   * Reads a patient by public id. Tenant isolation is guaranteed by the
   * repository (clinicId always merged). Ownership is enforced by the
   * controller via requirePatientAccess before this call.
   */
  async getPatientById(ctx: TenantContext, patientId: string): Promise<PatientDoc> {
    const patient = await this.repo(ctx).findByPatientId(patientId);
    if (!patient) {
      throw new NotFoundError("Patient not found");
    }
    return patient;
  }

  async listPatients(
    ctx: TenantContext,
    query: { q?: string; skip: number; limit: number }
  ) {
    return this.repo(ctx).search(query.q, { skip: query.skip, limit: query.limit });
  }

  async updatePatient(
    ctx: TenantContext,
    patientId: string,
    input: UpdatePatientInput
  ): Promise<PatientDoc> {
    const repo = this.repo(ctx);
    const patient = await repo.findByPatientId(patientId);
    if (!patient) {
      throw new NotFoundError("Patient not found");
    }

    // Patients may only ever edit their own profile. 404 hides existence.
    if (ctx.role === "patient" && patient.patientId !== ctx.patientId) {
      throw new NotFoundError("Patient not found");
    }

    const allowed = {
      fullName: input.fullName,
      mobile: input.mobile,
      gender: input.gender,
      dateOfBirth: input.dateOfBirth,
      bloodGroup: input.bloodGroup,
      address: input.address,
      city: input.city,
      pincode: input.pincode,
      allergies: input.allergies,
      notes: input.notes,
    };
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(allowed)) {
      if (value !== undefined) patch[key] = value;
    }

    if (Object.keys(patch).length === 0) {
      throw new ConflictError("No fields to update");
    }
    patch.updatedAt = new Date();

    const result = await repo.updateOne({ patientId }, { $set: patch });
    if (result.matchedCount === 0) {
      throw new NotFoundError("Patient not found");
    }

    await writeAudit(this.db, ctx, {
      action: "update",
      entity: "patient",
      entityId: patientId,
      metadata: { fields: Object.keys(patch).filter((k) => k !== "updatedAt") },
    });

    const updated = await repo.findByPatientId(patientId);
    return updated ?? patient;
  }

  async deletePatient(ctx: TenantContext, patientId: string): Promise<void> {
    const repo = this.repo(ctx);
    const patient = await repo.findByPatientId(patientId);
    if (!patient) {
      throw new NotFoundError("Patient not found");
    }

    await repo.deleteOne({ patientId });

    // Remove the linked portal account, if any.
    if (patient.userId) {
      await this.db
        .collection(MT_COLLECTIONS.users)
        .deleteOne({ clinicId: ctx.clinicId, userId: patient.userId });
    }

    await writeAudit(this.db, ctx, {
      action: "delete",
      entity: "patient",
      entityId: patientId,
      metadata: { fullName: patient.fullName },
    });
  }
}

/** True when the caller may view clinic-wide patient data. */
export function canViewAnyPatient(ctx: TenantContext): boolean {
  return isStaffContext(ctx);
}