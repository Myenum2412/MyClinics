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
import { encryptToken } from "@/clinic/modules/meta/meta-crypto";
import {
  getClinicMetaAppConfig,
  type MetaAppConfig,
} from "@/clinic/modules/meta/meta-config";
import { MetaRepository } from "@/clinic/modules/meta/meta.repository";
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

export interface MetaConnectInput {
  /** Clinic's own Meta app id (per-clinic integration). */
  appId?: string;
  /** Clinic's own Meta app secret (encrypted at rest). */
  appSecret?: string;
  /** Optional custom OAuth redirect URI registered on the clinic's app. */
  redirectUri?: string;
}

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
 *
 * Each clinic authenticates with ITS OWN Meta app when it supplies app
 * credentials at connect time; otherwise the server-level env vars are used.
 */
export class MetaAuthService {
  private readonly tokenService: MetaTokenService;

  constructor(private readonly db: Db) {
    this.tokenService = new MetaTokenService(db, null);
  }

  /** Resolves the app config for a connect attempt (supplied → stored → env). */
  private async resolveConnectConfig(
    clinicId: string,
    input: MetaConnectInput
  ): Promise<MetaAppConfig> {
    const supplied = input.appId && input.appSecret
      ? { appId: input.appId, appSecret: input.appSecret, redirectUri: input.redirectUri ?? null }
      : null;
    if (supplied) return supplied;
    const stored = await getClinicMetaAppConfig(this.db, clinicId);
    if (stored) return stored;
    throw new BadRequestError(
      "Meta is not configured for this clinic and no server defaults exist. " +
        "Provide your Meta App ID and App Secret (from your own Meta Business app) to connect."
    );
  }

  /** Step 1 — returns the Meta OAuth URL the frontend should redirect to. */
  async beginConnect(
    clinicId: string,
    input: MetaConnectInput = {},
    scopes?: string[]
  ): Promise<{ authUrl: string; state: string }> {
    const config = await this.resolveConnectConfig(clinicId, input);

    // Persist the clinic's own app credentials (encrypted) so the callback can
    // exchange the code with the SAME app.
    if (input.appId && input.appSecret) {
      const encrypted = encryptToken(input.appSecret);
      await new MetaRepository(this.db).upsertIntegration(clinicId, {
        metaAppId: input.appId,
        metaAppSecretEnc: encrypted.ciphertext,
        metaRedirectUri: input.redirectUri?.trim() || null,
      });
    }

    const client = buildMetaClient({
      appId: config.appId,
      appSecret: config.appSecret,
      redirectUri: config.redirectUri ?? undefined,
    });
    if (!client) {
      throw new BadRequestError(
        "Meta app credentials are invalid (missing app id or secret)."
      );
    }

    const state = randomToken(24);
    await this.db.collection(CLINIC_COLLECTIONS.metaOauthStates).insertOne({
      state,
      clinicId,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      createdAt: nowFn(),
    });
    const authUrl = client.buildAuthUrl(state, scopes ?? META_DEFAULT_SCOPES);
    return { authUrl, state };
  }

  /**
   * Step 3 — public callback handler. Resolves the clinic from the oauth
   * `state` (NEVER from a caller-supplied clinicId), exchanges the code with
   * the clinic's own app, and maps the clinic's Meta assets.
   */
  async handleCallback(
    code: string,
    state: string
  ): Promise<{ clinicId: string; metaBusinessId: string; metaBusinessName: string | null }> {
    const oauth = await this.db
      .collection(CLINIC_COLLECTIONS.metaOauthStates)
      .findOneAndDelete({ state });
    if (!oauth) throw new BadRequestError("Invalid or expired OAuth state");
    const clinicId = (oauth as unknown as { clinicId: string }).clinicId;

    // Build the client from the clinic's stored/own app config.
    const config = await getClinicMetaAppConfig(this.db, clinicId);
    if (!config) throw new Error("Meta app config missing for clinic");
    const client = buildMetaClient({
      appId: config.appId,
      appSecret: config.appSecret,
      redirectUri: config.redirectUri ?? undefined,
    });
    if (!client) throw new Error("Meta is not configured");

    let token: { accessToken: string; expiresIn: number };
    try {
      const shortLived = await client.exchangeCodeForToken(code);
      token = await client.exchangeLongLivedToken(shortLived.accessToken);
    } catch (err) {
      if (err instanceof MetaApiError) throw new BadRequestError(`Meta OAuth failed: ${err.message}`);
      throw err;
    }

    await this.tokenService.storeToken(clinicId, token.accessToken, token.expiresIn, META_DEFAULT_SCOPES);

    // Enumerate + map assets (each step failures are isolated — one bad asset
    // type must not abort the whole connection).
    const business = new MetaBusinessService(this.db, client);
    const pages = new MetaPageService(this.db, client);
    const ig = new MetaInstagramService(this.db, client);
    const ads = new MetaAdAccountService(this.db, client);
    const forms = new MetaLeadFormService(this.db, client);

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
