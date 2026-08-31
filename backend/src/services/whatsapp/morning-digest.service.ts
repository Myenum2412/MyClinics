import type { Db } from "mongodb";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import { KOLKATA_TZ, formatDate, parseLocalDate, toLocalDateISO } from "@/clinic/core/datetime";
import { logger } from "@/lib/logger";
import { enqueueClinicNotification } from "@/services/whatsapp/notification.service";
import { pickNotifyPhone } from "@/services/whatsapp/save-notification.service";

export const MORNING_DIGEST_COLLECTION = "clc_morning_digests";
export const MORNING_DIGEST_HOUR_KOLKATA = 10;

export interface MorningDigestDoc {
  clinicId: string;
  date: string; // YYYY-MM-DD Kolkata
  sentAt: Date;
  totalAppointments: number;
  doctorsNotified: number;
  clinicNotified: boolean;
  createdAt: Date;
}

function getKolkataHourMinute(now: Date): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: KOLKATA_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return { hour, minute };
}

export function isMorningDigestHour(now: Date): boolean {
  const { hour } = getKolkataHourMinute(now);
  return hour === MORNING_DIGEST_HOUR_KOLKATA;
}

function getClinicPhone(clinic: Record<string, unknown>): string | null {
  const profile = clinic.profile as { whatsapp?: string | null } | undefined;
  const phone = (clinic.phone as string | null) ?? null;
  const whatsapp = profile?.whatsapp ?? null;
  const candidate = whatsapp ?? phone;
  return candidate && String(candidate).trim() ? String(candidate).trim() : null;
}

function buildDoctorDigestMessage(opts: {
  doctorName: string;
  clinicName: string;
  dateStr: string;
  appointments: Array<{ time: string; patientName: string; patientPhone: string | null; reason: string | null }>;
}): string {
  const dateFormatted = formatDate(parseLocalDate(opts.dateStr));
  const header = `Good Morning Dr. ${opts.doctorName} ☀️`;
  if (!opts.appointments.length) {
    return [
      header,
      "",
      `You have no appointments scheduled for today (${dateFormatted}) at ${opts.clinicName}.`,
      "",
      "Enjoy your day!",
    ].join("\n");
  }
  const count = opts.appointments.length;
  const lines: string[] = [
    header,
    "",
    `You have ${count} appointment${count > 1 ? "s" : ""} today (${dateFormatted}) at ${opts.clinicName}:`,
    "",
  ];
  opts.appointments
    .sort((a, b) => a.time.localeCompare(b.time))
    .forEach((a, idx) => {
      const phone = a.patientPhone ? ` - ${a.patientPhone}` : "";
      const reason = a.reason ? ` (${a.reason})` : "";
      lines.push(`${idx + 1}. ${a.time} - ${a.patientName}${phone}${reason}`);
    });
  lines.push("", "Please be prepared.", "", "Best regards,", opts.clinicName);
  return lines.join("\n");
}

function buildClinicDigestMessage(opts: {
  clinicName: string;
  dateStr: string;
  total: number;
  byDoctor: Array<{ doctorName: string; appointments: Array<{ time: string; patientName: string }> }>;
}): string {
  const dateFormatted = formatDate(parseLocalDate(opts.dateStr));
  const header = `Good Morning ${opts.clinicName} 🏥`;
  if (!opts.total) {
    return [
      header,
      "",
      `Appointment Summary for ${dateFormatted}:`,
      "",
      "No appointments scheduled for today.",
      "",
      "Best regards,",
      "System",
    ].join("\n");
  }
  const lines: string[] = [
    header,
    "",
    `Appointment Summary for ${dateFormatted}:`,
    `Total: ${opts.total} appointment${opts.total > 1 ? "s" : ""}`,
    "",
  ];
  for (const group of opts.byDoctor) {
    lines.push(`👨‍⚕️ Dr. ${group.doctorName}: ${group.appointments.length} appointment${group.appointments.length > 1 ? "s" : ""}`);
    for (const appt of group.appointments.sort((a, b) => a.time.localeCompare(b.time))) {
      lines.push(`  • ${appt.time} - ${appt.patientName}`);
    }
    lines.push("");
  }
  lines.push("Best regards,", "System");
  return lines.join("\n");
}

/**
 * Sends the 10 AM morning digest for a single clinic.
 * Idempotent per (clinicId, date) — duplicate calls on same day are no-ops.
 */
export async function sendMorningDigestForClinic(
  db: Db,
  clinicId: string,
  dateStr: string
): Promise<{ sentDoctors: number; sentClinic: boolean; total: number; skipped: boolean }> {
  const collection = db.collection(MORNING_DIGEST_COLLECTION);
  await collection.createIndex({ clinicId: 1, date: 1 }, { unique: true });

  // Already sent today? Skip.
  const existing = await collection.findOne({ clinicId, date: dateStr });
  if (existing) {
    return { sentDoctors: 0, sentClinic: false, total: 0, skipped: true };
  }

  const clinic = await db.collection(CLINIC_COLLECTIONS.clinics).findOne({ clinicId });
  if (!clinic) {
    logger.warn("Morning digest: clinic not found", { clinicId });
    return { sentDoctors: 0, sentClinic: false, total: 0, skipped: true };
  }

  const clinicName = String(clinic.name ?? "Clinic");
  const clinicPhone = getClinicPhone(clinic as unknown as Record<string, unknown>);

  // Fetch today's appointments (only active statuses)
  const appointments = await db
    .collection(CLINIC_COLLECTIONS.appointments)
    .find({
      clinicId,
      date: dateStr,
      status: { $in: ["scheduled", "confirmed"] },
    })
    .project({ patientId: 1, doctorId: 1, time: 1, reason: 1, date: 1 })
    .toArray();

  const total = appointments.length;

  // Fetch doctors map for this clinic
  const doctorIds = [...new Set(appointments.map((a) => String(a.doctorId)))];
  const doctors = doctorIds.length
    ? await db
        .collection(CLINIC_COLLECTIONS.doctors)
        .find({ clinicId, doctorId: { $in: doctorIds } })
        .toArray()
    : [];
  const doctorMap = new Map<string, (typeof doctors)[number]>();
  for (const d of doctors) doctorMap.set(String(d.doctorId), d);

  // Fetch patients map
  const patientIds = [...new Set(appointments.map((a) => String(a.patientId)))];
  const patients = patientIds.length
    ? await db
        .collection(CLINIC_COLLECTIONS.patients)
        .find({ clinicId, patientId: { $in: patientIds } })
        .toArray()
    : [];
  const patientMap = new Map<string, (typeof patients)[number]>();
  for (const p of patients) patientMap.set(String(p.patientId), p);

  // Group appointments by doctor
  const byDoctor = new Map<string, typeof appointments>();
  for (const appt of appointments) {
    const did = String(appt.doctorId);
    const list = byDoctor.get(did);
    if (list) list.push(appt);
    else byDoctor.set(did, [appt]);
  }

  let sentDoctors = 0;
  const byDoctorForClinic: Array<{ doctorName: string; appointments: Array<{ time: string; patientName: string }> }> = [];

  for (const [doctorId, appts] of byDoctor) {
    const doctor = doctorMap.get(doctorId);
    if (!doctor) {
      logger.warn("Morning digest: doctor not found for appointments", { clinicId, doctorId });
      continue;
    }
    const doctorName = String(doctor.name ?? doctorId);
    const doctorPhone = pickNotifyPhone(doctor as unknown as { phone: string | null; whatsapp: string | null });
    if (!doctorPhone) {
      logger.warn("Morning digest: doctor has no phone/whatsapp, skipping", { clinicId, doctorId });
      // Still include in clinic summary even if doctor not notified
      const fallbackList = appts.map((a) => {
        const pat = patientMap.get(String(a.patientId));
        return { time: String(a.time), patientName: String(pat?.fullName ?? "Patient") };
      });
      byDoctorForClinic.push({ doctorName, appointments: fallbackList });
      continue;
    }

    const doctorAppts = appts.map((a) => {
      const pat = patientMap.get(String(a.patientId));
      const patientName = String(pat?.fullName ?? "Patient");
      const patientPhone = pat ? pickNotifyPhone(pat as unknown as { phone: string | null; whatsapp: string | null; mobile: string }) : null;
      return {
        time: String(a.time),
        patientName,
        patientPhone,
        reason: a.reason ? String(a.reason) : null,
      };
    });

    const message = buildDoctorDigestMessage({
      doctorName,
      clinicName,
      dateStr,
      appointments: doctorAppts,
    });

    const result = await enqueueClinicNotification(db, doctorPhone, message, "morning_digest_doctor", undefined, clinicId);
    if (result.queued) sentDoctors += 1;

    // For clinic summary (without phone)
    byDoctorForClinic.push({
      doctorName,
      appointments: doctorAppts.map((x) => ({ time: x.time, patientName: x.patientName })),
    });
  }

  // If no appointments, still ensure clinic summary has empty byDoctor
  // (so clinic gets "no appointments" message)
  let sentClinic = false;
  if (clinicPhone) {
    const clinicMessage = buildClinicDigestMessage({
      clinicName,
      dateStr,
      total,
      byDoctor: byDoctorForClinic,
    });
    const result = await enqueueClinicNotification(db, clinicPhone, clinicMessage, "morning_digest_clinic", undefined, clinicId);
    if (result.queued) sentClinic = true;
  } else {
    logger.warn("Morning digest: clinic has no phone/whatsapp, skipping clinic digest", { clinicId });
  }

  // Record digest as sent (idempotency) — insert after queuing
  try {
    await collection.insertOne({
      clinicId,
      date: dateStr,
      sentAt: new Date(),
      totalAppointments: total,
      doctorsNotified: sentDoctors,
      clinicNotified: sentClinic,
      createdAt: new Date(),
    });
  } catch (err) {
    if (err instanceof Error && /duplicate key/i.test(err.message)) {
      // Another worker raced and inserted first — treat as skipped to avoid double-send
      return { sentDoctors: 0, sentClinic: false, total: 0, skipped: true };
    }
    throw err;
  }

  logger.info("Morning digest queued", { clinicId, date: dateStr, total, sentDoctors, sentClinic });
  return { sentDoctors, sentClinic, total, skipped: false };
}

export async function processMorningDigests(
  db: Db,
  now: Date = new Date()
): Promise<{ clinicsChecked: number; digestsSent: number; doctorsNotified: number; clinicsNotified: number }> {
  const dateStr = toLocalDateISO(now);
  const clinics = await db
    .collection(CLINIC_COLLECTIONS.clinics)
    .find({ status: { $ne: "deleted" } })
    .project({ clinicId: 1 })
    .toArray();

  let digestsSent = 0;
  let doctorsNotified = 0;
  let clinicsNotified = 0;

  for (const c of clinics) {
    const clinicId = String(c.clinicId);
    try {
      const result = await sendMorningDigestForClinic(db, clinicId, dateStr);
      if (!result.skipped) {
        digestsSent += 1;
        doctorsNotified += result.sentDoctors;
        if (result.sentClinic) clinicsNotified += 1;
      }
    } catch (err) {
      logger.error("Morning digest failed for clinic", {
        clinicId,
        date: dateStr,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { clinicsChecked: clinics.length, digestsSent, doctorsNotified, clinicsNotified };
}
