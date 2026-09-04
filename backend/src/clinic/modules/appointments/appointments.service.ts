import type { Db, WithId } from "mongodb";
import { writeAudit } from "@/clinic/core/audit";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import { requireClinicOf, type ClinicContext } from "@/clinic/core/context";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/clinic/core/errors";
import { generateAppointmentId } from "@/clinic/core/ids";
import type { CreateAppointmentInput, UpdateAppointmentInput } from "@/clinic/modules/appointments/appointments.dto";
import { AppointmentRepository } from "@/clinic/modules/appointments/appointments.repository";
import type { AppointmentDoc } from "@/clinic/modules/appointments/appointments.schema";
import { now as nowFn } from "@/clinic/core/datetime";
import {
  callNext,
  cancelQueue as cancelQueueToken,
  checkIn,
  complete as completeToken,
  deriveSession,
  generateTokenNumber,
  getQueueSettings,
  getQueueSnapshot,
  markNoShow as markNoShowToken,
  recall as recallToken,
  rescheduleQueue as rescheduleQueueToken,
  saveQueueSettings,
  skip as skipToken,
  startConsultation as startConsultationToken,
} from "@/clinic/modules/appointments/token.service";
import { queueAppointmentNotifications } from "@/services/whatsapp/appointment-notification.service";
import { logger } from "@/lib/logger";
import { indexEntity, removeEntity } from "@/services/search/indexer";

export class AppointmentService {
  constructor(private readonly db: Db) {}

  private repo(ctx: ClinicContext): AppointmentRepository {
    return new AppointmentRepository(this.db, requireClinicOf(ctx), {
      role: ctx.role,
      doctorId: ctx.doctorId,
      patientId: ctx.patientId,
    });
  }

  private async backfillMissingTokens(
    clinicId: string,
    doctorId: string,
    date: string,
    session: import("@/clinic/modules/appointments/appointments.schema").AppointmentSession
  ): Promise<void> {
    const col = this.db.collection<AppointmentDoc>(CLINIC_COLLECTIONS.appointments);
    // Find all appointments for this doctor/date without a token (old data has missing tokenNumber/session)
    const missingAll = await col
      .find({
        clinicId,
        doctorId,
        date,
        tokenNumber: null,
        status: { $ne: "cancelled" as const },
      })
      .sort({ time: 1 })
      .toArray();
    const missing = missingAll.filter((d) => {
      const s = d.session ?? deriveSession(d.time);
      return s === session;
    });
    if (missing.length === 0) return;
    // Find current max token for this session
    const last = await col
      .find({
        clinicId,
        doctorId,
        date,
        session: session as any,
        tokenNumber: { $ne: null },
        queueStatus: { $in: ["checked_in", "waiting", "called", "in_consultation", "skipped", "completed"] },
      })
      .sort({ tokenNumber: -1 })
      .limit(1)
      .toArray();
    let next = (last[0]?.tokenNumber ?? 0) + 1;
    for (const doc of missing) {
      await col.updateOne(
        { clinicId, appointmentId: doc.appointmentId },
        {
          $set: {
            tokenNumber: next++,
            session: session as any,
            queueStatus: doc.queueStatus ?? "waiting",
            checkedInAt: doc.checkedInAt ?? nowFn(),
            updatedAt: nowFn(),
          },
        }
      );
    }
  }

  async createAppointment(
    ctx: ClinicContext,
    input: CreateAppointmentInput
  ): Promise<WithId<AppointmentDoc>> {
    const clinicId = requireClinicOf(ctx);

    const { patient, doctor } = await this.verifyReferences(ctx, input.patientId, input.doctorId);

    // A doctor may only book appointments for their OWN patients.
    if (ctx.role === "doctor" && patient.doctorId !== ctx.doctorId) {
      throw new ForbiddenError("You can only book appointments for your own patients");
    }

    const conflict = await this.repo(ctx).findConflicting(input.doctorId, input.date, input.time);
    if (conflict) {
      throw new ConflictError("The doctor already has an appointment at this time");
    }

    // Auto-assign Token # so it shows immediately in the appointments table (no manual check-in required).
    // Tokens are per doctor / date / session (morning-afternoon-evening) and increment within that session.
    const session = deriveSession(input.time);
    await this.backfillMissingTokens(clinicId, input.doctorId, input.date, session);
    const tokenNumber = await generateTokenNumber(this.db, clinicId, input.doctorId, input.date, session);

    let appointment: WithId<AppointmentDoc>;
    try {
      appointment = await this.repo(ctx).insert({
        appointmentId: generateAppointmentId(),
        patientId: input.patientId,
        doctorId: input.doctorId,
        date: input.date,
        time: input.time,
        status: "scheduled",
        reason: input.reason ?? null,
        notes: input.notes ?? null,
        createdBy: ctx.userId,
        queueStatus: "waiting",
        tokenNumber,
        session,
        priority: false,
        checkedInAt: nowFn(),
        notifiedStages: [],
        queueHistory: [{ status: "waiting", at: nowFn(), by: ctx.userId }],
      } as never);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("E11000") || msg.includes("duplicate")) {
        throw new ConflictError("The doctor already has an appointment at this time");
      }
      throw e;
    }

    void indexEntity("appointment", clinicId, appointment.appointmentId, appointment).catch(() => {});

    await writeAudit(this.db, ctx, {
      action: "create",
      entity: "appointment",
      entityId: appointment.appointmentId,
      metadata: {
        patientId: input.patientId,
        doctorId: input.doctorId,
        date: input.date,
        time: input.time,
      },
    });

    await queueAppointmentNotifications(this.db, clinicId, appointment.appointmentId, "created");

    // Reminders are sent by the every-minute /api/cron/reminders poll once the
    // 1-hour-ahead scheduled time is reached (queued above), so no per-appointment
    // scheduler is required.

    return appointment;
  }

  async getAppointment(ctx: ClinicContext, appointmentId: string): Promise<WithId<AppointmentDoc>> {
    const appointment = await this.repo(ctx).findByAppointmentId(appointmentId);
    if (!appointment) throw new NotFoundError("Appointment not found");
    return appointment;
  }

  async listAppointments(
    ctx: ClinicContext,
    query: {
      date?: string;
      from?: string;
      to?: string;
      status?: string;
      doctorId?: string;
      patientId?: string;
      skip: number;
      limit: number;
    }
  ) {
    const [items, total] = await this.repo(ctx).list(query);
    return { items, total };
  }

  async updateAppointment(
    ctx: ClinicContext,
    appointmentId: string,
    input: UpdateAppointmentInput
  ): Promise<WithId<AppointmentDoc>> {
    const repo = this.repo(ctx);
    const existing = await repo.findByAppointmentId(appointmentId);
    if (!existing) throw new NotFoundError("Appointment not found");

    const patch: Record<string, unknown> = {};
    for (const key of ["patientId", "doctorId", "date", "time", "status", "reason", "notes"] as const) {
      const value = input[key];
      if (value !== undefined) patch[key] = value;
    }

    if (patch.status === "cancelled" && ctx.role === "doctor" && existing.doctorId !== ctx.doctorId) {
      throw new ForbiddenError();
    }

    // A doctor may only book appointments for their OWN patients.
    const newPatientId = (patch.patientId as string) ?? existing.patientId;
    const newDoctorId = (patch.doctorId as string) ?? existing.doctorId;
    if (patch.patientId || patch.doctorId) {
      const { patient } = await this.verifyReferences(ctx, newPatientId, newDoctorId);
      if (ctx.role === "doctor" && patient.doctorId !== ctx.doctorId) {
        throw new ForbiddenError("You can only book appointments for your own patients");
      }
    }

    // Re-check double booking when the slot or doctor changed.
    const newDate = (patch.date as string) ?? existing.date;
    const newTime = (patch.time as string) ?? existing.time;
    if (patch.date || patch.time || patch.doctorId) {
      const conflict = await repo.findConflicting(newDoctorId, newDate, newTime, appointmentId);
      if (conflict) {
        throw new ConflictError("The doctor already has an appointment at this time");
      }
      // Regenerate token when doctor/date/time changes so Token # stays correct and visible
      const clinicIdForToken = requireClinicOf(ctx);
      const newSession = deriveSession(newTime);
      await this.backfillMissingTokens(clinicIdForToken, newDoctorId, newDate, newSession);
      const newToken = await generateTokenNumber(this.db, clinicIdForToken, newDoctorId, newDate, newSession);
      patch.session = newSession;
      patch.tokenNumber = newToken;
      if (!existing.queueStatus || existing.queueStatus === "scheduled") {
        patch.queueStatus = "waiting";
        patch.checkedInAt = existing.checkedInAt ?? nowFn();
        patch.notifiedStages = [];
      }
    }

    if (Object.keys(patch).length === 0) return existing;

    const ok = await repo.update(appointmentId, patch);
    if (!ok) throw new NotFoundError("Appointment not found");

    await writeAudit(this.db, ctx, {
      action: "update",
      entity: "appointment",
      entityId: appointmentId,
      metadata: { fields: Object.keys(patch) },
    });

    const updated = await repo.findByAppointmentId(appointmentId);

    void indexEntity("appointment", requireClinicOf(ctx), appointmentId, updated ?? existing).catch(() => {});

    if (patch.status || patch.date || patch.time) {
      const action = patch.status === "cancelled" ? "cancelled" : "updated";
      await queueAppointmentNotifications(this.db, requireClinicOf(ctx), appointmentId, action);
      // Reminder delivery is handled by the every-minute /api/cron/reminders poll.
    }

    return updated ?? existing;
  }

  async deleteAppointment(ctx: ClinicContext, appointmentId: string): Promise<void> {
    const repo = this.repo(ctx);
    const existing = await repo.findByAppointmentId(appointmentId);
    if (!existing) throw new NotFoundError("Appointment not found");

    await repo.softDelete(appointmentId);

    void removeEntity("appointment", requireClinicOf(ctx), appointmentId).catch(() => {});

    await queueAppointmentNotifications(this.db, requireClinicOf(ctx), appointmentId, "cancelled");

    await writeAudit(this.db, ctx, {
      action: "delete",
      entity: "appointment",
      entityId: appointmentId,
      metadata: { date: existing.date, time: existing.time },
    });
  }

  // ----- Token / Queue management (Token Management methodology) -----

  /** Doctors may only manage their own queue; patients are forbidden. */
  private async assertQueueAccess(ctx: ClinicContext, appointmentId: string): Promise<void> {
    if (ctx.role === "patient") throw new ForbiddenError("Patients cannot manage the queue");
    if (ctx.role === "doctor") {
      const doc = await this.repo(ctx).findByAppointmentId(appointmentId);
      if (!doc) throw new NotFoundError("Appointment not found");
      if (doc.doctorId !== ctx.doctorId) {
        throw new ForbiddenError("You can only manage your own queue");
      }
    }
  }

  private async auditQueue(
    ctx: ClinicContext,
    action: string,
    appointmentId: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    await writeAudit(this.db, ctx, {
      action,
      entity: "appointment_queue",
      entityId: appointmentId,
      metadata,
    });
  }

  async getQueue(
    ctx: ClinicContext,
    doctorId: string | null,
    date: string
  ): Promise<import("./token.service").QueueSnapshot> {
    const clinicId = requireClinicOf(ctx);
    const effectiveDoctor = ctx.role === "doctor" ? ctx.doctorId : doctorId ?? null;
    return getQueueSnapshot(this.db, clinicId, effectiveDoctor, date);
  }

  async checkInPatient(
    ctx: ClinicContext,
    appointmentId: string,
    priority = false
  ): Promise<WithId<AppointmentDoc>> {
    const clinicId = requireClinicOf(ctx);
    await this.assertQueueAccess(ctx, appointmentId);
    const updated = await checkIn(this.db, clinicId, appointmentId, ctx, priority);
    await this.auditQueue(ctx, "queue_check_in", appointmentId, { priority });
    return updated;
  }

  async callNextPatient(
    ctx: ClinicContext,
    doctorId: string | null,
    date: string
  ): Promise<{ appointmentId: string | null }> {
    const clinicId = requireClinicOf(ctx);
    if (ctx.role === "patient") throw new ForbiddenError("Patients cannot manage the queue");
    const effectiveDoctor = ctx.role === "doctor" ? ctx.doctorId : doctorId ?? null;
    const result = await callNext(this.db, clinicId, effectiveDoctor, date, ctx);
    if (result.appointmentId) {
      await this.auditQueue(ctx, "queue_call_next", result.appointmentId, {});
    }
    return result;
  }

  async startConsultation(
    ctx: ClinicContext,
    appointmentId: string
  ): Promise<WithId<AppointmentDoc>> {
    const clinicId = requireClinicOf(ctx);
    await this.assertQueueAccess(ctx, appointmentId);
    const updated = await startConsultationToken(this.db, clinicId, appointmentId, ctx);
    await this.auditQueue(ctx, "queue_start_consultation", appointmentId, {});
    return updated;
  }

  async skipPatient(
    ctx: ClinicContext,
    appointmentId: string
  ): Promise<WithId<AppointmentDoc>> {
    const clinicId = requireClinicOf(ctx);
    await this.assertQueueAccess(ctx, appointmentId);
    const updated = await skipToken(this.db, clinicId, appointmentId, ctx);
    await this.auditQueue(ctx, "queue_skip", appointmentId, {});
    return updated;
  }

  async recallPatient(
    ctx: ClinicContext,
    appointmentId: string
  ): Promise<WithId<AppointmentDoc>> {
    const clinicId = requireClinicOf(ctx);
    await this.assertQueueAccess(ctx, appointmentId);
    const updated = await recallToken(this.db, clinicId, appointmentId, ctx);
    await this.auditQueue(ctx, "queue_recall", appointmentId, {});
    return updated;
  }

  async completePatient(
    ctx: ClinicContext,
    appointmentId: string
  ): Promise<WithId<AppointmentDoc>> {
    const clinicId = requireClinicOf(ctx);
    await this.assertQueueAccess(ctx, appointmentId);
    const updated = await completeToken(this.db, clinicId, appointmentId, ctx);
    await this.auditQueue(ctx, "queue_complete", appointmentId, {});
    return updated;
  }

  async markNoShowPatient(
    ctx: ClinicContext,
    appointmentId: string
  ): Promise<WithId<AppointmentDoc>> {
    const clinicId = requireClinicOf(ctx);
    await this.assertQueueAccess(ctx, appointmentId);
    const updated = await markNoShowToken(this.db, clinicId, appointmentId, ctx);
    await this.auditQueue(ctx, "queue_no_show", appointmentId, {});
    return updated;
  }

  async cancelQueuePatient(
    ctx: ClinicContext,
    appointmentId: string
  ): Promise<WithId<AppointmentDoc>> {
    const clinicId = requireClinicOf(ctx);
    await this.assertQueueAccess(ctx, appointmentId);
    const updated = await cancelQueueToken(this.db, clinicId, appointmentId, ctx);
    await this.auditQueue(ctx, "queue_cancel", appointmentId, {});
    return updated;
  }

  async rescheduleQueuePatient(
    ctx: ClinicContext,
    appointmentId: string,
    date: string,
    time: string
  ): Promise<WithId<AppointmentDoc>> {
    const clinicId = requireClinicOf(ctx);
    await this.assertQueueAccess(ctx, appointmentId);
    const updated = await rescheduleQueueToken(this.db, clinicId, appointmentId, ctx, date, time);
    await this.auditQueue(ctx, "queue_reschedule", appointmentId, { date, time });
    return updated;
  }

  async getQueueSettings(ctx: ClinicContext) {
    const clinicId = requireClinicOf(ctx);
    return getQueueSettings(this.db, clinicId);
  }

  async saveQueueSettings(
    ctx: ClinicContext,
    input: {
      enabledStages?: import("./token.service").QueueStage[];
      channel?: import("./token.service").QueueChannel;
      templateOverrides?: Partial<Record<import("./token.service").QueueStage, string>>;
    }
  ) {
    const clinicId = requireClinicOf(ctx);
    return saveQueueSettings(this.db, clinicId, input);
  }

  /** Validates patient + doctor references exist in this clinic. */
  private async verifyReferences(
    ctx: ClinicContext,
    patientId: string,
    doctorId: string
  ): Promise<{ patient: { doctorId: string | null }; doctor: boolean }> {
    const clinicId = requireClinicOf(ctx);
    const patient = await this.db
      .collection(CLINIC_COLLECTIONS.patients)
      .findOne({ clinicId, patientId, status: { $ne: "deleted" } });
    if (!patient) {
      throw new BadRequestError("The patient does not exist in this clinic");
    }
    const doctor = await this.db
      .collection(CLINIC_COLLECTIONS.doctors)
      .findOne({ clinicId, doctorId, status: { $ne: "deleted" } });
    if (!doctor) {
      throw new BadRequestError("The doctor does not exist in this clinic");
    }
    return {
      patient: { doctorId: (patient.doctorId as string | null) ?? null },
      doctor: true,
    };
  }
}