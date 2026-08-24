import type { Db } from "mongodb";
import { logger } from "@/lib/logger";
import { formatDate, parseLocalDate } from "@/clinic/core/datetime";
import { downloadFromR2, getDownloadUrl } from "@/lib/r2";
import { ensureDefaultOrganization } from "@/services/customer/customer-context.service";
import { enqueueNotification } from "@/services/whatsapp/notification.service";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";

export interface Notifyable {
  fullName?: string | null;
  name?: string | null;
  mobile?: string;
  phone?: string | null;
  whatsapp?: string | null;
}

export interface ClinicDetails {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  website?: string | null;
  description?: string | null;
  settings?: {
    workingHours?: { open: string; close: string; days?: string | null } | null;
    weeklySchedule?: Array<{ day: string; open: string; close: string; closed: boolean }> | null;
    timezone?: string | null;
  } | null;
  profile?: {
    clinicType?: string | null;
    registrationNumber?: string | null;
    establishedYear?: number | null;
    whatsapp?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    pincode?: string | null;
    specializations?: string[];
    services?: string[];
    emergencyContact?: string | null;
    gstNumber?: string | null;
    taxBusinessId?: string | null;
    socialMedia?: {
      facebook?: string | null;
      instagram?: string | null;
      twitter?: string | null;
      linkedin?: string | null;
    } | null;
  } | null;
  welcomeDocuments?: Array<{
    documentId: string;
    fileName: string;
    mimeType: string | null;
    size: number;
    r2Key: string;
    downloadUrl: string;
  }>;
}

/** Prefers the dedicated WhatsApp number, falling back to the primary phone. */
export function pickNotifyPhone(p: Notifyable): string | null {
  const value = p.whatsapp ?? p.phone ?? p.mobile;
  return value && value.trim() ? value.trim() : null;
}

function firstName(p: Notifyable): string {
  const name = p.name ?? p.fullName;
  const first = name?.trim().split(/\s+/)[0];
  return first || "there";
}

async function fetchClinicDetails(db: Db, clinicId: string): Promise<ClinicDetails | null> {
  const clinic = await db.collection(CLINIC_COLLECTIONS.clinics).findOne({ clinicId });
  if (!clinic) return null;

  // Fetch welcome documents
  const welcomeDocs = await db
    .collection(CLINIC_COLLECTIONS.clinicWelcomeDocuments)
    .find({ clinicId, deletedAt: { $exists: false } })
    .toArray();

  const documentsWithUrls = await Promise.all(
    welcomeDocs.map(async (doc) => {
      const downloadUrl = await getDownloadUrl(doc.r2Key);
      return {
        documentId: doc.documentId,
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        size: doc.size,
        r2Key: doc.r2Key,
        downloadUrl,
      };
    })
  );

  return {
    name: clinic.name,
    phone: clinic.phone,
    email: clinic.email,
    address: clinic.address,
    website: clinic.website,
    description: clinic.description,
    settings: clinic.settings ?? null,
    profile: clinic.profile ?? null,
    welcomeDocuments: documentsWithUrls,
  };
}

async function queue(
  db: Db,
  phone: string,
  message: string,
  type: string,
  media?: { filename: string; mimetype: string; data: string },
  clinicId?: string | null
): Promise<void> {
  try {
    if (clinicId) {
      await enqueueNotification(db, clinicId, phone, message, type, media, clinicId);
      return;
    }
    const org = await ensureDefaultOrganization(db);
    await enqueueNotification(db, org.id, phone, message, type, media);
  } catch (err) {
    // The save already succeeded — a failed notification must not break it.
    logger.warn("save notification could not be queued", {
      type,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Builds the full clinic information block (about, contact, location, hours,
 * socials) shared by the patient welcome and staff/doctor login messages.
 */
function buildClinicInfoLines(clinicDetails: ClinicDetails): string[] {
  const lines: string[] = [];

  // ── About the clinic ──────────────────────────────────────────────────────
  if (clinicDetails.description) {
    lines.push(``, `📋 *About Us:*`, clinicDetails.description);
  }

  // ── Clinic contact & location ──────────────────────────────────────────────
  lines.push(``, `📍 *Clinic Details:*`);
  lines.push(`🏥 *${clinicDetails.name}*`);

  const p = clinicDetails.profile;

  // Build full address from profile address lines first, fall back to top-level address
  const addrParts: string[] = [];
  if (p?.addressLine1) addrParts.push(p.addressLine1);
  if (p?.addressLine2) addrParts.push(p.addressLine2);
  const cityStateCountry = [p?.city, p?.state, p?.country].filter(Boolean).join(", ");
  if (cityStateCountry) addrParts.push(cityStateCountry);
  if (p?.pincode) addrParts.push(`PIN: ${p.pincode}`);
  if (addrParts.length) {
    lines.push(`📌 ${addrParts.join(", ")}`);
  } else if (clinicDetails.address) {
    lines.push(`📌 ${clinicDetails.address}`);
  }

  // Contact numbers
  if (clinicDetails.phone) lines.push(`📞 ${clinicDetails.phone}`);
  if (p?.whatsapp && p.whatsapp !== clinicDetails.phone) lines.push(`💬 WhatsApp: ${p.whatsapp}`);

  // Email & website
  if (clinicDetails.email) lines.push(`✉️  ${clinicDetails.email}`);
  if (clinicDetails.website) lines.push(`🌐 ${clinicDetails.website}`);

  // ── Clinic profile details ────────────────────────────────────────────────
  if (p) {
    if (p.clinicType) lines.push(`🏷️  Type: ${p.clinicType}`);
    if (p.registrationNumber) lines.push(`📄 Reg. No.: ${p.registrationNumber}`);
    if (p.gstNumber) lines.push(`🧾 GST: ${p.gstNumber}`);
    if (p.taxBusinessId) lines.push(`🧾 Tax ID: ${p.taxBusinessId}`);
    if (p.establishedYear) lines.push(`📅 Est. ${p.establishedYear}`);
    if (p.specializations?.length) lines.push(`🩺 Specializations: ${p.specializations.join(", ")}`);
    if (p.services?.length) lines.push(`💊 Services: ${p.services.join(", ")}`);
    if (p.emergencyContact) lines.push(`🚨 Emergency: ${p.emergencyContact}`);
  }

  // ── Working hours ─────────────────────────────────────────────────────────
  const tz = clinicDetails.settings?.timezone;
  const weekly = clinicDetails.settings?.weeklySchedule;
  const simple = clinicDetails.settings?.workingHours;

  if (weekly?.length) {
    lines.push(``, `🕐 *Working Hours:*`);
    for (const day of weekly) {
      if (day.closed) {
        lines.push(`  ${day.day}: Closed`);
      } else {
        lines.push(`  ${day.day}: ${day.open} – ${day.close}`);
      }
    }
    if (tz) lines.push(`  (timezone: ${tz})`);
  } else if (simple?.open && simple?.close) {
    const dayInfo = simple.days ? ` (${simple.days})` : "";
    lines.push(``, `🕐 *Working Hours:* ${simple.open} – ${simple.close}${dayInfo}`);
    if (tz) lines.push(`  (timezone: ${tz})`);
  }

  // ── Social media ──────────────────────────────────────────────────────────
  const sm = p?.socialMedia;
  const socialLinks = [
    sm?.facebook ? `Facebook: ${sm.facebook}` : null,
    sm?.instagram ? `Instagram: ${sm.instagram}` : null,
    sm?.twitter ? `Twitter/X: ${sm.twitter}` : null,
    sm?.linkedin ? `LinkedIn: ${sm.linkedin}` : null,
  ].filter(Boolean);
  if (socialLinks.length) {
    lines.push(``, `📲 *Follow Us:*`);
    socialLinks.forEach((l) => lines.push(`  ${l}`));
  }

  return lines;
}

async function sendWelcomeMessageWithDocuments(
  db: Db,
  phone: string,
  patientName: string,
  clinicDetails: ClinicDetails,
  credentials?: { username: string; password: string },
  patientDocuments?: Array<{ fileName: string; size: number; downloadUrl: string }> | null,
  clinicId?: string | null
): Promise<void> {
  const lines: string[] = [
    `👋 Hi ${patientName}, welcome to *${clinicDetails.name}*!`,
    `Your patient profile has been registered successfully. ✅`,
  ];

  lines.push(...buildClinicInfoLines(clinicDetails));

  // ── Portal credentials ────────────────────────────────────────────────────
  if (credentials) {
    lines.push(
      ``,
      `🔐 *Patient Portal Login:*`,
      `  👤 Username: ${credentials.username}`,
      `  🔑 Password: ${credentials.password}`
    );
  }

  // ── Welcome documents ─────────────────────────────────────────────────────
  if (clinicDetails.welcomeDocuments?.length) {
    lines.push(``, `📎 *Welcome Documents:*`);
    for (const doc of clinicDetails.welcomeDocuments) {
      lines.push(`  • ${doc.fileName} (${formatFileSize(doc.size)})`);
      lines.push(`    📥 ${doc.downloadUrl}`);
    }
  }

  // ── Patient registration documents ────────────────────────────────────────
  if (patientDocuments?.length) {
    lines.push(``, `📎 *Uploaded Registration Files:*`);
    for (const doc of patientDocuments) {
      lines.push(`  • ${doc.fileName} (${formatFileSize(doc.size)})`);
      lines.push(`    📥 ${doc.downloadUrl}`);
    }
  }

  const message = lines.join("\n");
  await queue(db, phone, message, "patient_registered_welcome", undefined, clinicId);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Raw files above this size are NOT attached inline — the WhatsApp notification
 * document stores base64 in MongoDB (16MB doc limit), so ~10MB is the safe cap.
 * Larger files keep their download link in the welcome text instead.
 */
const MAX_INLINE_MEDIA_BYTES = 10 * 1024 * 1024;

/** Queues each clinic welcome document as an actual file attachment to the patient. */
async function queueWelcomeDocumentFiles(
  db: Db,
  phone: string,
  patientName: string,
  clinicDetails: ClinicDetails,
  clinicId?: string | null
): Promise<void> {
  const docs = clinicDetails.welcomeDocuments ?? [];
  for (const doc of docs) {
    try {
      if (!doc.r2Key || doc.size > MAX_INLINE_MEDIA_BYTES) continue;
      const data = await downloadFromR2(doc.r2Key);
      await queue(
        db,
        phone,
        `📎 Hi ${patientName}, here is "${doc.fileName}" from ${clinicDetails.name}.`,
        "patient_welcome_document",
        {
          filename: doc.fileName,
          mimetype: doc.mimeType ?? "application/octet-stream",
          data: data.toString("base64"),
        },
        clinicId
      );
    } catch (err) {
      logger.warn("welcome document could not be attached", {
        documentId: doc.documentId,
        fileName: doc.fileName,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

/** Sent to the patient after their profile is created (incl. portal credentials when opted in). */
export async function notifyPatientRegistered(
  db: Db,
  patient: Notifyable,
  opts: {
    sendCredentials: boolean;
    portalUsername?: string | null;
    password?: string | null;
    clinicId: string;
    patientDocuments?: Array<{ fileName: string; size: number; downloadUrl: string }> | null;
  } = { sendCredentials: false, clinicId: "" }
): Promise<void> {
  const phone = pickNotifyPhone(patient);
  if (!phone) return;

  // Fetch clinic details and welcome documents
  const clinicDetails = opts.clinicId ? await fetchClinicDetails(db, opts.clinicId) : null;

  if (clinicDetails) {
    await sendWelcomeMessageWithDocuments(
      db,
      phone,
      firstName(patient),
      clinicDetails,
      opts.sendCredentials && opts.portalUsername && opts.password
        ? { username: opts.portalUsername, password: opts.password! }
        : undefined,
      opts.patientDocuments,
      opts.clinicId
    );
    // Attach the clinic's welcome files as real documents.
    await queueWelcomeDocumentFiles(db, phone, firstName(patient), clinicDetails, opts.clinicId);
    return;
  }

  // Fallback to simple message if clinic details not found
  const org = await ensureDefaultOrganization(db);
  const lines = [
    `Hi ${firstName(patient)}, welcome to ${org.name}! Your patient profile has been registered successfully.`,
  ];
  if (opts.sendCredentials && opts.portalUsername && opts.password) {
    lines.push("Portal login:", `Username: ${opts.portalUsername}`, `Password: ${opts.password}`);
  }
  await queue(db, phone, lines.join("\n"), "patient_registered", undefined, opts.clinicId);
}

/** Sent to a patient when their portal credentials are reset/resent. */
export async function notifyPatientCredentials(
  db: Db,
  user: {
    patientId: string;
    name: string;
    phone?: string | null;
    whatsapp?: string | null;
    email: string;
    password: string;
    clinicId?: string;
  }
): Promise<void> {
  const phone = pickNotifyPhone(user);
  if (!phone) return;

  let clinicName = "";
  if (user.clinicId) {
    const clinic = await db.collection(CLINIC_COLLECTIONS.clinics).findOne({ clinicId: user.clinicId });
    if (clinic) {
      clinicName = clinic.name;
    }
  }
  if (!clinicName) {
    const org = await ensureDefaultOrganization(db);
    clinicName = org.name;
  }

  await queue(
    db,
    phone,
    [
      `Hi ${firstName(user)}, your patient portal login for *${clinicName}* has been reset.`,
      `Email: ${user.email}`,
      `Password: ${user.password}`,
    ].join("\n"),
    "patient_credentials",
    undefined,
    user.clinicId
  );
}

/** Sent to the patient after their profile is updated. */
export async function notifyPatientUpdated(
  db: Db,
  patient: Notifyable,
  fields: string[],
  clinicId?: string | null
): Promise<void> {
  const phone = pickNotifyPhone(patient);
  if (!phone) return;
  const org = await ensureDefaultOrganization(db);
  const detail = fields.length ? ` (updated: ${fields.join(", ")})` : "";
  await queue(
    db,
    phone,
    `Hi ${firstName(patient)}, your profile at ${org.name} has been updated successfully${detail}.`,
    "patient_updated",
    undefined,
    clinicId
  );
}

/** Sent to the assigned doctor when a new patient is registered. */
export async function notifyDoctorOfNewPatient(
  db: Db,
  doctor: Notifyable,
  patientName: string,
  clinicId?: string | null
): Promise<void> {
  const phone = pickNotifyPhone(doctor);
  if (!phone) return;
  const org = await ensureDefaultOrganization(db);
  await queue(
    db,
    phone,
    `A new patient has been registered at ${org.name}: ${patientName}. Please review their profile.`,
    "doctor_new_patient",
    undefined,
    clinicId
  );
}

/** Sent to the assigned doctor when a patient's profile is updated. */
export async function notifyDoctorOfPatientUpdate(
  db: Db,
  doctor: Notifyable,
  patientName: string,
  fields: string[],
  clinicId?: string | null
): Promise<void> {
  const phone = pickNotifyPhone(doctor);
  if (!phone) return;
  const org = await ensureDefaultOrganization(db);
  const detail = fields.length ? ` (updated: ${fields.join(", ")})` : "";
  await queue(
    db,
    phone,
    `Patient profile updated at ${org.name}: ${patientName}${detail}.`,
    "doctor_patient_updated",
    undefined,
    clinicId
  );
}

/** Sent to the patient when their assigned doctor changes. */
export async function notifyPatientAssigned(
  db: Db,
  patient: Notifyable,
  doctorName: string | null,
  clinicId?: string | null
): Promise<void> {
  const phone = pickNotifyPhone(patient);
  if (!phone) return;
  const org = await ensureDefaultOrganization(db);
  const message = doctorName
    ? `Hi ${firstName(patient)}, you have been assigned to Dr. ${doctorName} at ${org.name}.`
    : `Hi ${firstName(patient)}, you are no longer assigned to a doctor at ${org.name}.`;
  await queue(db, phone, message, "patient_assigned", undefined, clinicId);
}

/** Sent to the doctor when a patient is assigned to them. */
export async function notifyDoctorOfAssignment(
  db: Db,
  doctor: Notifyable,
  patientName: string,
  clinicId?: string | null
): Promise<void> {
  const phone = pickNotifyPhone(doctor);
  if (!phone) return;
  const org = await ensureDefaultOrganization(db);
  await queue(
    db,
    phone,
    `Patient ${patientName} has been assigned to you at ${org.name}.`,
    "doctor_patient_assigned",
    undefined,
    clinicId
  );
}

/** Sent to the doctor after their profile is created. */
export async function notifyDoctorRegistered(
  db: Db,
  doctor: Notifyable,
  clinicId?: string | null
): Promise<void> {
  const phone = pickNotifyPhone(doctor);
  if (!phone) return;
  const org = await ensureDefaultOrganization(db);
  await queue(
    db,
    phone,
    `Hi ${firstName(doctor)}, welcome to ${org.name}! Your doctor profile has been registered successfully.`,
    "doctor_registered",
    undefined,
    clinicId
  );
}

/** Sent to the doctor after their profile is updated. */
export async function notifyDoctorUpdated(
  db: Db,
  doctor: Notifyable,
  clinicId?: string | null
): Promise<void> {
  const phone = pickNotifyPhone(doctor);
  if (!phone) return;
  const org = await ensureDefaultOrganization(db);
  await queue(
    db,
    phone,
    `Hi ${firstName(doctor)}, your profile at ${org.name} has been updated successfully.`,
    "doctor_updated",
    undefined,
    clinicId
  );
}

/**
 * Sent to the patient when a medicine record is created or updated.
 * Professional, clean, 100% WhatsApp-compatible text (no HTML/tables).
 * Uses bold, emojis, line breaks and separators only.
 */
export async function notifyMedicineRecord(
  db: Db,
  patient: Notifyable & { fullName?: string | null },
  opts: {
    patientName: string;
    doctorName: string | null;
    action: "created" | "updated";
    clinicId?: string | null;
    record: {
      diagnosis: string;
      symptoms?: string | null;
      treatment?: string | null;
      notes?: string | null;
      visitDate: string;
    };
  }
): Promise<void> {
  const phone = pickNotifyPhone(patient);
  if (!phone) return;

  // Resolve clinic name from real clinic record (fallback to org)
  let clinicName = "";
  if (opts.clinicId) {
    const clinicDetails = await fetchClinicDetails(db, opts.clinicId);
    clinicName = clinicDetails?.name ?? "";
  }
  if (!clinicName) {
    const org = await ensureDefaultOrganization(db);
    clinicName = org.name;
  }

  const d = parseLocalDate(opts.record.visitDate);
  const visitDate = Number.isNaN(d.getTime())
    ? opts.record.visitDate
    : formatDate(d);

  // Extended fields (nextReviewDate, advice, …) are stored as JSON inside `notes`
  let meta: Record<string, unknown> = {};
  if (opts.record.notes && opts.record.notes.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(opts.record.notes) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        meta = parsed as Record<string, unknown>;
      }
    } catch {
      // plain-text notes — ignore
    }
  }
  const fmtDate = (v: unknown): string | null => {
    if (typeof v !== "string" || !v.trim()) return null;
    const dt = parseLocalDate(v);
    return Number.isNaN(dt.getTime())
      ? v
      : formatDate(dt);
  };
  const nextReview = fmtDate(meta.nextReviewDate);
  const advice = typeof meta.advice === "string" ? meta.advice.trim() : "";

  // WhatsApp-compatible message — bold via *text*, emojis, separators
  const sep = "────────────";
  const lines: string[] = [
    `💊 Hi *${opts.patientName}*, your medicine record at *${clinicName}* has been ${opts.action === "created" ? "added" : "updated"}.`,
    ``,
    sep,
    `📋 *RECORD DETAILS*`,
    sep,
    `👨‍⚕️ *Doctor:* ${opts.doctorName ? `Dr. ${opts.doctorName}` : "—"}`,
    `📅 *Visit Date:* *${visitDate}*`,
    `🩺 *Diagnosis:* ${opts.record.diagnosis || "—"}`,
    `🌡️ *Symptoms:* ${opts.record.symptoms?.trim() || "—"}`,
    `💉 *Treatment:* ${opts.record.treatment?.trim() || "—"}`,
    `💡 *Advice:* ${advice || "—"}`,
    ``,
    sep,
    `🔄 *Next Review Date:* *${nextReview ?? "—"}*`,
    sep,
    ``,
    `✅ Thank you for choosing *${clinicName}*.`,
    `We are committed to your health and well-being. 💚`,
  ];

  await queue(db, phone, lines.join("\n"), "medicine_record", undefined, opts.clinicId);
}

/** Sent to a doctor/staff member when their login account is created. */
export async function notifyUserLoginDetails(
  db: Db,
  user: {
    name: string;
    role: string;
    phone?: string | null;
    whatsapp?: string | null;
    email: string;
    password: string;
  },
  clinicId?: string | null
): Promise<void> {
  const phone = pickNotifyPhone(user);
  if (!phone) return;

  const clinicDetails = clinicId ? await fetchClinicDetails(db, clinicId) : null;
  const org = clinicDetails ? null : await ensureDefaultOrganization(db);
  const clinicName = clinicDetails?.name ?? org?.name ?? "";

  const lines: string[] = [
    `👋 Hi ${firstName(user)}, your ${user.role} login for *${clinicName}* has been created.`,
    ``,
    `🔐 *Login Details:*`,
    `  ✉️  Email: ${user.email}`,
    `  🔑 Password: ${user.password}`,
  ];

  if (clinicDetails) {
    lines.push(``, `━━━━━━━━━━━━━━━━━━━━`, ...buildClinicInfoLines(clinicDetails));
  }

  await queue(db, phone, lines.join("\n"), "login_details", undefined, clinicId);
}