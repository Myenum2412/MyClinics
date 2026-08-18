import type { Db, WithId } from "mongodb";
import { writeAudit } from "@/clinic/core/audit";
import { requireClinicOf, type ClinicContext } from "@/clinic/core/context";
import type { UpdateSettingsInput } from "@/clinic/modules/settings/settings.dto";
import { SettingsRepository } from "@/clinic/modules/settings/settings.repository";
import type { ClinicSettingsDoc } from "@/clinic/modules/settings/settings.schema";

export class SettingsService {
  constructor(private readonly db: Db) {}

  private repo(ctx: ClinicContext): SettingsRepository {
    return new SettingsRepository(this.db, requireClinicOf(ctx));
  }

  async getSettings(ctx: ClinicContext): Promise<WithId<ClinicSettingsDoc>> {
    return this.repo(ctx).get();
  }

  async updateSettings(
    ctx: ClinicContext,
    input: UpdateSettingsInput
  ): Promise<WithId<ClinicSettingsDoc>> {
    const patch: Record<string, unknown> = {};
    if (input.workingHours !== undefined) patch.workingHours = input.workingHours;
    if (input.slotMinutes !== undefined) patch.slotMinutes = input.slotMinutes;
    if (input.currency !== undefined) patch.currency = input.currency;
    if (input.timezone !== undefined) patch.timezone = input.timezone;
    if (input.receiptFooter !== undefined) patch.receiptFooter = input.receiptFooter;
    if (input.soulMd !== undefined) patch.soulMd = input.soulMd;
    if (input.smsEnabled !== undefined) patch.smsEnabled = input.smsEnabled;
    if (input.emailNotifications !== undefined) patch.emailNotifications = input.emailNotifications;

    const updated = await this.repo(ctx).update(patch);
    if (!updated) {
      // fall through: upsert should always return a document
      return this.repo(ctx).get();
    }

    await writeAudit(this.db, ctx, {
      action: "update",
      entity: "settings",
      entityId: requireClinicOf(ctx),
      metadata: { fields: Object.keys(patch) },
    });

    return updated;
  }
}