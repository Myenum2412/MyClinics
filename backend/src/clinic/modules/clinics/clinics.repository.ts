import type { Db, Filter, WithId } from "mongodb";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import type { ClinicDoc } from "@/clinic/core/types";

export interface ClinicListQuery {
  status?: string;
  q?: string;
  skip: number;
  limit: number;
}

/**
 * Platform-level repository for clinics. There is no tenant to scope to —
 * access control for these methods lives in the controller/service
 * (platform_admin only). Clinic members always go through ClinicOwnRepository.
 */
export class ClinicRepository {
  constructor(private readonly db: Db) {}

  private collection() {
    return this.db.collection<ClinicDoc>(CLINIC_COLLECTIONS.clinics);
  }

  async findById(clinicId: string): Promise<WithId<ClinicDoc> | null> {
    return this.collection().findOne({ clinicId });
  }

  async create(
    doc: Omit<ClinicDoc, "_id" | "createdAt" | "updatedAt"> & {
      createdAt?: Date;
      updatedAt?: Date;
    }
  ): Promise<WithId<ClinicDoc>> {
    const now = new Date();
    await this.collection().insertOne({
      ...doc,
      settings: doc.settings ?? {
        workingHours: { open: "09:00", close: "18:00" },
        slotMinutes: 30,
        currency: "INR",
        timezone: "Asia/Kolkata",
      },
      createdAt: doc.createdAt ?? now,
      updatedAt: doc.updatedAt ?? now,
    } as never);
    const created = await this.findById(doc.clinicId);
    if (!created) throw new Error("Clinic creation failed");
    return created;
  }

  async findByIdentity(identity: string): Promise<WithId<ClinicDoc> | null> {
    return this.collection().findOne({
      $or: [{ clinicId: identity }, { slug: identity }],
    });
  }

  async list(query: ClinicListQuery): Promise<WithId<ClinicDoc>[]> {
    const filter: Record<string, unknown> = {};
    if (query.status && query.status !== "all") filter.status = query.status;
    if (query.q) {
      filter.$or = [
        { name: { $regex: query.q, $options: "i" } },
        { slug: { $regex: query.q, $options: "i" } },
        { email: { $regex: query.q, $options: "i" } },
      ];
    }
    return this.collection()
      .find(filter as never)
      .sort({ createdAt: -1 })
      .skip(query.skip)
      .limit(query.limit)
      .toArray();
  }

  async count(query: { status?: string; q?: string } = {}): Promise<number> {
    const filter: Record<string, unknown> = {};
    if (query.status && query.status !== "all") filter.status = query.status;
    if (query.q) {
      filter.$or = [
        { name: { $regex: query.q, $options: "i" } },
        { slug: { $regex: query.q, $options: "i" } },
      ];
    }
    return this.collection().countDocuments(filter as never);
  }

  async update(clinicId: string, patch: Record<string, unknown>): Promise<WithId<ClinicDoc> | null> {
    const result = await this.collection().findOneAndUpdate(
      { clinicId },
      { $set: { ...patch, updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    return result;
  }

  async updateStatus(clinicId: string, status: ClinicDoc["status"]): Promise<boolean> {
    const result = await this.collection().updateOne(
      { clinicId },
      { $set: { status, updatedAt: new Date() } }
    );
    return result.matchedCount === 1;
  }
}

/**
 * Repository for the clinic member's own clinic — always scoped to the
 * authenticated session's clinicId. The caller can never pass a clinicId.
 */
export class ClinicOwnRepository {
  constructor(
    private readonly db: Db,
    private readonly clinicId: string
  ) {}

  async findOwn(): Promise<WithId<ClinicDoc> | null> {
    return this.db
      .collection<ClinicDoc>(CLINIC_COLLECTIONS.clinics)
      .findOne({ clinicId: this.clinicId });
  }

  async updateOwn(patch: Record<string, unknown>): Promise<WithId<ClinicDoc> | null> {
    const result = await this.db
      .collection<ClinicDoc>(CLINIC_COLLECTIONS.clinics)
      .findOneAndUpdate(
        { clinicId: this.clinicId },
        { $set: { ...patch, updatedAt: new Date() } },
        { returnDocument: "after" }
      );
    return result;
  }
}
