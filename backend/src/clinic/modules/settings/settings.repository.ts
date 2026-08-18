import type { Db, WithId } from "mongodb";
import type { ClinicSettingsDoc } from "@/clinic/modules/settings/settings.schema";
import { DEFAULT_SETTINGS } from "@/clinic/modules/settings/settings.dto";

/** One settings document per clinic (upserted). */
export class SettingsRepository {
  constructor(
    private readonly db: Db,
    private readonly clinicId: string
  ) {}

  private collection() {
    return this.db.collection<ClinicSettingsDoc>("clc_settings");
  }

  async get(): Promise<WithId<ClinicSettingsDoc>> {
    const existing = await this.collection().findOne({ clinicId: this.clinicId });
    if (existing) return existing;
    const now = new Date();
    const doc: ClinicSettingsDoc = {
      clinicId: this.clinicId,
      ...DEFAULT_SETTINGS,
      createdAt: now,
      updatedAt: now,
    };
    await this.collection().insertOne(doc as never);
    return (await this.collection().findOne({ clinicId: this.clinicId })) as WithId<ClinicSettingsDoc>;
  }

  async update(patch: Record<string, unknown>): Promise<WithId<ClinicSettingsDoc> | null> {
    const result = await this.collection().findOneAndUpdate(
      { clinicId: this.clinicId },
      {
        $set: { ...patch, updatedAt: new Date() },
        $setOnInsert: { ...DEFAULT_SETTINGS, clinicId: this.clinicId, createdAt: new Date() },
      },
      { upsert: true, returnDocument: "after" }
    );
    return result;
  }
}