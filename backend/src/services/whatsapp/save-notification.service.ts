import type { Db } from "mongodb";
import { logger } from "@/lib/logger";
import { ensureDefaultOrganization } from "@/services/customer/customer-context.service";
import { enqueueNotification } from "@/services/whatsapp/notification.service";

export interface Notifyable {
  fullName?: string | null;
  name?: string | null;
  mobile?: string;
  phone?: string | null;
  whatsapp?: string | null;
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

async function queue(
  db: Db,
  phone: string,
  message: string,
  type: string
): Promise<void> {
  try {
    const org = await ensureDefaultOrganization(db);
    await enqueueNotification(db, org.id, phone, message, type);
  } catch (err) {
    // The save already succeeded — a failed notification must not break it.
    logger.warn("save notification could not be queued", {
      type,
      error: err instanceof Error ? err.message : String(err),
    });
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
  } = { sendCredentials: false }
): Promise<void> {
  const phone = pickNotifyPhone(patient);
  if (!phone) return;
  const org = await ensureDefaultOrganization(db);
  const lines = [
    `Hi ${firstName(patient)}, welcome to ${org.name}! Your patient profile has been registered successfully.`,
  ];
  if (opts.sendCredentials && opts.portalUsername && opts.password) {
    lines.push("Portal login:", `Username: ${opts.portalUsername}`, `Password: ${opts.password}`);
  }
  await queue(db, phone, lines.join("\n"), "patient_registered");
}

/** Sent to the patient after their profile is updated. */
export async function notifyPatientUpdated(
  db: Db,
  patient: Notifyable,
  fields: string[]
): Promise<void> {
  const phone = pickNotifyPhone(patient);
  if (!phone) return;
  const org = await ensureDefaultOrganization(db);
  const detail = fields.length ? ` (updated: ${fields.join(", ")})` : "";
  await queue(
    db,
    phone,
    `Hi ${firstName(patient)}, your profile at ${org.name} has been updated successfully${detail}.`,
    "patient_updated"
  );
}

/** Sent to the assigned doctor when a new patient is registered. */
export async function notifyDoctorOfNewPatient(
  db: Db,
  doctor: Notifyable,
  patientName: string
): Promise<void> {
  const phone = pickNotifyPhone(doctor);
  if (!phone) return;
  const org = await ensureDefaultOrganization(db);
  await queue(
    db,
    phone,
    `A new patient has been registered at ${org.name}: ${patientName}. Please review their profile.`,
    "doctor_new_patient"
  );
}

/** Sent to the assigned doctor when a patient's profile is updated. */
export async function notifyDoctorOfPatientUpdate(
  db: Db,
  doctor: Notifyable,
  patientName: string,
  fields: string[]
): Promise<void> {
  const phone = pickNotifyPhone(doctor);
  if (!phone) return;
  const org = await ensureDefaultOrganization(db);
  const detail = fields.length ? ` (updated: ${fields.join(", ")})` : "";
  await queue(
    db,
    phone,
    `Patient profile updated at ${org.name}: ${patientName}${detail}.`,
    "doctor_patient_updated"
  );
}

/** Sent to the patient when their assigned doctor changes. */
export async function notifyPatientAssigned(
  db: Db,
  patient: Notifyable,
  doctorName: string | null
): Promise<void> {
  const phone = pickNotifyPhone(patient);
  if (!phone) return;
  const org = await ensureDefaultOrganization(db);
  const message = doctorName
    ? `Hi ${firstName(patient)}, you have been assigned to Dr. ${doctorName} at ${org.name}.`
    : `Hi ${firstName(patient)}, you are no longer assigned to a doctor at ${org.name}.`;
  await queue(db, phone, message, "patient_assigned");
}

/** Sent to the doctor when a patient is assigned to them. */
export async function notifyDoctorOfAssignment(
  db: Db,
  doctor: Notifyable,
  patientName: string
): Promise<void> {
  const phone = pickNotifyPhone(doctor);
  if (!phone) return;
  const org = await ensureDefaultOrganization(db);
  await queue(
    db,
    phone,
    `Patient ${patientName} has been assigned to you at ${org.name}.`,
    "doctor_patient_assigned"
  );
}

/** Sent to the doctor after their profile is created. */
export async function notifyDoctorRegistered(
  db: Db,
  doctor: Notifyable
): Promise<void> {
  const phone = pickNotifyPhone(doctor);
  if (!phone) return;
  const org = await ensureDefaultOrganization(db);
  await queue(
    db,
    phone,
    `Hi ${firstName(doctor)}, welcome to ${org.name}! Your doctor profile has been registered successfully.`,
    "doctor_registered"
  );
}

/** Sent to the doctor after their profile is updated. */
export async function notifyDoctorUpdated(
  db: Db,
  doctor: Notifyable,
  fields: string[]
): Promise<void> {
  const phone = pickNotifyPhone(doctor);
  if (!phone) return;
  const org = await ensureDefaultOrganization(db);
  const detail = fields.length ? ` (updated: ${fields.join(", ")})` : "";
  await queue(
    db,
    phone,
    `Hi ${firstName(doctor)}, your profile at ${org.name} has been updated successfully${detail}.`,
    "doctor_updated"
  );
}

/** Sent to a doctor/staff member when their login account is created. */
export async function notifyUserLoginDetails(
  db: Db,
  user: {
    name: string;
    role: string;
    phone?: string | null;
    email: string;
    password: string;
  }
): Promise<void> {
  const phone = pickNotifyPhone(user);
  if (!phone) return;
  const org = await ensureDefaultOrganization(db);
  await queue(
    db,
    phone,
    [
      `Hi ${firstName(user)}, your ${user.role} login for ${org.name} has been created.`,
      `Email: ${user.email}`,
      `Password: ${user.password}`,
    ].join("\n"),
    "login_details"
  );
}