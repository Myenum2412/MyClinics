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
import { isClinicRole, ROLE_PRIORITY, type ClinicRole } from "@/clinic/core/roles";
import type { UserDoc } from "@/clinic/core/types";
import type { CreateUserInput, UpdateUserInput } from "@/clinic/modules/users/users.dto";
import { UsersRepository } from "@/clinic/modules/users/users.repository";

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
   */
  async createUser(ctx: ClinicContext, input: CreateUserInput): Promise<WithId<UserDoc>> {
    const clinicId = requireClinicOf(ctx);
    const email = normalizeEmail(input.email);

    const existing = await this.collection().findOne({ email });
    if (existing) {
      throw new ConflictError("An account with this email already exists");
    }

    const linkField =
      input.role === "doctor"
        ? { doctorId: input.doctorId! }
        : input.role === "staff"
          ? { staffId: input.staffId! }
          : { patientId: input.patientId! };

    const linked = await this.verifyLink(clinicId, input.role, Object.values(linkField)[0] as string);
    if (!linked) {
      throw new BadRequestError(
        `The ${input.role} profile does not exist in this clinic`
      );
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const now = new Date();
    const doc: UserDoc = {
      clinicId,
      userId: generateUserId(),
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
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
    };

    await this.collection().insertOne(doc as never);

    // Bidirectional link: stamp the profile with the userId.
    if (input.role === "doctor") {
      await this.db
        .collection(CLINIC_COLLECTIONS.doctors)
        .updateOne({ clinicId, doctorId: input.doctorId }, { $set: { userId: doc.userId } });
    } else if (input.role === "staff") {
      await this.db
        .collection(CLINIC_COLLECTIONS.staff)
        .updateOne({ clinicId, staffId: input.staffId }, { $set: { userId: doc.userId } });
    } else {
      await this.db
        .collection(CLINIC_COLLECTIONS.patients)
        .updateOne({ clinicId, patientId: input.patientId }, { $set: { userId: doc.userId } });
    }

    await writeAudit(this.db, ctx, {
      action: "create",
      entity: "user",
      entityId: doc.userId,
      metadata: { email, role: input.role, linkedId: Object.values(linkField)[0] },
    });

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
      metadata: { fields: Object.keys(patch) },
    });

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
      { $set: { status: "deleted", deletedAt: new Date() } }
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