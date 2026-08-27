import type { Db } from "mongodb";
import { requireClinicOf, type ClinicContext } from "@/clinic/core/context";
import { NotFoundError } from "@/clinic/core/errors";
import { generateUuid } from "@/clinic/core/ids";
import { MetaRepository } from "@/clinic/modules/meta/meta.repository";
import type { MetaCampaignMappingDoc } from "@/clinic/modules/meta/meta-schema";

/**
 * MetaCampaignService — configures how a Meta Campaign routes into the
 * clinic (department / service / team / doctor / pipeline). Section 33.
 *
 * These mappings are tenant-scoped: a clinic can only configure routing for
 * its OWN Meta campaigns (resolved via metaCampaignId — a stable Meta id).
 */
export class MetaCampaignService {
  constructor(private readonly db: Db) {}

  private repo(ctx: ClinicContext): MetaRepository {
    return new MetaRepository(this.db);
  }

  async list(ctx: ClinicContext) {
    return this.repo(ctx).listCampaignMappings(requireClinicOf(ctx));
  }

  async upsert(
    ctx: ClinicContext,
    input: {
      metaCampaignId: string;
      metaCampaignName?: string | null;
      department?: string | null;
      service?: string | null;
      team?: string | null;
      doctorId?: string | null;
      pipeline?: string | null;
    }
  ): Promise<MetaCampaignMappingDoc> {
    if (!input.metaCampaignId) throw new NotFoundError("metaCampaignId is required");
    const clinicId = requireClinicOf(ctx);
    await this.repo(ctx).upsertCampaignMapping(clinicId, {
      mappingId: `mpg_${generateUuid().slice(0, 12)}`,
      metaCampaignId: input.metaCampaignId,
      metaCampaignName: input.metaCampaignName ?? null,
      department: input.department ?? null,
      service: input.service ?? null,
      team: input.team ?? null,
      doctorId: input.doctorId ?? null,
      pipeline: input.pipeline ?? null,
    });
    const all = await this.repo(ctx).listCampaignMappings(clinicId);
    return all.find((m) => m.metaCampaignId === input.metaCampaignId)!;
  }

  async remove(ctx: ClinicContext, mappingId: string): Promise<void> {
    const ok = await this.repo(ctx).deleteCampaignMapping(requireClinicOf(ctx), mappingId);
    if (!ok) throw new NotFoundError("Campaign mapping not found");
  }

  /** Resolves a configured mapping for a given Meta campaign id (for routing). */
  async resolveForCampaign(
    clinicId: string,
    metaCampaignId: string
  ): Promise<MetaCampaignMappingDoc | null> {
    return new MetaRepository(this.db).getCampaignMapping(clinicId, metaCampaignId);
  }
}
