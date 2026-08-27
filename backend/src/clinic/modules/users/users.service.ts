import bcrypt from "bcryptjs";
import type { Db, WithId } from "mongodb";
import { writeAudit } from "@/clinic/core/audit";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import { requireClinicOf, type ClinicContext } from "@/clinic/core/context";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/clinic/core/errors";
import { generateUserId, normalizeEmail } from "@/clinic/core/ids";
import { now as nowFn } from "@/clinic/core/datetime";
import { isClinicRole, isPharmacyRole, ROLE_PRIORITY, type ClinicRole } from "@/clinic/core/roles";
import type { UserDoc } from "@/clinic/core/types";
import type { CreateUserInput, UpdateUserInput } from "@/clinic/modules/users/users.dto";
import { UsersRepository } from "@/clinic/modules/users/users.repository";
import { notifyUserLoginDetails } from "@/services/whatsapp/save-notification.service";

export class UsersService {
  constructor(private readonly db: Db) {}

  private repo(ctx: ClinicContext): UsersRepository {
    return new UsersRepository(this.db, ctx);
  }

  private collection() {
    return this.db.collection<UserDoc>(CLINIC_COLLECTIONS.users);
  }

  /**
   * Creates a clinic user account. The target profile (doctor/staff/patient)
   * must already exist in the SAME clinic — foreign-reference validation.
   * A soft-deleted account with the same email is reactivated and relinked
   * instead of blocking creation.
   */
  async createUser(ctx: ClinicContext, input: CreateUserInput): Promise<WithId<UserDoc>> {
    const clinicId = requireClinicOf(ctx);
    const email = normalizeEmail(input.email);

    const existing = await this.collection().findOne({ email });
    if (
      existing &&
      !(existing.status === "deleted" && existing.clinicId === clinicId) &&
      !(existing.clinicId === clinicId && (await this.hasDeletedProfile(clinicId, existing)))
    ) {
      throw new ConflictError("An account with this email already exists");
    }

    const isPharmacy = isPharmacyRole(input.role);

    const linkField =
      input.role === "doctor"
        ? { doctorId: input.doctorId! }
        : input.role === "staff"
          ? { staffId: input.staffId! }
          : input.role === "patient"
            ? { patientId: input.patientId! }
            : {};

    if (!isPharmacy) {
      const linked = await this.verifyLink(clinicId, input.role, Object.values(linkField)[0] as string);
      if (!linked) {
        throw new BadRequestError(
          `The ${input.role} profile does not exist in this clinic`
        );
      }
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const now = nowFn();
    const doc: UserDoc = {
      clinicId,
      userId: existing?.userId ?? generateUserId(),
      name: input.name,
      email,
      passwordHash,
      authProvider: "password",
      role: input.role,
      doctorId: input.role === "doctor" ? input.doctorId ?? null : null,
      staffId: input.role === "staff" ? input.staffId ?? null : null,
      patientId: input.role === "patient" ? input.patientId ?? null : null,
      phone: input.phone ?? null,
      status: "active",
      lastLoginAt: existing?.lastLoginAt ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    if (existing) {
      // Reactivate the soft-deleted account with fresh credentials + relink.
      await this.collection().replaceOne({ _id: existing._id }, doc as never);
    } else {
      await this.collection().insertOne(doc as never);
    }

    // Bidirectional link: stamp the profile with the userId.
    if (input.role === "doctor") {
      await this.db
        .collection(CLINIC_COLLECTIONS.doctors)
        .updateOne({ clinicId, doctorId: input.doctorId }, { $set: { userId: doc.userId } });
    } else if (input.role === "staff") {
      await this.db
        .collection(CLINIC_COLLECTIONS.staff)
        .updateOne({ clinicId, staffId: input.staffId }, { $set: { userId: doc.userId } });
    } else if (input.role === "patient") {
      await this.db
        .collection(CLINIC_COLLECTIONS.patients)
        .updateOne({ clinicId, patientId: input.patientId }, { $set: { userId: doc.userId } });
    }

    await writeAudit(this.db, ctx, {
      action: existing ? "update" : "create",
      entity: "user",
      entityId: doc.userId,
      metadata: {
        email,
        role: input.role,
        linkedId: Object.values(linkField)[0],
        reactivated: Boolean(existing),
      },
    });

    // Send login details over WhatsApp when the profile has a phone/WhatsApp number.
    if ((doc.phone || input.whatsapp) && input.role !== "patient") {
      await notifyUserLoginDetails(this.db, {
        name: input.name,
        role: input.role,
        phone: doc.phone,
        whatsapp: input.whatsapp ?? null,
        email,
        password: input.password,
      }, clinicId);
    }

    return doc as unknown as WithId<UserDoc>;
  }

  async listUsers(
    ctx: ClinicContext,
    query: { q?: string; role?: string; status?: string; skip: number; limit: number }
  ) {
    const [items, total] = await this.repo(ctx).list(query);
    return { items, total };
  }

  async updateUser(
    ctx: ClinicContext,
    targetUserId: string,
    input: UpdateUserInput
  ): Promise<WithId<UserDoc>> {
    const clinicId = requireClinicOf(ctx);
    const user = await this.collection().findOne({ clinicId, userId: targetUserId });
    if (!user) throw new NotFoundError("User not found");
    if (user.role === "clinic_admin" && ctx.userId !== user.userId) {
      // Only the clinic_admin themself (or platform) may alter another admin.
      throw new ForbiddenError("Clinic admin accounts can only be edited by themselves");
    }
    if (input.role && input.role !== user.role) {
      throw new BadRequestError(
        "Changing a user's role requires reassigning their profile link; delete and recreate the account instead"
      );
    }

    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.phone !== undefined) patch.phone = input.phone;
    if (input.status !== undefined) patch.status = input.status;
    if (input.whatsapp !== undefined) patch.whatsapp = input.whatsapp;
    if (input.password !== undefined) {
      patch.passwordHash = await bcrypt.hash(input.password, 12);
    }

    if (Object.keys(patch).length > 0) {
      const result = await this.collection().updateOne(
        { clinicId, userId: targetUserId },
        { $set: patch }
      );
      if (result.matchedCount === 0) throw new NotFoundError("User not found");
    }

    await writeAudit(this.db, ctx, {
      action: "update",
      entity: "user",
      entityId: targetUserId,
      metadata: {
        fields: Object.keys(patch).filter((k) => k !== "passwordHash"),
        passwordReset: input.password !== undefined,
      },
    });

    // Notify over WhatsApp when the password was reset.
    if (input.password !== undefined) {
      const whatsapp = input.whatsapp ?? null;
      const phone = input.phone ?? whatsapp ?? user.phone ?? null;
      if (phone && user.role !== "patient") {
        await notifyUserLoginDetails(this.db, {
          name: input.name ?? user.name,
          role: user.role,
          phone: phone ?? null,
          whatsapp,
          email: user.email,
          password: input.password,
        }, clinicId);
      }
    }

    const updated = await this.collection().findOne({ clinicId, userId: targetUserId });
    if (!updated) throw new NotFoundError("User not found");
    return updated as WithId<UserDoc>;
  }

  /** Deactivates a user account (soft). */
  async deactivateUser(ctx: ClinicContext, targetUserId: string): Promise<void> {
    const clinicId = requireClinicOf(ctx);
    const user = await this.collection().findOne({ clinicId, userId: targetUserId });
    if (!user) throw new NotFoundError("User not found");
    if (user.role === "clinic_admin") {
      throw new ForbiddenError("Clinic admin accounts cannot be deactivated this way");
    }

    const result = await this.collection().updateOne(
      { clinicId, userId: targetUserId },
      { $set: { status: "deleted", deletedAt: nowFn() } }
    );
    if (result.matchedCount === 0) throw new NotFoundError("User not found");

    await writeAudit(this.db, ctx, {
      action: "delete",
      entity: "user",
      entityId: targetUserId,
      metadata: { email: user.email, role: user.role },
    });
  }

  /** Validates the link target exists within the clinic. */
  private async verifyLink(
    clinicId: string,
    role: CreateUserInput["role"],
    targetId: string
  ): Promise<boolean> {
    const collection =
      role === "doctor"
        ? CLINIC_COLLECTIONS.doctors
        : role === "staff"
          ? CLINIC_COLLECTIONS.staff
          : CLINIC_COLLECTIONS.patients;
    const field = role === "doctor" ? "doctorId" : role === "staff" ? "staffId" : "patientId";
    const doc = await this.db.collection(collection).findOne({ clinicId, [field]: targetId });
    return doc !== null;
  }

  /**
   * True when the account's linked profile was soft-deleted (e.g. the doctor
   * was removed before login cleanup existed) — the email can be taken over.
   */
  private async hasDeletedProfile(clinicId: string, user: UserDoc): Promise<boolean> {
    const targetId = user.doctorId ?? user.staffId ?? user.patientId;
    if (!targetId) return false;
    const collection =
      user.role === "doctor"
        ? CLINIC_COLLECTIONS.doctors
        : user.role === "staff"
          ? CLINIC_COLLECTIONS.staff
          : CLINIC_COLLECTIONS.patients;
    const field = user.role === "doctor" ? "doctorId" : user.role === "staff" ? "staffId" : "patientId";
    const profile = await this.db.collection(collection).findOne({ clinicId, [field]: targetId });
    return profile?.status === "deleted";
  }
}

export function userToPublic(user: WithId<UserDoc>) {
  return {
    userId: user.userId,
    name: user.name,
    email: user.email,
    role: user.role,
    doctorId: user.doctorId,
    staffId: user.staffId,
    patientId: user.patientId,
    phone: user.phone,
    status: user.status,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

export { isClinicRole, ROLE_PRIORITY };
export type { ClinicRole };