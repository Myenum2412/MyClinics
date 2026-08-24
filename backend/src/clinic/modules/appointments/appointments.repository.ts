import { now as nowFn } from "@/clinic/core/datetime";
import type { Db, WithId } from "mongodb";
import type { AppointmentDoc } from "@/clinic/modules/appointments/appointments.schema";

/**
 * Appointment repository — doctor-patient scoped:
 *   doctor  → doctorId: ctx.doctorId (own appointments only)
 *   patient → patientId: ctx.patientId (own appointments only)
 */
export class AppointmentRepository {
  constructor(
    private readonly db: Db,
    private readonly clinicId: string,
    private readonly scope: {
      role: string;
      doctorId: string | null;
      patientId: string | null;
    }
  ) {}

  private collection() {
    return this.db.collection<AppointmentDoc>("clc_appointments");
  }

  private scoped(base: Record<string, unknown> = {}): Record<string, unknown> {
    const filter: Record<string, unknown> = { ...base };
    if (this.scope.role === "doctor") {
      filter.doctorId = this.scope.doctorId ?? null;
    }
    if (this.scope.role === "patient") {
      filter.patientId = this.scope.patientId ?? null;
    }
    return { clinicId: this.clinicId, ...filter };
  }

  async findByAppointmentId(appointmentId: string): Promise<WithId<AppointmentDoc> | null> {
    return this.collection().findOne(this.scoped({ appointmentId }));
  }

  async findConflicting(
    doctorId: string,
    date: string,
    time: string,
    excludeAppointmentId?: string
  ): Promise<WithId<AppointmentDoc> | null> {
    return this.collection().findOne({
      clinicId: this.clinicId,
      doctorId,
      date,
      time,
      status: "scheduled",
      ...(excludeAppointmentId ? { appointmentId: { $ne: excludeAppointmentId } } : {}),
    });
  }

  async list(query: {
    date?: string;
    from?: string;
    to?: string;
    status?: string;
    doctorId?: string;
    patientId?: string;
    skip: number;
    limit: number;
  }): Promise<[WithId<AppointmentDoc>[], number]> {
    const filter: Record<string, unknown> = {};
    if (query.date) filter.date = query.date;
    if (query.from || query.to) {
      filter.date = {
        ...(query.from ? { $gte: query.from } : {}),
        ...(query.to ? { $lte: query.to } : {}),
      };
    }
    if (query.status) filter.status = query.status;
    if (query.doctorId) filter.doctorId = query.doctorId;
    if (query.patientId) filter.patientId = query.patientId;
    const scoped = this.scoped(filter);
    const [items, total] = await Promise.all([
      this.collection()
        .find(scoped)
        .sort({ date: -1, time: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .toArray(),
      this.collection().countDocuments(scoped),
    ]);
    return [items, total];
  }

  async insert(doc: Omit<AppointmentDoc, "_id" | "clinicId" | "createdAt" | "updatedAt">): Promise<WithId<AppointmentDoc>> {
    const now = nowFn();
    await this.collection().insertOne({
      ...doc,
      clinicId: this.clinicId,
      createdAt: now,
      updatedAt: now,
    } as never);
    return (await this.findByAppointmentId(doc.appointmentId)) as WithId<AppointmentDoc>;
  }

  async update(appointmentId: string, patch: Record<string, unknown>): Promise<boolean> {
    const result = await this.collection().updateOne(
      this.scoped({ appointmentId }),
      { $set: { ...patch, updatedAt: nowFn() } }
    );
    return result.matchedCount === 1;
  }

  async softDelete(appointmentId: string): Promise<boolean> {
    const result = await this.collection().updateOne(
      this.scoped({ appointmentId }),
      { $set: { status: "cancelled", deletedAt: nowFn(), updatedAt: nowFn() } }
    );
    return result.matchedCount === 1;
  }
}