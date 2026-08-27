import type { Db } from "mongodb";
import { MetaRepository } from "@/clinic/modules/meta/meta.repository";
import type { MetaApiClient } from "@/clinic/modules/meta/meta-client";

/** MetaAdAccountService — enumerates the clinic's Meta Ad Accounts. */
export class MetaAdAccountService {
  constructor(
    private readonly db: Db,
    private readonly client: MetaApiClient
  ) {}

  private repo(): MetaRepository {
    return new MetaRepository(this.db);
  }

  async fetchAndStore(clinicId: string, token: string): Promise<void> {
    const integration = await this.repo().getIntegration(clinicId);
    if (!integration) return;
    const res = await this.client.get<{
      data?: Array<{ id: string; name?: string; account_id?: string; currency?: string }>;
    }>("me/adaccounts", token, { fields: "id,name,account_id,currency", limit: "100" });
    for (const ad of res.data ?? []) {
      await this.repo().upsertAdAccount(clinicId, integration.integrationId, {
        adAccountId: ad.id,
        name: ad.name ?? null,
        accountId: ad.account_id ?? null,
        currency: ad.currency ?? null,
      });
    }
  }
}
