import type { Db } from "mongodb";
import { writeAudit } from "@/mt/core/audit";
import { NotFoundError, ValidationError } from "@/mt/core/errors";
import { randomToken } from "@/mt/core/ids";
import type { TenantContext } from "@/mt/core/tenant-context";
import type { CreateAppointmentInput, UpdateAppointmentInput } from "@/mt/modules/appointments/appointments.dto";
import { AppointmentRepository } from "@/mt/modules/appointments/appointments.repository";
import type { AppointmentDoc } from "@/mt/modules/appointments/appointments.schema";

export class AppointmentService {
  constructor(private readonly db: Db) {}

  private repo(ctx: TenantContext): AppointmentRepository {
    return new AppointmentRepository(this.db, ctx);
  }

  async createAppointment(
    ctx: TenantContext,
    input: CreateAppointmentInput
  ): Promise<AppointmentDoc> {
    const repo = this.repo(ctx);

    // The referenced patient must exist in THIS clinic — a cross-tenant
    // patientId would fail here before any write happens.
    const patient = await this.db
      .collection("mt_patients")
      .findOne({ clinicId: ctx.clinicId, patientId: input.patientId });
    if (!patient) {
      throw new NotFoundError("Patient not found in this clinic");
    }

    const now = new Date();
    const doc: Omit<AppointmentDoc, "clinicId"> = {
      appointmentId: `apt_${randomToken(16)}`,
      patientId: input.patientId,
      doctorUserId: input.doctorUserId ?? null,
      doctorName: input.doctorName ?? null,
      department: input.department ?? null,
      date: input.date,
      time: input.time,
      reason: input.reason ?? null,
      type: input.type,
      status: "pending",
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
    };

    const created = await repo.insert(doc as never);

    await writeAudit(this.db, ctx, {
      action: "create",
      entity: "appointment",
      entityId: created.appointmentId,
      metadata: { patientId: input.patientId, date: input.date, time: input.time },
    });

    return created;
  }

  async getAppointmentById(ctx: TenantContext, appointmentId: string): Promise<AppointmentDoc> {
    const appointment = await this.repo(ctx).findByAppointmentId(appointmentId);
    if (!appointment) throw new NotFoundError("Appointment not found");
    return appointment;
  }

  async listAppointments(
    ctx: TenantContext,
    query: {
      patientId?: string;
      status?: string;
      from?: string;
      to?: string;
      skip: number;
      limit: number;
    }
  ) {
    const repo = this.repo(ctx);

    // Patients can only ever list their OWN appointments.
    if (ctx.role === "patient") {
      if (!ctx.patientId) throw new NotFoundError("No patient record linked to this account");
      return repo.listByPatient(ctx.patientId, { skip: query.skip, limit: query.limit });
    }
    if (query.patientId) {
      return repo.listByPatient(query.patientId, { skip: query.skip, limit: query.limit });
    }
    return repo.listClinic({
      skip: query.skip,
      limit: query.limit,
      status: query.status as never,
      from: query.from,
      to: query.to,
    });
  }

  async updateAppointment(
    ctx: TenantContext,
    appointmentId: string,
    input: UpdateAppointmentInput
  ): Promise<AppointmentDoc> {
    const repo = this.repo(ctx);
    const existing = await repo.findByAppointmentId(appointmentId);
    if (!existing) throw new NotFoundError("Appointment not found");

    const patch: Record<string, unknown> = {};
    for (const key of [
      "doctorUserId",
      "doctorName",
      "department",
      "date",
      "time",
      "reason",
      "type",
      "status",
    ] as const) {
      if (input[key] !== undefined) patch[key] = input[key];
    }
    if (Object.keys(patch).length === 0) {
      throw new ValidationError("No fields to update");
    }
    patch.updatedAt = new Date();

    await repo.updateOne({ appointmentId }, { $set: patch });

    await writeAudit(this.db, ctx, {
      action: "update",
      entity: "appointment",
      entityId: appointmentId,
      metadata: { fields: Object.keys(patch).filter((k) => k !== "updatedAt") },
    });

    return (await repo.findByAppointmentId(appointmentId)) ?? existing;
  }

  async deleteAppointment(ctx: TenantContext, appointmentId: string): Promise<void> {
    const repo = this.repo(ctx);
    const existing = await repo.findByAppointmentId(appointmentId);
    if (!existing) throw new NotFoundError("Appointment not found");

    await repo.deleteOne({ appointmentId });

    await writeAudit(this.db, ctx, {
      action: "delete",
      entity: "appointment",
      entityId: appointmentId,
      metadata: { date: existing.date },
    });
  }
}