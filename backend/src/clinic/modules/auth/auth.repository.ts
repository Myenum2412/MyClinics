import type { Db } from "mongodb";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import type { ClinicDoc, UserDoc } from "@/clinic/core/types";

export class AuthRepository {
  constructor(private readonly db: Db) {}

  findUserByEmail(email: string): Promise<UserDoc | null> {
    return this.db
      .collection<UserDoc>(CLINIC_COLLECTIONS.users)
      .findOne({ email });
  }

  findUserById(userId: string): Promise<UserDoc | null> {
    return this.db
      .collection<UserDoc>(CLINIC_COLLECTIONS.users)
      .findOne({ userId });
  }

  findClinicByClinicId(clinicId: string): Promise<ClinicDoc | null> {
    return this.db
      .collection<ClinicDoc>(CLINIC_COLLECTIONS.clinics)
      .findOne({ clinicId });
  }

  createClinic(doc: Omit<ClinicDoc, "_id" | "clinicId" | "createdAt" | "updatedAt"> & {
    clinicId: string;
    createdAt?: Date;
    updatedAt?: Date;
  }): Promise<ClinicDoc> {
    const now = new Date();
    return this.db.collection(CLINIC_COLLECTIONS.clinics).insertOne({
      ...doc,
      status: doc.status ?? "active",
      settings: doc.settings ?? {
        workingHours: { open: "09:00", close: "18:00" },
        slotMinutes: 30,
        currency: "INR",
        timezone: "Asia/Kolkata",
      },
      createdAt: doc.createdAt ?? now,
      updatedAt: doc.updatedAt ?? now,
    } as never).then(() => this.findClinicByClinicId(doc.clinicId) as Promise<ClinicDoc>);
  }

  createUser(doc: Omit<UserDoc, "_id">): Promise<UserDoc> {
    return this.db
      .collection(CLINIC_COLLECTIONS.users)
      .insertOne(doc as never)
      .then(() => this.findUserById(doc.userId) as Promise<UserDoc>);
  }

  touchLastLogin(userId: string): Promise<void> {
    return this.db
      .collection(CLINIC_COLLECTIONS.users)
      .updateOne({ userId }, { $set: { lastLoginAt: new Date() } })
      .then(() => undefined);
  }
}
