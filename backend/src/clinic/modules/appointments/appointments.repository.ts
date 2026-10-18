import { now as nowFn } from "@/clinic/core/datetime";
import { escapeRegex } from "@/clinic/core/pagination";
import { paginatedJoinList, matchEntityIds, idClause } from "@/clinic/core/list-query";
import type { Db, WithId } from "mongodb";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import type { AppointmentDoc } from "@/clinic/modules/appointments/appointments.schema";

/** Appointment joined at read time with the patient/doctor details the list UI needs — never a raw id. */
export type AppointmentWithNames = WithId<AppointmentDoc> & {
  patientName: string | null;
  patientPhone: string | null;
  doctorName: string | null;
};

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
      if (this.scope.doctorId) filter.doctorId = this.scope.doctorId;
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
    /** Matches patient name, doctor name, or reason — needs the joins below, so this isn't a plain find(). */
    q?: string;
    skip: number;
    limit: number;
  }): Promise<[AppointmentWithNames[], number]> {
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

    const match: Record<string, unknown> = { ...scoped };
    if (query.q) {
      const safeQ = escapeRegex(query.q);
      const [patientIds, doctorIds] = await Promise.all([
        matchEntityIds(this.db, CLINIC_COLLECTIONS.patients, this.clinicId, "patientId", [
          { fullName: { $regex: safeQ, $options: "i" } },
        ]),
        matchEntityIds(this.db, CLINIC_COLLECTIONS.doctors, this.clinicId, "doctorId", [
          { name: { $regex: safeQ, $options: "i" } },
        ]),
      ]);
      match.$or = [
        ...idClause("patientId", patientIds),
        ...idClause("doctorId", doctorIds),
        { reason: { $regex: safeQ, $options: "i" } },
      ];
    }

    return paginatedJoinList<AppointmentWithNames>({
      collection: this.collection(),
      match,
      joins: [
        { from: CLINIC_COLLECTIONS.patients, localField: "patientId", foreignField: "patientId", as: "patient" },
        { from: CLINIC_COLLECTIONS.doctors, localField: "doctorId", foreignField: "doctorId", as: "doctor" },
      ],
      sort: { date: -1, time: -1 },
      skip: query.skip,
      limit: query.limit,
      project: [
        { $set: { patientName: "$patient.fullName", patientPhone: "$patient.mobile", doctorName: "$doctor.name" } },
        { $unset: ["patient", "doctor"] },
      ],
    });
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