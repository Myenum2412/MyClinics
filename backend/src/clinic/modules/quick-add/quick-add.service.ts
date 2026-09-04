import type { Db } from "mongodb";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import { requireClinicOf, type ClinicContext } from "@/clinic/core/context";
import { BadRequestError, NotFoundError } from "@/clinic/core/errors";
import { generateAppointmentId, generateRecordId, generatePrescriptionId } from "@/clinic/core/ids";
import { now as nowFn } from "@/clinic/core/datetime";
import { writeAudit } from "@/clinic/core/audit";
import { enqueueClinicNotification } from "@/services/whatsapp/notification.service";
import { logger } from "@/lib/logger";
import type { QuickAddInput } from "./quick-add.dto";

export class QuickAddService {
  constructor(private readonly db: Db) {}

  async createQuickAdd(ctx: ClinicContext, input: QuickAddInput) {
    const clinicId = requireClinicOf(ctx);

    // Validate patient and doctor exist
    const patient = await this.db.collection(CLINIC_COLLECTIONS.patients).findOne({
      clinicId,
      patientId: input.patientId,
      status: { $ne: "deleted" },
    });
    if (!patient) throw new NotFoundError("Patient not found");

    const doctor = await this.db.collection(CLINIC_COLLECTIONS.doctors).findOne({
      clinicId,
      doctorId: input.doctorId,
      status: { $ne: "deleted" },
    });
    if (!doctor) throw new NotFoundError("Doctor not found");

    const results: Record<string, any> = {};
    const now = nowFn();
    let hasData = false;

    // 1. Appointment — direct insert without triggering separate notification
    if (input.appointment?.date && input.appointment?.time && input.appointment?.reason) {
      hasData = true;
      const appointmentId = generateAppointmentId();
      const doc: any = {
        clinicId,
        appointmentId,
        patientId: input.patientId,
        doctorId: input.doctorId,
        patientName: (patient as any).fullName,
        doctorName: (doctor as any).name,
        date: input.appointment.date,
        time: input.appointment.time,
        reason: input.appointment.reason,
        notes: input.appointment.notes ?? null,
        department: input.appointment.department ?? null,
        visitType: input.appointment.visitType ?? "New Visit",
        duration: input.appointment.duration ?? "30",
        priority: input.appointment.priority ?? "Normal",
        status: "scheduled",
        createdBy: ctx.userId,
        createdAt: now,
        updatedAt: now,
      };
      await this.db.collection(CLINIC_COLLECTIONS.appointments).insertOne(doc);
      results.appointment = { appointmentId, ...doc };
      await writeAudit(this.db, ctx, {
        action: "create",
        entity: "appointment",
        entityId: appointmentId,
        metadata: { patientId: input.patientId, doctorId: input.doctorId, date: input.appointment.date, time: input.appointment.time },
      });
    }

    // 2. Medicine record — direct insert
    if (input.record?.diagnosis && input.record?.chiefComplaint) {
      hasData = true;
      const recordId = generateRecordId();
      const validMeds = (input.record.medicines ?? []).filter((m) => m.name?.trim());
      const doc: any = {
        clinicId,
        recordId,
        patientId: input.patientId,
        doctorId: input.doctorId,
        visitDate: input.record.visitDate,
        visitTime: input.record.visitTime ?? "09:00",
        chiefComplaint: input.record.chiefComplaint,
        diagnosis: input.record.diagnosis,
        symptoms: input.record.symptoms ?? null,
        treatment: input.record.treatment ?? null,
        advice: input.record.advice ?? null,
        icdCode: input.record.icdCode ?? null,
        bp: input.record.bp ?? null,
        temp: input.record.temp ?? null,
        pulse: input.record.pulse ?? null,
        allergies: input.record.allergies ?? null,
        labTests: input.record.labTests ?? null,
        internalNotes: input.record.internalNotes ?? null,
        followUpDate: input.record.followUpDate ?? null,
        medicines: validMeds,
        createdBy: ctx.userId,
        createdAt: now,
        updatedAt: now,
      };
      await this.db.collection(CLINIC_COLLECTIONS.medicalRecords).insertOne(doc);
      results.record = { recordId, ...doc };
      await writeAudit(this.db, ctx, {
        action: "create",
        entity: "medicine_record",
        entityId: recordId,
        metadata: { patientId: input.patientId, diagnosis: input.record.diagnosis },
      });
    }

    // 3. Prescription — direct insert
    if (input.prescription?.medicine) {
      hasData = true;
      const prescriptionId = generatePrescriptionId();
      const doc: any = {
        clinicId,
        prescriptionId,
        patientId: input.patientId,
        doctorId: input.prescription.medicine ? input.doctorId : null,
        visitDate: input.prescription.visitDate ?? new Date().toISOString().slice(0, 10),
        diagnosis: input.prescription.diagnosis ?? null,
        medicines: [
          {
            name: input.prescription.medicine,
            dosage: input.prescription.dosage ?? null,
            frequency: input.prescription.frequency ?? null,
            duration: input.prescription.duration ?? null,
            instructions: input.prescription.instructions ?? null,
          },
        ],
        notes: input.prescription.notes ?? null,
        createdBy: ctx.userId,
        createdAt: now,
        updatedAt: now,
      };
      await this.db.collection(CLINIC_COLLECTIONS.prescriptions).insertOne(doc);
      results.prescription = { prescriptionId, ...doc };
      await writeAudit(this.db, ctx, {
        action: "create",
        entity: "prescription",
        entityId: prescriptionId,
        metadata: { patientId: input.patientId, medicine: input.prescription.medicine },
      });
    }

    if (!hasData) {
      throw new BadRequestError("No valid data provided for quick-add. Fill at least one section.");
    }

    // 4. Single consolidated WhatsApp notification for this quick-add only
    // Build full data summary
    const patientName = (patient as any).fullName ?? "Patient";
    const doctorName = (doctor as any).name ?? "Doctor";
    const phone = (patient as any).whatsapp ?? (patient as any).mobile ?? "";
    let notification: { queued: boolean } = { queued: false };

    if (phone) {
      const lines: string[] = [];
      lines.push(`Hi ${patientName},`);
      lines.push(``);
      lines.push(`Your visit with Dr. ${doctorName} on ${input.record?.visitDate ?? input.appointment?.date ?? new Date().toISOString().slice(0, 10)} has been recorded at ${patientName.includes("My Clinic") ? "My Clinics" : "My Clinics"}:`);
      lines.push(``);
      if (results.appointment) {
        lines.push(`• Appointment: ${results.appointment.date} at ${results.appointment.time} — ${results.appointment.reason}`);
        if (results.appointment.notes) lines.push(`  Notes: ${results.appointment.notes}`);
      }
      if (results.record) {
        lines.push(`• Visit: ${results.record.visitDate} ${results.record.visitTime ?? ""}`.trim());
        lines.push(`  Chief Complaint: ${results.record.chiefComplaint}`);
        lines.push(`  Diagnosis: ${results.record.diagnosis}`);
        if (results.record.symptoms) lines.push(`  Symptoms: ${results.record.symptoms}`);
        if (results.record.treatment) lines.push(`  Treatment: ${results.record.treatment}`);
        if (results.record.advice) lines.push(`  Advice: ${results.record.advice}`);
        if (results.record.medicines?.length) {
          const meds = results.record.medicines.map((m: any) => `${m.name}${m.dosage ? ` ${m.dosage}` : ""}${m.frequency ? ` (${m.frequency})` : ""}`).join(", ");
          lines.push(`  Medicines: ${meds}`);
        }
        if (results.record.bp || results.record.temp || results.record.pulse) {
          lines.push(`  Vitals: BP ${results.record.bp ?? "-"} | Temp ${results.record.temp ?? "-"} | Pulse ${results.record.pulse ?? "-"}`);
        }
        if (results.record.followUpDate) lines.push(`  Follow-up: ${results.record.followUpDate}`);
      }
      if (results.prescription) {
        const med = results.prescription.medicines[0];
        lines.push(`• Prescription: ${med.name}${med.dosage ? ` ${med.dosage}` : ""} ${med.frequency ?? ""} for ${med.duration ?? ""}`.trim());
        if (results.prescription.diagnosis) lines.push(`  Diagnosis: ${results.prescription.diagnosis}`);
        if (med.instructions) lines.push(`  Instructions: ${med.instructions}`);
        if (results.prescription.notes) lines.push(`  Notes: ${results.prescription.notes}`);
      }
      lines.push(``);
      lines.push(`For full details, please login to your Patient Portal.`);
      lines.push(``);
      lines.push(`Best regards,`);
      lines.push(`My Clinics`);

      const message = lines.join("\n");

      try {
        // Deduplication is handled inside enqueueClinicNotification (60s window)
        const res = await enqueueClinicNotification(this.db, phone, message, "quick_add", undefined, clinicId);
        notification = res;
        logger.info("quick-add single notification queued", { clinicId, patientId: input.patientId, queued: res.queued });
      } catch (err) {
        logger.error("quick-add notification failed", { clinicId, patientId: input.patientId, error: err instanceof Error ? err.message : String(err) });
      }
    } else {
      logger.warn("quick-add skipped WhatsApp: patient has no phone", { clinicId, patientId: input.patientId });
    }

    return { ...results, notification };
  }
}
