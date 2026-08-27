import type { Db } from "mongodb";
import { MetaRepository } from "@/clinic/modules/meta/meta.repository";
import type { MetaApiClient } from "@/clinic/modules/meta/meta-client";
import { now as nowFn } from "@/clinic/core/datetime";

/**
 * MetaBusinessService — resolves the clinic's Meta Business Manager and
 * stamps it onto the integration record (section 28/30).
 */
export class MetaBusinessService {
  constructor(
    private readonly db: Db,
    private readonly client: MetaApiClient
  ) {}

  private repo(): MetaRepository {
    return new MetaRepository(this.db);
  }

  async fetchAndStore(
    clinicId: string,
    token: string
  ): Promise<{ metaBusinessId: string; metaBusinessName: string | null } | null> {
    const integration = await this.repo().getIntegration(clinicId);
    if (!integration) return null;

    let businessId = "";
    let businessName: string | null = null;
    try {
      const res = await this.client.get<{ data?: Array<{ id: string; name: string }> }>(
        "me/businesses",
        token,
        { fields: "id,name", limit: "1" }
      );
      const biz = res.data?.[0];
      if (biz) {
        businessId = biz.id;
        businessName = biz.name;
      }
    } catch {
      // A connected Page without a Business Manager is still valid.
    }

    if (businessId) {
      await this.repo().upsertIntegration(clinicId, {
        metaBusinessId: businessId,
        metaBusinessName: businessName,
        updatedAt: nowFn(),
      });
    }
    return businessId ? { metaBusinessId: businessId, metaBusinessName: businessName } : null;
  }
}
