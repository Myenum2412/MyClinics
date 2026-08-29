import type { Db } from "mongodb";
import { MetaRepository } from "@/clinic/modules/meta/meta.repository";
import { buildMetaClient, type MetaApiClient } from "@/clinic/modules/meta/meta-client";
import { decryptToken } from "@/clinic/modules/meta/meta-crypto";

/**
 * Per-clinic Meta app configuration resolution.
 *
 * Each clinic MAY store its own Meta app credentials (appId + appSecret +
 * optional redirectUri) so it connects its OWN Meta Business account without
 * the server needing global META_APP_ID / META_APP_SECRET env vars. When a
 * clinic has not supplied its own credentials we transparently fall back to the
 * server-level env vars (preserving the previous shared-app behaviour).
 */

export interface MetaAppConfig {
  appId: string;
  appSecret: string;
  redirectUri: string | null;
}

/** Decrypts a clinic's stored Meta app secret (or null when none is stored). */
export function decryptAppSecret(encrypted: string | null | undefined): string | null {
  if (!encrypted) return null;
  try {
    return decryptToken({ reference: "", ciphertext: encrypted });
  } catch {
    return null;
  }
}

/** Resolves the effective Meta app config for a clinic (own creds → env fallback). */
export async function getClinicMetaAppConfig(db: Db, clinicId: string): Promise<MetaAppConfig | null> {
  const integration = await new MetaRepository(db).getIntegration(clinicId);
  const appId = integration?.metaAppId ?? process.env.META_APP_ID ?? null;
  const appSecret =
    decryptAppSecret(integration?.metaAppSecretEnc) ?? process.env.META_APP_SECRET ?? null;
  if (!appId || !appSecret) return null;
  return { appId, appSecret, redirectUri: integration?.metaRedirectUri ?? null };
}

/** Builds a MetaApiClient scoped to a single clinic's app config (or null). */
export async function buildMetaClientForClinic(db: Db, clinicId: string): Promise<MetaApiClient | null> {
  const cfg = await getClinicMetaAppConfig(db, clinicId);
  if (!cfg) return null;
  return buildMetaClient({
    appId: cfg.appId,
    appSecret: cfg.appSecret,
    redirectUri: cfg.redirectUri ?? undefined,
  });
}

/**
 * Resolves the Meta app secret that should be used to verify a webhook
 * signature for a given page id. The page is mapped to a clinic, whose own
 * app secret (if any) takes precedence over the server env secret.
 */
export async function resolveMetaAppSecretForPage(db: Db, pageId: string): Promise<string | null> {
  const repo = new MetaRepository(db);
  const page = await repo.findByPageId(pageId);
  if (page) {
    const integration = await repo.getIntegration(page.clinicId);
    const secret = decryptAppSecret(integration?.metaAppSecretEnc);
    if (secret) return secret;
  }
  return process.env.META_APP_SECRET ?? null;
}
