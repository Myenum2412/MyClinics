import type { Db } from "mongodb";
import { now as nowFn } from "@/clinic/core/datetime";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import { randomToken } from "@/clinic/core/ids";
import { NotFoundError, BadRequestError } from "@/clinic/core/errors";
import {
  buildMetaClient,
  MetaApiClient,
  MetaApiError,
} from "@/clinic/modules/meta/meta-client";
import { MetaTokenService } from "@/clinic/modules/meta/meta-token.service";
import { MetaBusinessService } from "@/clinic/modules/meta/meta-business.service";
import { MetaPageService } from "@/clinic/modules/meta/meta-page.service";
import { MetaInstagramService } from "@/clinic/modules/meta/meta-instagram.service";
import { MetaAdAccountService } from "@/clinic/modules/meta/meta-adaccount.service";
import { MetaLeadFormService } from "@/clinic/modules/meta/meta-leadform.service";

export const META_DEFAULT_SCOPES = [
  "business_management",
  "pages_read_engagement",
  "pages_manage_metadata",
  "instagram_basic",
  "ads_read",
  "leads_retrieval",
  "whatsapp_business_management",
];

/**
 * MetaAuthService — server-side OAuth (section 29).
 *
 * The frontend never sees the access token. We:
 *   1. generate a random `state`, store it keyed to the clinic (with TTL),
 *   2. redirect the admin to Meta,
 *   3. on callback (public route), validate `state`, exchange the code,
 *   4. persist an ENCRYPTED token via MetaTokenService,
 *   5. enumerate + map the clinic's Meta assets (pages, IG, ad accounts,
 *      lead forms, WhatsApp) to the clinic tenant.
 */
export class MetaAuthService {
  private readonly client: MetaApiClient | null;
  private readonly tokenService: MetaTokenService;

  constructor(private readonly db: Db) {
    this.client = buildMetaClient();
    this.tokenService = new MetaTokenService(db, this.client);
  }

  get isConfigured(): boolean {
    return this.client != null;
  }

  /** Step 1 — returns the Meta OAuth URL the frontend should redirect to. */
  async beginConnect(clinicId: string, scopes?: string[]): Promise<{ authUrl: string; state: string }> {
    if (!this.client) {
      throw new Error("Meta integration is not configured on the server (META_APP_ID / META_APP_SECRET)");
    }
    const state = randomToken(24);
    await this.db.collection(CLINIC_COLLECTIONS.metaOauthStates).insertOne({
      state,
      clinicId,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      createdAt: nowFn(),
    });
    const authUrl = this.client.buildAuthUrl(state, scopes ?? META_DEFAULT_SCOPES);
    return { authUrl, state };
  }

  /**
   * Step 3 — public callback handler. Resolves the clinic from the oauth
   * `state` (NEVER from a caller-supplied clinicId), exchanges the code, and
   * maps the clinic's Meta assets. Returns the resolved clinicId so the
   * controller can issue a tenant-scoped result.
   */
  async handleCallback(
    code: string,
    state: string
  ): Promise<{ clinicId: string; metaBusinessId: string; metaBusinessName: string | null }> {
    if (!this.client) throw new Error("Meta is not configured");
    const oauth = await this.db
      .collection(CLINIC_COLLECTIONS.metaOauthStates)
      .findOneAndDelete({ state });
    if (!oauth) throw new BadRequestError("Invalid or expired OAuth state");
    const clinicId = (oauth as unknown as { clinicId: string }).clinicId;

    let token: { accessToken: string; expiresIn: number };
    try {
      const shortLived = await this.client.exchangeCodeForToken(code);
      token = await this.client.exchangeLongLivedToken(shortLived.accessToken);
    } catch (err) {
      if (err instanceof MetaApiError) throw new BadRequestError(`Meta OAuth failed: ${err.message}`);
      throw err;
    }

    await this.tokenService.storeToken(clinicId, token.accessToken, token.expiresIn, META_DEFAULT_SCOPES);

    // Enumerate + map assets (each step failures are isolated — one bad asset
    // type must not abort the whole connection).
    const business = new MetaBusinessService(this.db, this.client);
    const pages = new MetaPageService(this.db, this.client);
    const ig = new MetaInstagramService(this.db, this.client);
    const ads = new MetaAdAccountService(this.db, this.client);
    const forms = new MetaLeadFormService(this.db, this.client);

    const info = await business.fetchAndStore(clinicId, token.accessToken).catch(() => null);
    await pages.fetchAndStore(clinicId, token.accessToken).catch(() => null);
    await ig.fetchAndStore(clinicId, token.accessToken).catch(() => null);
    await ads.fetchAndStore(clinicId, token.accessToken).catch(() => null);
    await forms.fetchAndStore(clinicId, token.accessToken).catch(() => null);

    return {
      clinicId,
      metaBusinessId: info?.metaBusinessId ?? "",
      metaBusinessName: info?.metaBusinessName ?? null,
    };
  }

  /** Reconnect / refresh authorization (section 28). */
  async reconnect(clinicId: string): Promise<{ authUrl: string; state: string }> {
    // Clear any prior token so a fresh one is required.
    await this.tokenService.disconnect(clinicId);
    return this.beginConnect(clinicId);
  }

  tokenServiceInstance(): MetaTokenService {
    return this.tokenService;
  }
}
