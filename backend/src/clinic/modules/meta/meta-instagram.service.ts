import type { Db } from "mongodb";
import { MetaRepository } from "@/clinic/modules/meta/meta.repository";
import type { MetaApiClient } from "@/clinic/modules/meta/meta-client";

/** MetaInstagramService — enumerates linked Instagram professional accounts. */
export class MetaInstagramService {
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
    const pages = await this.repo().listPages(clinicId);
    for (const page of pages) {
      try {
        const res = await this.client.get<{
          instagram_business_account?: { id: string; username?: string; name?: string } | null;
        }>(page.pageId, token, { fields: "instagram_business_account{id,username,name}" });
        const ig = res.instagram_business_account;
        if (ig) {
          await this.repo().upsertInstagram(clinicId, integration.integrationId, {
            instagramAccountId: ig.id,
            username: ig.username ?? null,
            name: ig.name ?? ig.username ?? null,
          });
        }
      } catch {
        // Page may not have an IG account linked — skip silently.
      }
    }
  }
}
