import { randomUUID } from "node:crypto";
import type { Db } from "mongodb";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import type { ClinicContext } from "@/clinic/core/context";
import { nowMs, todayISO } from "@/clinic/core/datetime";
import { AppError, ConflictError } from "@/clinic/core/errors";
import { AppointmentService } from "@/clinic/modules/appointments/appointments.service";
import { PatientService } from "@/clinic/modules/patients/patients.service";
import type { CreatePatientInput } from "@/clinic/modules/patients/patients.dto";
import type { PatientDoc } from "@/clinic/modules/patients/patients.schema";
import type { DoctorDoc } from "@/clinic/modules/doctors/doctors.schema";
import type { AppointmentDoc } from "@/clinic/modules/appointments/appointments.schema";
import type { MedicalRecordFileDoc } from "@/clinic/modules/medical-record/medical-record.schema";
import type { PrescriptionDoc } from "@/clinic/modules/prescriptions/prescriptions.schema";
import type { ClinicDoc } from "@/clinic/core/types";
import { logger } from "@/lib/logger";
import { downloadFromR2 } from "@/lib/r2";
import { gateway } from "@/services/whatsapp/gateway/client";
import { phoneKey } from "@/services/whatsapp/menu/state";
import { addDaysISO, generateSlots, hoursForDate, toMinutes, type HoursSource } from "@/services/whatsapp/menu/slots";
import { drName, fmtDate, fmtTime } from "@/services/whatsapp/menu/texts";
import type { ApptRef, BookResult, ChangeResult, DocRef, DoctorRef, MenuDeps, OpenDocResult, PatientRef } from "@/services/whatsapp/menu/types";

const ACTIVE_STATUSES = ["scheduled", "confirmed", "rescheduled"];
const BOOKING_WINDOW_DAYS = 7;
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const STAFF_ROLES = ["clinic_admin", "staff"];

export interface TenantDepsParams {
  db: Db;
  clinic: ClinicDoc;
  /** Sender's phone (digits, with country code). */
  phone: string;
  pushName: string | null;
  /** WhatsApp message id: makes document sends idempotent across webhook retries. */
  messageId: string;
  /** Overridable for tests. */
  io?: {
    download: (key: string) => Promise<Buffer>;
    sendDocument: typeof gateway.sendDocument;
  };
}

/** The identity the bot uses for audit trails and ownership when it writes on a patient's behalf. */
export function botContext(clinicId: string): ClinicContext {
  return {
    userId: "usr_whatsapp_bot",
    clinicId,
    role: "staff",
    name: "WhatsApp Assistant",
    email: null,
    doctorId: null,
    patientId: null,
    tokenId: "whatsapp-menu",
    ip: null,
    userAgent: "whatsapp-menu",
  };
}

/** Minutes since midnight in the clinic's timezone (IST). */
function istMinutesNow(ms: number): number {
  const parts = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" }).formatToParts(new Date(ms));
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

/** 91XXXXXXXXXX → the 10-digit number the dashboard normally stores. */
function storedMobile(digits: string): string {
  return digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
}

/** Regex matching a phone's last 10 digits regardless of spaces/dashes in the stored value. */
function phoneRegex(digits: string): { $regex: string } {
  const last10 = digits.replace(/\D/g, "").slice(-10);
  return { $regex: last10.split("").join("[\\s-]*") + "$" };
}

const truncate = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function createTenantMenuDeps(p: TenantDepsParams): MenuDeps {
  const { db, clinic, phone } = p;
  const clinicId = clinic.clinicId;
  const io = p.io ?? { download: downloadFromR2, sendDocument: gateway.sendDocument };
  const ctx = botContext(clinicId);
  const appointments = new AppointmentService(db);

  interface SettingsLite {
    workingHours?: { open: string; close: string };
    slotMinutes?: number;
  }
  let settingsCache: SettingsLite | null = null;
  let patientsCache: PatientRef[] | null = null;
  const doctorsById = new Map<string, DoctorDoc>();

  async function settings(): Promise<SettingsLite> {
    if (!settingsCache) {
      const doc = await db.collection(CLINIC_COLLECTIONS.settings).findOne({ clinicId });
      settingsCache = (doc as unknown as SettingsLite | null) ?? {};
    }
    return settingsCache;
  }

  async function hoursSource(doctor: DoctorDoc | null): Promise<HoursSource & { stepMin: number }> {
    const s = await settings();
    const clinicWh = clinic.settings?.workingHours;
    const open = s.workingHours?.open ?? clinicWh?.open ?? "09:00";
    const close = s.workingHours?.close ?? clinicWh?.close ?? "18:00";
    const step = Number(s.slotMinutes ?? clinic.settings?.slotMinutes ?? 30);
    return {
      doctorSchedule: doctor?.schedule ?? null,
      clinicHours: { open, close, days: clinicWh?.days ?? null },
      weeklySchedule: clinic.settings?.weeklySchedule ?? null,
      stepMin: Math.min(120, Math.max(10, Number.isFinite(step) ? step : 30)),
    };
  }

  async function doctor(doctorId: string): Promise<DoctorDoc | null> {
    if (!doctorsById.has(doctorId)) {
      const d = await db.collection<DoctorDoc>(CLINIC_COLLECTIONS.doctors).findOne({ clinicId, doctorId, status: "active" });
      if (d) doctorsById.set(doctorId, d);
    }
    return doctorsById.get(doctorId) ?? null;
  }

  async function bookedTimes(doctorId: string, from: string, to: string): Promise<Map<string, Set<string>>> {
    const rows = await db
      .collection<AppointmentDoc>(CLINIC_COLLECTIONS.appointments)
      .find({ clinicId, doctorId, date: { $gte: from, $lte: to }, status: { $in: ACTIVE_STATUSES } } as never)
      .toArray();
    const map = new Map<string, Set<string>>();
    for (const r of rows) {
      const set = map.get(r.date) ?? new Set<string>();
      set.add(r.time);
      map.set(r.date, set);
    }
    return map;
  }

  function slotsFor(src: HoursSource & { stepMin: number }, date: string, booked: Set<string> | undefined): string[] {
    const hours = hoursForDate(src, date);
    if (!hours) return [];
    const isToday = date === todayISO();
    return generateSlots({ hours, stepMin: src.stepMin, booked: booked ?? new Set(), nowMin: isToday ? istMinutesNow(nowMs()) : undefined });
  }

  async function ownsPatient(patientId: string): Promise<boolean> {
    return (await findPatients()).some((x) => x.id === patientId);
  }

  async function findPatients(): Promise<PatientRef[]> {
    patientsCache ??= (
      await db
        .collection<PatientDoc>(CLINIC_COLLECTIONS.patients)
        .find({
          clinicId,
          status: { $ne: "deleted" },
          $or: [{ mobile: phoneRegex(phone) }, { whatsapp: phoneRegex(phone) }],
        } as never)
        .limit(6)
        .toArray()
    ).map((x) => ({ id: x.patientId, name: x.fullName }));
    return patientsCache;
  }

  async function toApptRefs(rows: AppointmentDoc[]): Promise<ApptRef[]> {
    const ids = [...new Set(rows.map((r) => r.doctorId))];
    const docs = ids.length
      ? await db.collection<DoctorDoc>(CLINIC_COLLECTIONS.doctors).find({ clinicId, doctorId: { $in: ids } } as never).toArray()
      : [];
    const names = new Map(docs.map((d) => [d.doctorId, d.name]));
    return rows.map((r) => ({ id: r.appointmentId, doctorId: r.doctorId, doctorName: names.get(r.doctorId) ?? "Doctor", date: r.date, time: r.time }));
  }

  return {
    clinicName: clinic.name,
    now: () => nowMs(),
    today: () => todayISO(),

    findPatients,

    async listDoctors(): Promise<DoctorRef[]> {
      const rows = await db
        .collection<DoctorDoc>(CLINIC_COLLECTIONS.doctors)
        .find({ clinicId, status: "active" } as never)
        .sort({ name: 1 })
        .limit(9)
        .toArray();
      for (const d of rows) doctorsById.set(d.doctorId, d);
      return rows.map((d) => ({ id: d.doctorId, name: d.name, specialization: d.specialization ?? null }));
    },

    async availableDates(doctorId) {
      const d = await doctor(doctorId);
      if (!d) return [];
      const src = await hoursSource(d);
      const today = todayISO();
      const last = addDaysISO(today, BOOKING_WINDOW_DAYS - 1);
      const booked = await bookedTimes(doctorId, today, last);
      const out: string[] = [];
      for (let i = 0; i < BOOKING_WINDOW_DAYS; i++) {
        const date = addDaysISO(today, i);
        if (slotsFor(src, date, booked.get(date)).length > 0) out.push(date);
      }
      return out;
    },

    async freeSlots(doctorId, date) {
      const d = await doctor(doctorId);
      const today = todayISO();
      if (!d || date < today || date > addDaysISO(today, BOOKING_WINDOW_DAYS - 1)) return [];
      const booked = await bookedTimes(doctorId, date, date);
      return slotsFor(await hoursSource(d), date, booked.get(date));
    },

    async book(a): Promise<BookResult> {
      try {
        if (a.patientId && !(await ownsPatient(a.patientId))) return { ok: false, reason: "FAILED" };
        // Never trust the stored choice: re-check the slot is genuinely bookable right now.
        if (!(await this.freeSlots(a.doctorId, a.date)).includes(a.time)) return { ok: false, reason: "SLOT_TAKEN" };

        let patientId = a.patientId;
        if (!patientId) {
          const name = a.patientName.trim().length >= 2 ? a.patientName.trim().slice(0, 120) : "WhatsApp Patient";
          const created = await new PatientService(db).createPatient(ctx, {
            fullName: name,
            mobile: storedMobile(phone),
            whatsapp: storedMobile(phone),
            doctorId: a.doctorId,
            skipNotification: true,
          } as CreatePatientInput);
          patientId = created.patientId;
          patientsCache = null;
        }
        const appt = await appointments.createAppointment(
          ctx,
          { patientId, doctorId: a.doctorId, date: a.date, time: a.time, reason: "Booked via WhatsApp", notes: null },
          { skipPatientEvent: true }
        );
        return { ok: true, token: appt.tokenNumber ?? null };
      } catch (err) {
        if (err instanceof ConflictError) return { ok: false, reason: "SLOT_TAKEN" };
        logger.warn("whatsapp menu: booking failed", { clinicId, error: err instanceof Error ? err.message : String(err), code: err instanceof AppError ? err.code : undefined });
        return { ok: false, reason: "FAILED" };
      }
    },

    async listUpcoming(patientId): Promise<ApptRef[]> {
      if (!(await ownsPatient(patientId))) return [];
      const today = todayISO();
      const nowMin = istMinutesNow(nowMs());
      const rows = await db
        .collection<AppointmentDoc>(CLINIC_COLLECTIONS.appointments)
        .find({ clinicId, patientId, date: { $gte: today }, status: { $in: ACTIVE_STATUSES } } as never)
        .sort({ date: 1, time: 1 })
        .limit(10)
        .toArray();
      const upcoming = rows.filter((r) => r.date > today || toMinutes(r.time) >= nowMin - 30).slice(0, 8);
      return toApptRefs(upcoming);
    },

    async reschedule(a): Promise<ChangeResult> {
      try {
        if (!(await ownsPatient(a.patientId))) return { ok: false, reason: "NOT_FOUND" };
        const appt = await db.collection<AppointmentDoc>(CLINIC_COLLECTIONS.appointments).findOne({
          clinicId, appointmentId: a.appointmentId, patientId: a.patientId, status: { $in: ACTIVE_STATUSES },
        } as never);
        if (!appt) return { ok: false, reason: "NOT_FOUND" };
        if (!(await this.freeSlots(appt.doctorId, a.date)).includes(a.time)) return { ok: false, reason: "SLOT_TAKEN" };
        await appointments.updateAppointment(ctx, a.appointmentId, { date: a.date, time: a.time }, { skipPatientEvent: true });
        return { ok: true };
      } catch (err) {
        if (err instanceof ConflictError) return { ok: false, reason: "SLOT_TAKEN" };
        logger.warn("whatsapp menu: reschedule failed", { clinicId, error: err instanceof Error ? err.message : String(err) });
        return { ok: false, reason: "FAILED" };
      }
    },

    async cancel(a): Promise<ChangeResult> {
      try {
        if (!(await ownsPatient(a.patientId))) return { ok: false, reason: "NOT_FOUND" };
        const appt = await db.collection<AppointmentDoc>(CLINIC_COLLECTIONS.appointments).findOne({
          clinicId, appointmentId: a.appointmentId, patientId: a.patientId, status: { $in: ACTIVE_STATUSES },
        } as never);
        if (!appt) return { ok: false, reason: "NOT_FOUND" };
        await appointments.updateAppointment(ctx, a.appointmentId, { status: "cancelled" }, { skipPatientEvent: true });
        return { ok: true };
      } catch (err) {
        logger.warn("whatsapp menu: cancel failed", { clinicId, error: err instanceof Error ? err.message : String(err) });
        return { ok: false, reason: "FAILED" };
      }
    },

    async clinicInfo(): Promise<string | null> {
      const lines: string[] = [];
      const address = clinic.address || [clinic.profile?.addressLine1, clinic.profile?.city].filter(Boolean).join(", ");
      const s = await settings();
      const wh = s.workingHours ?? clinic.settings?.workingHours;
      const days = clinic.settings?.workingHours?.days;
      if (address) lines.push(`📍 ${address}`);
      if (clinic.phone) lines.push(`📞 ${clinic.phone}`);
      if (wh) lines.push(`🕘 ${days ? `${days}, ` : ""}${fmtTime(wh.open)} – ${fmtTime(wh.close)}`);
      if (clinic.website) lines.push(`🌐 ${clinic.website}`);
      return lines.length ? [`🏥 ${clinic.name}`, ...lines].join("\n") : null;
    },

    async listDocuments(patientId): Promise<DocRef[]> {
      if (!(await ownsPatient(patientId))) return [];
      const [files, rxs] = await Promise.all([
        db
          .collection<MedicalRecordFileDoc>(CLINIC_COLLECTIONS.medicalRecordFiles)
          .find({ clinicId, patientId, deletedAt: { $exists: false } } as never)
          .sort({ createdAt: -1 })
          .limit(5)
          .toArray(),
        db
          .collection<PrescriptionDoc>(CLINIC_COLLECTIONS.prescriptions)
          .find({ clinicId, patientId, deletedAt: { $exists: false } } as never)
          .sort({ visitDate: -1 })
          .limit(3)
          .toArray(),
      ]);
      return [
        ...files.map((f): DocRef => ({ id: `f:${f.fileId}`, kind: "file", label: truncate(`${f.fileName} (${fmtDate(f.createdAt.toISOString().slice(0, 10))})`, 60) })),
        ...rxs.map((r): DocRef => ({ id: `p:${r.prescriptionId}`, kind: "rx", label: `Prescription – ${fmtDate(r.visitDate)}` })),
      ];
    },

    async openDocument(patientId, doc): Promise<OpenDocResult> {
      if (!(await ownsPatient(patientId))) return { kind: "error", reason: "missing" };
      const [kind, id] = [doc.id.slice(0, 1), doc.id.slice(2)];
      try {
        if (kind === "p") {
          const rx = await db.collection<PrescriptionDoc>(CLINIC_COLLECTIONS.prescriptions).findOne({ clinicId, prescriptionId: id, patientId, deletedAt: { $exists: false } } as never);
          if (!rx) return { kind: "error", reason: "missing" };
          const dr = await doctor(rx.doctorId);
          return { kind: "text", text: prescriptionText(rx, dr?.name ?? null) };
        }
        const file = await db.collection<MedicalRecordFileDoc>(CLINIC_COLLECTIONS.medicalRecordFiles).findOne({ clinicId, fileId: id, patientId, deletedAt: { $exists: false } } as never);
        if (!file) return { kind: "error", reason: "missing" };
        if (file.size > MAX_FILE_BYTES) return { kind: "error", reason: "too_large" };
        const data = await io.download(file.r2Key);
        await io.sendDocument(clinicId, {
          to: phone,
          filename: file.fileName,
          mimetype: file.mimeType || "application/pdf",
          contentBase64: data.toString("base64"),
          dedupeKey: `menu-doc:${p.messageId}:${file.fileId}`,
        });
        return { kind: "file_sent" };
      } catch (err) {
        logger.warn("whatsapp menu: document send failed", { clinicId, error: err instanceof Error ? err.message : String(err) });
        return { kind: "error", reason: "failed" };
      }
    },

    async requestStaff({ patientName }): Promise<void> {
      const staff = await db
        .collection(CLINIC_COLLECTIONS.users)
        .find({ clinicId, role: { $in: STAFF_ROLES }, status: "active" } as never)
        .limit(50)
        .toArray();
      if (staff.length === 0) return;
      const now = new Date();
      await db.collection(CLINIC_COLLECTIONS.notifications).insertMany(
        staff.map((u) => ({
          clinicId,
          notificationId: `ntf_${randomUUID().replace(/-/g, "").slice(0, 16)}`,
          recipientUserId: u.userId as string,
          type: "general",
          title: "Patient wants to talk to staff",
          body: `${patientName ?? "A patient"} (+${phone}) asked to speak to staff on WhatsApp. Please reply from the clinic's WhatsApp.`,
          link: null,
          readAt: null,
          createdAt: now,
        }))
      );
    },
  };
}

function prescriptionText(rx: PrescriptionDoc, doctorName: string | null): string {
  const lines = [`💊 Prescription – ${fmtDate(rx.visitDate)}`];
  if (doctorName) lines.push(drName(doctorName));
  if (rx.diagnosis) lines.push(`Diagnosis: ${rx.diagnosis}`);
  if (rx.medicines?.length) {
    lines.push("");
    for (const m of rx.medicines) {
      const detail = [m.dosage, m.frequency, m.duration].filter(Boolean).join(", ");
      lines.push(`• ${m.name}${detail ? ` – ${detail}` : ""}${m.instructions ? ` (${m.instructions})` : ""}`);
    }
  }
  if (rx.notes) lines.push("", `Notes: ${rx.notes}`);
  return lines.join("\n");
}

export { phoneKey };
