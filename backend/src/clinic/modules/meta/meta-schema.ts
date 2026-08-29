import type { ClinicDocument } from "@/clinic/core/repository";

/**
 * Meta Business integration data model.
 *
 * Every collection is tenant-aware: `clinicId` is mandatory on every
 * document and is enforced by the repository base class. Meta assets carry
 * their stable Meta ids (pageId, adAccountId, formId, …) so attribution and
 * webhook tenant resolution never rely on volatile names.
 */

export type MetaIntegrationStatus =
  | "connected"
  | "disconnected"
  | "expired"
  | "reauthorization_required"
  | "error";

export type MetaAssetStatus = "active" | "inactive" | "disconnected";

export interface MetaIntegrationDoc extends ClinicDocument {
  clinicId: string;
  integrationId: string;
  metaBusinessId: string | null;
  metaBusinessName: string | null;
  /**
   * Per-clinic Meta app credentials. When set, this clinic authenticates with
   * ITS OWN Meta Business app (appId / appSecret), so the server no longer
   * needs global META_APP_ID / META_APP_SECRET env vars. Falls back to the
   * server env vars when not provided.
   */
  metaAppId: string | null;
  /** Encrypted app secret (base64, AES-256-GCM). Never returned to the UI. */
  metaAppSecretEnc: string | null;
  metaRedirectUri: string | null;
  /** Opaque reference to the encrypted token blob (see meta-crypto). */
  tokenReference: string | null;
  /** Encrypted long-lived user access token (base64). Never returned to UI. */
  encryptedToken: string | null;
  tokenExpiresAt: Date | null;
  /** Permissions (scopes) granted by the admin at connect time. */
  grantedScopes: string[];
  /** Webhook subscription status for this clinic's assets. */
  webhookStatus: "active" | "inactive" | "error";
  status: MetaIntegrationStatus;
  lastSyncedAt: Date | null;
  connectedAt: Date | null;
  disconnectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MetaPageDoc extends ClinicDocument {
  clinicId: string;
  pageId: string;
  metaIntegrationId: string;
  pageName: string;
  category: string | null;
  status: MetaAssetStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface MetaInstagramAccountDoc extends ClinicDocument {
  clinicId: string;
  instagramAccountId: string;
  metaIntegrationId: string;
  username: string | null;
  name: string | null;
  status: MetaAssetStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface MetaAdAccountDoc extends ClinicDocument {
  clinicId: string;
  adAccountId: string;
  metaIntegrationId: string;
  name: string | null;
  accountId: string | null;
  currency: string | null;
  status: MetaAssetStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface MetaLeadFormDoc extends ClinicDocument {
  clinicId: string;
  formId: string;
  metaPageId: string;
  metaIntegrationId: string;
  formName: string;
  status: MetaAssetStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Stable attribution for a Meta-originated lead. Always keyed by Meta's
 * stable ids (campaign_id, adset_id, ad_id, form_id, page_id) — never by
 * display names, which can change.
 */
export interface MetaLeadAttributionDoc extends ClinicDocument {
  clinicId: string;
  attributionId: string;
  leadId: string;
  metaLeadId: string;
  businessId: string | null;
  pageId: string | null;
  instagramAccountId: string | null;
  adAccountId: string | null;
  campaignId: string | null;
  campaignName: string | null;
  adsetId: string | null;
  adsetName: string | null;
  adId: string | null;
  adName: string | null;
  formId: string | null;
  formName: string | null;
  platform: "facebook" | "instagram" | "unknown";
  submittedAt: Date | null;
  createdAt: Date;
}

/** Clinic-configured mapping of a Meta campaign → clinic routing. */
export interface MetaCampaignMappingDoc extends ClinicDocument {
  clinicId: string;
  mappingId: string;
  metaCampaignId: string;
  metaCampaignName: string | null;
  department: string | null;
  service: string | null;
  team: string | null;
  doctorId: string | null;
  pipeline: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MetaWhatsappDoc extends ClinicDocument {
  clinicId: string;
  waBusinessId: string;
  metaIntegrationId: string;
  name: string | null;
  phoneNumberId: string | null;
  status: MetaAssetStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type MetaWebhookEventType = "leadgen";
export type MetaWebhookStatus =
  | "received"
  | "resolved"
  | "processing"
  | "duplicate"
  | "failed"
  | "dead_letter";

/** A webhook event is stored before processing so retries/dead-lettering work. */
export interface MetaWebhookEventDoc extends ClinicDocument {
  clinicId: string;
  eventId: string;
  /** Stable idempotency key (entry id + change id + leadgen id). */
  eventKey: string;
  eventType: MetaWebhookEventType;
  /** Asset id used to resolve the clinic (page id / business id). */
  resolverAssetId: string;
  metaLeadId: string | null;
  payload: Record<string, unknown>;
  status: MetaWebhookStatus;
  attempts: number;
  lastError: string | null;
  processedAt: Date | null;
  createdAt: Date;
}

export type MetaSyncStatus =
  | "pending"
  | "running"
  | "completed"
  | "partial"
  | "failed";

export interface MetaSyncJobDoc extends ClinicDocument {
  clinicId: string;
  syncJobId: string;
  triggeredBy: string | null;
  mode: "realtime" | "historical" | "date_range";
  fromDate: Date | null;
  toDate: Date | null;
  status: MetaSyncStatus;
  found: number;
  imported: number;
  duplicates: number;
  failed: number;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
}

// ── Public DTOs (safe to return to the UI — never tokens) ─────────────────

export function metaIntegrationToPublic(doc: MetaIntegrationDoc) {
  return {
    integrationId: doc.integrationId,
    metaBusinessId: doc.metaBusinessId,
    metaBusinessName: doc.metaBusinessName,
    /** True when the clinic supplies its own Meta app (per-clinic credentials). */
    hasAppCredentials: Boolean(doc.metaAppId),
    status: doc.status,
    webhookStatus: doc.webhookStatus,
    grantedScopes: doc.grantedScopes,
    tokenExpiresAt: doc.tokenExpiresAt,
    lastSyncedAt: doc.lastSyncedAt,
    connectedAt: doc.connectedAt,
    disconnectedAt: doc.disconnectedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    hasToken: Boolean(doc.encryptedToken),
  };
}

export function metaPageToPublic(doc: MetaPageDoc) {
  return {
    pageId: doc.pageId,
    pageName: doc.pageName,
    category: doc.category,
    status: doc.status,
  };
}

export function metaInstagramToPublic(doc: MetaInstagramAccountDoc) {
  return {
    instagramAccountId: doc.instagramAccountId,
    username: doc.username,
    name: doc.name,
    status: doc.status,
  };
}

export function metaAdAccountToPublic(doc: MetaAdAccountDoc) {
  return {
    adAccountId: doc.adAccountId,
    name: doc.name,
    accountId: doc.accountId,
    currency: doc.currency,
    status: doc.status,
  };
}

export function metaLeadFormToPublic(doc: MetaLeadFormDoc) {
  return {
    formId: doc.formId,
    metaPageId: doc.metaPageId,
    formName: doc.formName,
    status: doc.status,
  };
}

export function metaCampaignMappingToPublic(doc: MetaCampaignMappingDoc) {
  return {
    mappingId: doc.mappingId,
    metaCampaignId: doc.metaCampaignId,
    metaCampaignName: doc.metaCampaignName,
    department: doc.department,
    service: doc.service,
    team: doc.team,
    doctorId: doc.doctorId,
    pipeline: doc.pipeline,
  };
}

export function metaWhatsappToPublic(doc: MetaWhatsappDoc) {
  return {
    waBusinessId: doc.waBusinessId,
    name: doc.name,
    phoneNumberId: doc.phoneNumberId,
    status: doc.status,
  };
}

/**
 * Minimal WhatsApp follow-up metadata for a Meta-originated lead (section 40).
 * Only the reference + status are stored — never message bodies or PII beyond
 * what the clinic already holds. Tenant-scoped by clinicId + leadId.
 */
export type MetaWhatsappFollowupStatus =
  | "pending"
  | "contacted"
  | "responded"
  | "completed"
  | "opted_out";

export interface MetaWhatsappFollowupDoc extends ClinicDocument {
  clinicId: string;
  leadId: string;
  waBusinessId: string | null;
  /** Opaque Meta conversation/w message reference (not the message content). */
  conversationRef: string | null;
  messageStatus: string | null;
  assignedStaffId: string | null;
  status: MetaWhatsappFollowupStatus;
  lastContactedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function metaWhatsappFollowupToPublic(doc: MetaWhatsappFollowupDoc) {
  return {
    leadId: doc.leadId,
    waBusinessId: doc.waBusinessId,
    conversationRef: doc.conversationRef,
    messageStatus: doc.messageStatus,
    assignedStaffId: doc.assignedStaffId,
    status: doc.status,
    lastContactedAt: doc.lastContactedAt,
  };
}

export function metaWebhookEventToPublic(doc: MetaWebhookEventDoc) {
  return {
    eventId: doc.eventId,
    eventType: doc.eventType,
    status: doc.status,
    attempts: doc.attempts,
    lastError: doc.lastError,
    processedAt: doc.processedAt,
    createdAt: doc.createdAt,
  };
}

export function metaSyncJobToPublic(doc: MetaSyncJobDoc) {
  return {
    syncJobId: doc.syncJobId,
    mode: doc.mode,
    fromDate: doc.fromDate,
    toDate: doc.toDate,
    status: doc.status,
    found: doc.found,
    imported: doc.imported,
    duplicates: doc.duplicates,
    failed: doc.failed,
    startedAt: doc.startedAt,
    finishedAt: doc.finishedAt,
    createdAt: doc.createdAt,
  };
}

export function metaAttributionToPublic(doc: MetaLeadAttributionDoc) {
  return {
    metaLeadId: doc.metaLeadId,
    businessId: doc.businessId,
    pageId: doc.pageId,
    instagramAccountId: doc.instagramAccountId,
    adAccountId: doc.adAccountId,
    campaignId: doc.campaignId,
    campaignName: doc.campaignName,
    adsetId: doc.adsetId,
    adsetName: doc.adsetName,
    adId: doc.adId,
    adName: doc.adName,
    formId: doc.formId,
    formName: doc.formName,
    platform: doc.platform,
    submittedAt: doc.submittedAt,
  };
}
