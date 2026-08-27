import type { Db } from "mongodb";
import { MetaRepository } from "@/clinic/modules/meta/meta.repository";
import type { MetaApiClient } from "@/clinic/modules/meta/meta-client";

/** MetaLeadFormService — enumerates Lead Forms per connected Page. */
export class MetaLeadFormService {
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
          data?: Array<{ id: string; name?: string }>;
        }>(`${page.pageId}/leadgen_forms`, token, { fields: "id,name", limit: "100" });
        for (const form of res.data ?? []) {
          await this.repo().upsertForm(clinicId, integration.integrationId, page.pageId, {
            formId: form.id,
            formName: form.name ?? form.id,
          });
        }
      } catch {
        // Page may not have lead forms — skip.
      }
    }
  }
}
