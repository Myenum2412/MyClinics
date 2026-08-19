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
import {
  notifyDoctorOfAssignment,
  notifyDoctorOfNewPatient,
  notifyDoctorOfPatientUpdate,
  notifyPatientAssigned,
  notifyPatientRegistered,
  notifyPatientUpdated,
  type Notifyable,
} from "@/services/whatsapp/save-notification.service";

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

    const patients = this.db.collection<PatientDoc>(CLINIC_COLLECTIONS.patients);

    // Prevent duplicate registrations inside this clinic.
    const dupByMobile = await patients.findOne({
      clinicId,
      mobile: input.mobile,
      status: { $ne: "deleted" },
    });
    if (dupByMobile) {
      throw new ConflictError("A patient with this mobile number already exists in your clinic");
    }
    if (input.email) {
      const dupByEmail = await patients.findOne({
        clinicId,
        email: input.email,
        status: { $ne: "deleted" },
      });
      if (dupByEmail) {
        throw new ConflictError("A patient with this email already exists in your clinic");
      }
    }

    // Portal access needs an email (patients sign in with email + password).
    // Legacy clients omit portalAccess: keep the old email+password behavior.
    const portalEnabled =
      input.portalAccess === "enable" ||
      (input.portalAccess === undefined && Boolean(input.email && input.password));
    if (portalEnabled && !input.email) {
      throw new BadRequestError("An email is required to enable patient portal access");
    }
    if (input.portalAccess === "disable" && input.password) {
      throw new BadRequestError("Portal password is set but portal access is disabled");
    }

    let assignedDoctor: Notifyable | null = null;
    if (input.doctorId) {
      const doctorExists = await this.db
        .collection(CLINIC_COLLECTIONS.doctors)
        .findOne({ clinicId, doctorId: input.doctorId, status: { $ne: "deleted" } });
      if (!doctorExists) {
        throw new BadRequestError("The assigned doctor does not exist in this clinic");
      }
      assignedDoctor = doctorExists as unknown as Notifyable;
    }

    const doc: Omit<PatientDoc, "clinicId"> = {
      patientId,
      doctorId: input.doctorId ?? null,
      userId: null,
      fullName: input.fullName,
      mobile: input.mobile,
      whatsapp: input.whatsapp ?? null,
      email: input.email ?? null,
      gender: input.gender ?? null,
      dateOfBirth: input.dateOfBirth ?? null,
      bloodGroup: input.bloodGroup ?? null,
      address: input.address ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      pincode: input.pincode ?? null,
      height: input.height ?? null,
      weight: input.weight ?? null,
      occupation: input.occupation ?? null,
      maritalStatus: input.maritalStatus ?? null,
      emergencyContactName: input.emergencyContactName ?? null,
      emergencyContactRelationship: input.emergencyContactRelationship ?? null,
      emergencyContactMobile: input.emergencyContactMobile ?? null,
      allergies: input.allergies ?? [],
      medicalConditions: input.medicalConditions ?? null,
      previousSurgeries: input.previousSurgeries ?? null,
      currentMedications: input.currentMedications ?? null,
      idType: input.idType ?? null,
      idNumber: input.idNumber ?? null,
      insuranceProvider: input.insuranceProvider ?? null,
      insurancePolicyNumber: input.insurancePolicyNumber ?? null,
      insurancePolicyHolderName: input.insurancePolicyHolderName ?? null,
      insuranceValidTill: input.insuranceValidTill ?? null,
      referredBy: input.referredBy ?? null,
      howDidYouHear: input.howDidYouHear ?? null,
      notes: input.notes ?? null,
      status: "active",
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
    };

    if (portalEnabled && input.email && input.password) {
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

    // Notify the patient (and the assigned doctor) that the profile was created.
    await notifyPatientRegistered(this.db, created, {
      sendCredentials: input.loginNotification === "whatsapp",
      portalUsername: input.email ?? null,
      password: input.password ?? null,
    });
    if (assignedDoctor) {
      await notifyDoctorOfNewPatient(this.db, assignedDoctor, created.fullName);
    }

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
      "whatsapp",
      "gender",
      "dateOfBirth",
      "bloodGroup",
      "address",
      "city",
      "state",
      "pincode",
      "height",
      "weight",
      "occupation",
      "maritalStatus",
      "emergencyContactName",
      "emergencyContactRelationship",
      "emergencyContactMobile",
      "allergies",
      "medicalConditions",
      "previousSurgeries",
      "currentMedications",
      "idType",
      "idNumber",
      "insuranceProvider",
      "insurancePolicyNumber",
      "insurancePolicyHolderName",
      "insuranceValidTill",
      "referredBy",
      "howDidYouHear",
      "notes",
    ] as const) {
      const value = input[key];
      if (value !== undefined) patch[key] = value;
    }
    if (input.email !== undefined) patch.email = input.email;

    if (input.doctorId !== undefined) {
      if (input.doctorId !== null) {
        const doctorExists = await this.db
          .collection(CLINIC_COLLECTIONS.doctors)
          .findOne({ clinicId: requireClinicOf(ctx), doctorId: input.doctorId, status: { $ne: "deleted" } });
        if (!doctorExists) {
          throw new BadRequestError("The assigned doctor does not exist in this clinic");
        }
      }
      patch.doctorId = input.doctorId;
    }

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
    const saved = updated ?? patient;

    // Notify the patient and their assigned doctor that the profile changed.
    await notifyPatientUpdated(this.db, saved, Object.keys(patch));
    if (saved.doctorId) {
      const doctor = await this.db
        .collection(CLINIC_COLLECTIONS.doctors)
        .findOne({
          clinicId: requireClinicOf(ctx),
          doctorId: saved.doctorId,
          status: { $ne: "deleted" },
        });
      if (doctor) {
        await notifyDoctorOfPatientUpdate(this.db, doctor as unknown as Notifyable, saved.fullName, Object.keys(patch));
      }
    }

    return saved;
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

    let newDoctor: Notifyable | null = null;
    if (input.doctorId) {
      const doctorExists = await this.db
        .collection(CLINIC_COLLECTIONS.doctors)
        .findOne({ clinicId, doctorId: input.doctorId, status: { $ne: "deleted" } });
      if (!doctorExists) {
        throw new BadRequestError("The assigned doctor does not exist in this clinic");
      }
      newDoctor = doctorExists as unknown as Notifyable;
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
    const saved = updated ?? patient;

    // Notify the patient and the newly assigned doctor.
    const doctorName = newDoctor
      ? ((newDoctor.name ?? newDoctor.fullName) as string | undefined)
      : undefined;
    await notifyPatientAssigned(this.db, saved, doctorName ?? null);
    if (newDoctor) {
      await notifyDoctorOfAssignment(this.db, newDoctor, saved.fullName);
    }

    return saved;
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