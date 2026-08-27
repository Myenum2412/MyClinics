import type { Db } from "mongodb";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import { logger } from "@/lib/logger";

/**
 * Indexes for the clinic (multi-tenant) domain, created idempotently at
 * startup. Every compound index leads with `clinicId` so tenant-scoped
 * queries always use an index prefix — and the unique constraints keep
 * tenant boundaries explicit (e.g. one patient record per clinic per user,
 * one user per email).
 */
export async function ensureClinicIndexes(db: Db): Promise<void> {
  const clinics = db.collection(CLINIC_COLLECTIONS.clinics);
  const users = db.collection(CLINIC_COLLECTIONS.users);
  const doctors = db.collection(CLINIC_COLLECTIONS.doctors);
  const staff = db.collection(CLINIC_COLLECTIONS.staff);
  const patients = db.collection(CLINIC_COLLECTIONS.patients);
  const appointments = db.collection(CLINIC_COLLECTIONS.appointments);
  const medicine = db.collection(CLINIC_COLLECTIONS.medicalRecords);
  const prescriptions = db.collection(CLINIC_COLLECTIONS.prescriptions);
  const bills = db.collection(CLINIC_COLLECTIONS.bills);
  const settings = db.collection(CLINIC_COLLECTIONS.settings);
  const notifications = db.collection(CLINIC_COLLECTIONS.notifications);
  const auditLogs = db.collection(CLINIC_COLLECTIONS.auditLogs);
  const prescriptionNotifications = db.collection(CLINIC_COLLECTIONS.prescriptionNotifications);
  const appointmentNotifications = db.collection(CLINIC_COLLECTIONS.appointmentNotifications);
  const leads = db.collection(CLINIC_COLLECTIONS.leads);
  const metaIntegrations = db.collection(CLINIC_COLLECTIONS.metaIntegrations);
  const metaPages = db.collection(CLINIC_COLLECTIONS.metaPages);
  const metaInstagramAccounts = db.collection(CLINIC_COLLECTIONS.metaInstagramAccounts);
  const metaAdAccounts = db.collection(CLINIC_COLLECTIONS.metaAdAccounts);
  const metaLeadForms = db.collection(CLINIC_COLLECTIONS.metaLeadForms);
  const metaLeadAttributions = db.collection(CLINIC_COLLECTIONS.metaLeadAttributions);
  const metaCampaignMappings = db.collection(CLINIC_COLLECTIONS.metaCampaignMappings);
  const metaWhatsapp = db.collection(CLINIC_COLLECTIONS.metaWhatsapp);
  const metaWhatsappFollowups = db.collection(CLINIC_COLLECTIONS.metaWhatsappFollowups);
  const metaWebhookEvents = db.collection(CLINIC_COLLECTIONS.metaWebhookEvents);
  const metaSyncJobs = db.collection(CLINIC_COLLECTIONS.metaSyncJobs);
  const metaOauthStates = db.collection(CLINIC_COLLECTIONS.metaOauthStates);

  const indexSpecs = [
    // ── Clinics ──────────────────────────────────────────────────────────
    clinics.createIndex({ clinicId: 1 }, { unique: true }),
    clinics.createIndex({ slug: 1 }, { unique: true }),
    clinics.createIndex({ status: 1, createdAt: -1 }),
    clinics.createIndex({ name: 1 }),

    // ── Users (accounts) ─────────────────────────────────────────────────
    users.createIndex({ email: 1 }, { unique: true }),
    users.createIndex({ userId: 1 }, { unique: true }),
    users.createIndex({ clinicId: 1, role: 1, status: 1 }),
    users.createIndex({ clinicId: 1, createdAt: -1 }),
    // Only one doctor/staff/patient profile linked per account per clinic.
    // Partial (not sparse): user docs always carry the link fields as null,
    // and a sparse index still indexes explicit nulls — which would collide
    // on the second null-valued user in a clinic.
    users.createIndex(
      { clinicId: 1, doctorId: 1 },
      { unique: true, partialFilterExpression: { doctorId: { $type: "string" } } }
    ),
    users.createIndex(
      { clinicId: 1, staffId: 1 },
      { unique: true, partialFilterExpression: { staffId: { $type: "string" } } }
    ),
    users.createIndex(
      { clinicId: 1, patientId: 1 },
      { unique: true, partialFilterExpression: { patientId: { $type: "string" } } }
    ),

    // ── Doctors ──────────────────────────────────────────────────────────
    doctors.createIndex({ clinicId: 1, doctorId: 1 }, { unique: true }),
    doctors.createIndex(
      { clinicId: 1, userId: 1 },
      { unique: true, partialFilterExpression: { userId: { $type: "string" } } }
    ),
    doctors.createIndex({ clinicId: 1, specialization: 1 }),
    doctors.createIndex({ clinicId: 1, status: 1, createdAt: -1 }),
    doctors.createIndex({ clinicId: 1, name: 1 }),

    // ── Staff ────────────────────────────────────────────────────────────
    staff.createIndex({ clinicId: 1, staffId: 1 }, { unique: true }),
    staff.createIndex(
      { clinicId: 1, userId: 1 },
      { unique: true, partialFilterExpression: { userId: { $type: "string" } } }
    ),
    staff.createIndex({ clinicId: 1, position: 1 }),
    staff.createIndex({ clinicId: 1, status: 1, createdAt: -1 }),

    // ── Patients ─────────────────────────────────────────────────────────
    patients.createIndex({ clinicId: 1, patientId: 1 }, { unique: true }),
    patients.createIndex(
      { clinicId: 1, userId: 1 },
      { unique: true, partialFilterExpression: { userId: { $type: "string" } } }
    ),
    patients.createIndex({ clinicId: 1, doctorId: 1, status: 1, createdAt: -1 }),
    patients.createIndex({ clinicId: 1, mobile: 1 }),
    patients.createIndex({ clinicId: 1, fullName: 1 }),
    patients.createIndex({ clinicId: 1, email: 1 }),

    // ── Appointments ─────────────────────────────────────────────────────
    appointments.createIndex({ clinicId: 1, appointmentId: 1 }, { unique: true }),
    appointments.createIndex({ clinicId: 1, doctorId: 1, date: -1, time: -1 }),
    appointments.createIndex({ clinicId: 1, patientId: 1, date: -1 }),
    // Double-booking prevention (unique slot per doctor).
    appointments.createIndex(
      { clinicId: 1, doctorId: 1, date: 1, time: 1, status: 1 },
      { unique: true, partialFilterExpression: { status: "scheduled" } }
    ),

    // ── Medicine ─────────────────────────────────────────────────────────
    medicine.createIndex({ clinicId: 1, recordId: 1 }, { unique: true }),
    medicine.createIndex({ clinicId: 1, patientId: 1, visitDate: -1 }),
    medicine.createIndex({ clinicId: 1, doctorId: 1, visitDate: -1 }),

    // ── Prescriptions ────────────────────────────────────────────────────
    prescriptions.createIndex({ clinicId: 1, prescriptionId: 1 }, { unique: true }),
    prescriptions.createIndex({ clinicId: 1, patientId: 1, visitDate: -1 }),
    prescriptions.createIndex({ clinicId: 1, doctorId: 1, visitDate: -1 }),

    // ── Billing ──────────────────────────────────────────────────────────
    bills.createIndex({ clinicId: 1, billId: 1 }, { unique: true }),
    bills.createIndex({ clinicId: 1, billNumber: 1 }, { unique: true }),
    bills.createIndex({ clinicId: 1, patientId: 1, createdAt: -1 }),
    bills.createIndex({ clinicId: 1, status: 1, createdAt: -1 }),
    bills.createIndex({ clinicId: 1, doctorId: 1, createdAt: -1 }),

    // ── Settings ─────────────────────────────────────────────────────────
    settings.createIndex({ clinicId: 1 }, { unique: true }),

    // ── Notifications ────────────────────────────────────────────────────
    notifications.createIndex({ clinicId: 1, recipientUserId: 1, createdAt: -1 }),
    notifications.createIndex({ clinicId: 1, recipientUserId: 1, readAt: 1 }),

    // ── Audit logs ───────────────────────────────────────────────────────
    auditLogs.createIndex({ clinicId: 1, createdAt: -1 }),
    auditLogs.createIndex({ clinicId: 1, entity: 1, entityId: 1, createdAt: -1 }),
    auditLogs.createIndex({ clinicId: 1, actorId: 1, createdAt: -1 }),
    auditLogs.createIndex({ clinicId: 1, action: 1, createdAt: -1 }),

    // ── Prescription Notifications ────────────────────────────────────────
    // Per-clinic index (used when queuing from clinic context)
    prescriptionNotifications.createIndex({ clinicId: 1, prescriptionId: 1, status: 1, attempts: 1 }),
    prescriptionNotifications.createIndex({ clinicId: 1, status: 1, attempts: 1 }),
    // Global index used by the cron endpoint which queries across ALL clinics
    // (no clinicId filter). Without this, every cron tick does a full-collection scan.
    prescriptionNotifications.createIndex({ status: 1, attempts: 1, createdAt: -1 }),
    prescriptionNotifications.createIndex({ status: 1, waNotificationId: 1 }),

    // ── Appointment Notifications ─────────────────────────────────────────
    // Per-clinic index (used when queuing from clinic context)
    appointmentNotifications.createIndex({ clinicId: 1, appointmentId: 1, status: 1, attempts: 1 }),
    appointmentNotifications.createIndex({ clinicId: 1, status: 1, attempts: 1, scheduledTime: 1 }),
    // Global index used by the cron endpoint which queries across ALL clinics
    // (no clinicId filter). Without this, every cron tick does a full-collection scan.
    appointmentNotifications.createIndex({ status: 1, attempts: 1, scheduledTime: 1 }),
    appointmentNotifications.createIndex({ status: 1, waNotificationId: 1 }),

    // ── Leads ───────────────────────────────────────────────────────────
    leads.createIndex({ clinicId: 1, leadId: 1 }, { unique: true }),
    leads.createIndex({ clinicId: 1, status: 1, createdAt: -1 }),
    leads.createIndex({ clinicId: 1, assignedTo: 1, status: 1 }),
    leads.createIndex({ clinicId: 1, source: 1, createdAt: -1 }),
    leads.createIndex(
      { clinicId: 1, sourceRef: 1 },
      { unique: true, sparse: true, partialFilterExpression: { sourceRef: { $type: "string" } } }
    ),

    // ── Meta Business Integration ───────────────────────────────────────
    metaIntegrations.createIndex({ clinicId: 1 }, { unique: true }),
    metaIntegrations.createIndex({ clinicId: 1, status: 1 }),
    metaIntegrations.createIndex(
      { metaBusinessId: 1 },
      { unique: true, sparse: true, partialFilterExpression: { metaBusinessId: { $type: "string" } } }
    ),

    metaPages.createIndex({ clinicId: 1, metaIntegrationId: 1 }),
    metaPages.createIndex({ clinicId: 1, pageId: 1 }, { unique: true }),
    metaPages.createIndex({ pageId: 1 }, { unique: true }),

    metaInstagramAccounts.createIndex({ clinicId: 1, metaIntegrationId: 1 }),
    metaInstagramAccounts.createIndex({ clinicId: 1, instagramAccountId: 1 }, { unique: true }),
    metaInstagramAccounts.createIndex({ instagramAccountId: 1 }, { unique: true }),

    metaAdAccounts.createIndex({ clinicId: 1, metaIntegrationId: 1 }),
    metaAdAccounts.createIndex({ clinicId: 1, adAccountId: 1 }, { unique: true }),
    metaAdAccounts.createIndex({ adAccountId: 1 }, { unique: true }),

    metaLeadForms.createIndex({ clinicId: 1, metaPageId: 1 }),
    metaLeadForms.createIndex({ clinicId: 1, formId: 1 }, { unique: true }),
    metaLeadForms.createIndex({ formId: 1 }, { unique: true }),

    metaLeadAttributions.createIndex({ clinicId: 1, leadId: 1 }, { unique: true }),
    metaLeadAttributions.createIndex({ clinicId: 1, metaLeadId: 1 }, { unique: true }),
    metaLeadAttributions.createIndex({ clinicId: 1, campaignId: 1, adsetId: 1 }),

    metaCampaignMappings.createIndex({ clinicId: 1, metaCampaignId: 1 }, { unique: true }),
    metaCampaignMappings.createIndex({ clinicId: 1, department: 1 }),

    metaWhatsapp.createIndex({ clinicId: 1, metaIntegrationId: 1 }),
    metaWhatsapp.createIndex(
      { clinicId: 1, waBusinessId: 1 },
      { unique: true, sparse: true, partialFilterExpression: { waBusinessId: { $type: "string" } } }
    ),

    metaWhatsappFollowups.createIndex({ clinicId: 1, leadId: 1 }, { unique: true }),
    metaWhatsappFollowups.createIndex({ clinicId: 1, status: 1 }),

    // Tenant resolution index: webhook events resolve the clinic from the
    // Meta asset id — never a client-supplied clinicId.
    metaWebhookEvents.createIndex({ clinicId: 1, eventType: 1, status: 1, createdAt: -1 }),
    metaWebhookEvents.createIndex({ eventKey: 1 }, { unique: true }),
    metaWebhookEvents.createIndex(
      { clinicId: 1, metaLeadId: 1 },
      { unique: true, sparse: true, partialFilterExpression: { metaLeadId: { $type: "string" } } }
    ),

    metaSyncJobs.createIndex({ clinicId: 1, createdAt: -1 }),
    metaSyncJobs.createIndex({ clinicId: 1, status: 1 }),

    metaOauthStates.createIndex({ state: 1 }, { unique: true }),
    metaOauthStates.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ];

  // A single failing index (e.g. a unique index hitting pre-existing
  // duplicate data) must NOT take down the whole server — log and continue
  // so the API stays up. Queries simply miss that index until it's fixed.
  const results = await Promise.allSettled(indexSpecs);
  for (const r of results) {
    if (r.status === "rejected") {
      logger.warn("Failed to create a clinic index (continuing)", {
        error: String((r.reason as { message?: string })?.message ?? r.reason),
      });
    }
  }
}