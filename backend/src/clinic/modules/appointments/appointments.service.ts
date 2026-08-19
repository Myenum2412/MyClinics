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
import { queueAppointmentNotifications } from "@/services/whatsapp/appointment-notification.service";

export class AppointmentService {
  constructor(private readonly db: Db) {}

  private repo(ctx: ClinicContext): AppointmentRepository {
    return new AppointmentRepository(this.db, requireClinicOf(ctx), {
      role: ctx.role,
      doctorId: ctx.doctorId,
      patientId: ctx.patientId,
    });
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

    const appointment = await this.repo(ctx).insert({
      appointmentId: generateAppointmentId(),
      patientId: input.patientId,
      doctorId: input.doctorId,
      date: input.date,
      time: input.time,
      status: "scheduled",
      reason: input.reason ?? null,
      notes: input.notes ?? null,
      createdBy: ctx.userId,
    });

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

    if (patch.status || patch.date || patch.time) {
      const action = patch.status === "cancelled" ? "cancelled" : "updated";
      await queueAppointmentNotifications(this.db, requireClinicOf(ctx), appointmentId, action);
    }

    return updated ?? existing;
  }

  async deleteAppointment(ctx: ClinicContext, appointmentId: string): Promise<void> {
    const repo = this.repo(ctx);
    const existing = await repo.findByAppointmentId(appointmentId);
    if (!existing) throw new NotFoundError("Appointment not found");

    await repo.softDelete(appointmentId);

    await queueAppointmentNotifications(this.db, requireClinicOf(ctx), appointmentId, "cancelled");

    await writeAudit(this.db, ctx, {
      action: "delete",
      entity: "appointment",
      entityId: appointmentId,
      metadata: { date: existing.date, time: existing.time },
    });
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