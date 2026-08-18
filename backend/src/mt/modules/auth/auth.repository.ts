import type { Db, WithId } from "mongodb";
import { MT_COLLECTIONS } from "@/mt/core/collections";
import type { ClinicDoc, MtUserDoc } from "@/mt/modules/auth/auth.schema";
import { ConflictError } from "@/mt/core/errors";

/**
 * Auth repository. This is the ONLY repository that operates without a
 * tenant context, and only for the two bootstrapping operations that
 * pre-date a tenant: creating the clinic itself and finding a user by
 * email for login. Everything else goes through the scoped repositories.
 */
export class AuthRepository {
  constructor(private readonly db: Db) {}

  private clinics() {
    return this.db.collection<ClinicDoc>(MT_COLLECTIONS.clinics);
  }

  private users() {
    return this.db.collection<MtUserDoc>(MT_COLLECTIONS.users);
  }

  async findUserByEmail(email: string): Promise<WithId<MtUserDoc> | null> {
    return this.users().findOne({ email: email.toLowerCase() });
  }

  async findClinicByClinicId(clinicId: string): Promise<WithId<ClinicDoc> | null> {
    return this.clinics().findOne({ clinicId });
  }

  async createClinic(input: {
    clinicId: string;
    slug: string;
    name: string;
    phone: string | null;
  }): Promise<WithId<ClinicDoc>> {
    const now = new Date();
    const doc: ClinicDoc = {
      clinicId: input.clinicId,
      slug: input.slug,
      name: input.name,
      phone: input.phone,
      address: null,
      status: "active",
      plan: "free",
      createdAt: now,
      updatedAt: now,
    };
    try {
      const { insertedId } = await this.clinics().insertOne(doc);
      return (await this.clinics().findOne({ _id: insertedId })) as WithId<ClinicDoc>;
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictError("This clinic name or slug is already registered");
      }
      throw error;
    }
  }

  async createUser(doc: MtUserDoc): Promise<WithId<MtUserDoc>> {
    try {
      const { insertedId } = await this.users().insertOne(doc as never);
      return (await this.users().findOne({ _id: insertedId })) as WithId<MtUserDoc>;
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictError("An account with this email already exists");
      }
      throw error;
    }
  }

  async touchLastLogin(userId: string): Promise<void> {
    await this.users().updateOne(
      { userId },
      { $set: { lastLoginAt: new Date(), updatedAt: new Date() } }
    );
  }
}

export function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}