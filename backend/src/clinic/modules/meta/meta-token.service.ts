import type { Db, WithId } from "mongodb";
import { now as nowFn } from "@/clinic/core/datetime";
import { MetaRepository } from "@/clinic/modules/meta/meta.repository";
import type { MetaIntegrationDoc } from "@/clinic/modules/meta/meta-schema";
import { decryptToken, encryptToken, isExpired } from "@/clinic/modules/meta/meta-crypto";
import {
  MetaApiClient,
  MetaApiError,
} from "@/clinic/modules/meta/meta-client";
import { NotFoundError } from "@/clinic/core/errors";

/**
 * MetaTokenService — owns the lifecycle of (encrypted) Meta access tokens.
 *
 * The long-lived token is encrypted at rest and NEVER returned to the UI.
 * The frontend only ever sees `hasToken` / `tokenExpiresAt`. Health is
 * derived from token expiry + webhook status so the UI can warn admins.
 */
export class MetaTokenService {
  constructor(
    private readonly db: Db,
    private readonly client: MetaApiClient | null
  ) {}

  private repo(): MetaRepository {
    return new MetaRepository(this.db);
  }

  /** Persists an encrypted token for a clinic integration. */
  async storeToken(
    clinicId: string,
    accessToken: string,
    expiresInSeconds: number,
    scopes: string[]
  ): Promise<WithId<MetaIntegrationDoc>> {
    const encrypted = encryptToken(accessToken);
    const expiresAt =
      expiresInSeconds ? new Date(Date.now() + expiresInSeconds * 1000) : null;
    return this.repo().upsertIntegration(clinicId, {
      tokenReference: encrypted.reference,
      encryptedToken: encrypted.ciphertext,
      tokenExpiresAt: expiresAt,
      grantedScopes: scopes,
      status: "connected",
      webhookStatus: "inactive",
      connectedAt: nowFn(),
      disconnectedAt: null,
    });
  }

  /** Returns the decrypted token, or null when missing/expired. */
  async getDecryptedToken(clinicId: string): Promise<string | null> {
    const integration = await this.repo().getIntegration(clinicId);
    if (!integration?.encryptedToken || !integration?.tokenReference) return null;
    try {
      return decryptToken({
        reference: integration.tokenReference,
        ciphertext: integration.encryptedToken,
      });
    } catch {
      return null;
    }
  }

  /** Exchanges a short-lived token for a long-lived one and stores it. */
  async refreshLongLived(clinicId: string): Promise<void> {
    if (!this.client) throw new NotFoundError("Meta is not configured on this server");
    const current = await this.getDecryptedToken(clinicId);
    if (!current) throw new NotFoundError("No Meta token to refresh");
    const long = await this.client.exchangeLongLivedToken(current);
    await this.storeToken(clinicId, long.accessToken, long.expiresIn, []);
    // Re-attach previously known scopes.
    const integration = await this.repo().getIntegration(clinicId);
    if (integration) {
      await this.repo().upsertIntegration(clinicId, {
        grantedScopes: integration.grantedScopes,
      });
    }
  }

  /** Computes the connection-health status shown in the UI (section 43). */
  async health(clinicId: string): Promise<{
    status: MetaIntegrationDoc["status"];
    tokenExpiring: boolean;
    tokenExpired: boolean;
    webhookStatus: MetaIntegrationDoc["webhookStatus"];
    lastSyncedAt: Date | null;
    missingScopes: string[];
    issues: string[];
  }> {
    const integration = await this.repo().getIntegration(clinicId);
    if (!integration || integration.status === "disconnected") {
      return {
        status: "disconnected",
        tokenExpiring: false,
        tokenExpired: false,
        webhookStatus: "inactive",
        lastSyncedAt: null,
        missingScopes: [],
        issues: ["Meta Business is not connected"],
      };
    }
    const now = Date.now();
    const expiresAt = integration.tokenExpiresAt?.getTime() ?? null;
    const tokenExpired = expiresAt != null && expiresAt <= now;
    const tokenExpiring = expiresAt != null && expiresAt - now < 7 * 24 * 3600 * 1000;
    const issues: string[] = [];
    if (tokenExpired) issues.push("Meta token expired — reauthorization required");
    else if (tokenExpiring) issues.push("Meta token expires soon — reconnect recommended");
    if (integration.webhookStatus === "error") issues.push("Webhook delivery is failing");
    if (!integration.encryptedToken) issues.push("No active token stored");

    let status: MetaIntegrationDoc["status"] = integration.status;
    if (tokenExpired) status = "reauthorization_required";
    return {
      status,
      tokenExpiring,
      tokenExpired,
      webhookStatus: integration.webhookStatus,
      lastSyncedAt: integration.lastSyncedAt,
      missingScopes: [],
      issues,
    };
  }

  /** Marks the integration disconnected and wipes the stored token (section 44). */
  async disconnect(clinicId: string): Promise<void> {
    await this.repo().upsertIntegration(clinicId, {
      status: "disconnected",
      webhookStatus: "inactive",
      encryptedToken: null,
      tokenReference: null,
      tokenExpiresAt: null,
      disconnectedAt: nowFn(),
    });
  }

  static isTokenError(err: unknown): boolean {
    return err instanceof MetaApiError && (err.code === 190 || err.subcode === 463 || err.subcode === 467);
  }
}
