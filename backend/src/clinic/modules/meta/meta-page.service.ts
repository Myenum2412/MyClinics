import type { Db } from "mongodb";
import { MetaRepository } from "@/clinic/modules/meta/meta.repository";
import type { MetaApiClient } from "@/clinic/modules/meta/meta-client";

/** MetaPageService — enumerates the clinic's Facebook Pages (section 28/30). */
export class MetaPageService {
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
      data?: Array<{ id: string; name: string; category?: string }>;
    }>("me/accounts", token, { fields: "id,name,category", limit: "100" });
    for (const page of res.data ?? []) {
      await this.repo().upsertPage(clinicId, integration.integrationId, {
        pageId: page.id,
        pageName: page.name,
        category: page.category ?? null,
      });
    }
  }
}
