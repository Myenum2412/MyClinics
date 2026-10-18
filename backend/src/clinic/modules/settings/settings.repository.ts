import { now as nowFn } from "@/clinic/core/datetime";
import type { Db, WithId } from "mongodb";
import type { ClinicSettingsDoc } from "@/clinic/modules/settings/settings.schema";
import { DEFAULT_SETTINGS } from "@/clinic/modules/settings/settings.dto";
import { cached, invalidateCache } from "@/lib/cache";

const SETTINGS_TTL_MS = 60_000;

/** One settings document per clinic (upserted). */
export class SettingsRepository {
  constructor(
    private readonly db: Db,
    private readonly clinicId: string
  ) {}

  private collection() {
    return this.db.collection<ClinicSettingsDoc>("clc_settings");
  }

  private cacheKey(): string {
    return `clinic:settings:${this.clinicId}`;
  }

  async get(): Promise<WithId<ClinicSettingsDoc>> {
    // Hot read path (settings are read on nearly every page). Read-only, so we
    // can serve from a short-lived cache instead of upserting on every call.
    return cached(this.cacheKey(), SETTINGS_TTL_MS, async () => {
      const existing = await this.collection().findOne({ clinicId: this.clinicId });
      if (existing) return existing;
      const inserted = await this.collection().findOneAndUpdate(
        { clinicId: this.clinicId },
        {
          $setOnInsert: { ...DEFAULT_SETTINGS, clinicId: this.clinicId, createdAt: nowFn(), updatedAt: nowFn() },
        },
        { upsert: true, returnDocument: "after" }
      );
      return inserted as WithId<ClinicSettingsDoc>;
    });
  }

  async update(patch: Record<string, unknown>): Promise<WithId<ClinicSettingsDoc> | null> {
    // $setOnInsert must not overlap $set paths, or MongoDB rejects the upsert
    // with "Updating the path ... would create a conflict" when the document
    // does not exist yet (first save).
    const insertDefaults: Record<string, unknown> = { ...DEFAULT_SETTINGS };
    for (const key of Object.keys(patch)) delete insertDefaults[key];

    const result = await this.collection().findOneAndUpdate(
      { clinicId: this.clinicId },
      {
        $set: { ...patch, updatedAt: nowFn() },
        $setOnInsert: { ...insertDefaults, clinicId: this.clinicId, createdAt: nowFn() },
      },
      { upsert: true, returnDocument: "after" }
    );
    await invalidateCache(this.cacheKey());
    return result;
  }
}