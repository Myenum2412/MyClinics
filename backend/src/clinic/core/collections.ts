/**
 * Every collection in the clinic (multi-tenant) domain carries `clinicId` on
 * every document. Nothing is ever queried without it — enforcement happens in
 * the tenant-scoped repository base class.
 *
 * Naming: `clc_` prefix keeps the tenant domain completely separate from
 * legacy platform collections (patients, appointments, …).
 */
export const CLINIC_COLLECTIONS = {
  clinics: "clc_clinics",
  users: "clc_users",
  doctors: "clc_doctors",
  staff: "clc_staff",
  patients: "clc_patients",
  appointments: "clc_appointments",
  medicalRecords: "clc_medicine",
  medicalRecordFiles: "clc_medical_record_files",
  medicalRecordFolders: "clc_medical_record_folders",
  prescriptions: "clc_prescriptions",
  bills: "clc_bills",
  settings: "clc_settings",
  notifications: "clc_notifications",
  auditLogs: "clc_audit_logs",
  prescriptionNotifications: "clc_prescription_notifications",
  appointmentNotifications: "clc_appointment_notifications",
  clinicWelcomeDocuments: "clc_clinic_welcome_documents",
  // ── Leads ─────────────────────────────────────────────────────────────
  leads: "clc_leads",
  // ── Pharmacy Management (tenant-isolated) ────────────────────────────
  pharmacySettings: "clc_pharmacy_settings",
  pharmacyMedicines: "clc_pharmacy_medicines",
  pharmacyInventory: "clc_pharmacy_inventory",
  pharmacyStockMovements: "clc_pharmacy_stock_movements",
  pharmacySuppliers: "clc_pharmacy_suppliers",
  pharmacyPurchases: "clc_pharmacy_purchases",
  pharmacySales: "clc_pharmacy_sales",
  pharmacyAdjustments: "clc_pharmacy_adjustments",
  pharmacyTransfers: "clc_pharmacy_transfers",
  pharmacyReturns: "clc_pharmacy_returns",
  // ── Meta Business Integration (tenant-isolated) ───────────────────────
  metaIntegrations: "clc_meta_integrations",
  metaPages: "clc_meta_pages",
  metaInstagramAccounts: "clc_meta_instagram_accounts",
  metaAdAccounts: "clc_meta_ad_accounts",
  metaLeadForms: "clc_meta_lead_forms",
  metaLeadAttributions: "clc_meta_lead_attributions",
  metaCampaignMappings: "clc_meta_campaign_mappings",
  metaWhatsapp: "clc_meta_whatsapp",
  metaWhatsappFollowups: "clc_meta_whatsapp_followups",
  metaWebhookEvents: "clc_meta_webhook_events",
  metaSyncJobs: "clc_meta_sync_jobs",
  metaOauthStates: "clc_meta_oauth_states",
} as const;

export type ClinicCollectionName =
  (typeof CLINIC_COLLECTIONS)[keyof typeof CLINIC_COLLECTIONS];
