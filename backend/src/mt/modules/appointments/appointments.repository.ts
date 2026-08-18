import type { Db } from "mongodb";
import { MT_COLLECTIONS } from "@/mt/core/collections";
import type { TenantContext } from "@/mt/core/tenant-context";
import { TenantRepository } from "@/mt/core/tenant-repository";
import type { AppointmentDoc, AppointmentStatus } from "@/mt/modules/appointments/appointments.schema";

export class AppointmentRepository extends TenantRepository<AppointmentDoc> {
  constructor(db: Db, ctx: TenantContext) {
    super(db, MT_COLLECTIONS.appointments, ctx);
  }

  async findByAppointmentId(appointmentId: string): Promise<AppointmentDoc | null> {
    return this.collection.findOne(this.scoped({ appointmentId }));
  }

  async listByPatient(
    patientId: string,
    options: { skip: number; limit: number }
  ): Promise<{ items: AppointmentDoc[]; total: number }> {
    const filter = { patientId };
    const [items, total] = await Promise.all([
      this.collection
        .find(this.scoped(filter))
        .sort({ date: -1, time: -1 })
        .skip(options.skip)
        .limit(options.limit)
        .toArray(),
      this.collection.countDocuments(this.scoped(filter)),
    ]);
    return { items, total };
  }

  async listClinic(
    options: { skip: number; limit: number } & {
      status?: AppointmentStatus;
      from?: string;
      to?: string;
    }
  ): Promise<{ items: AppointmentDoc[]; total: number }> {
    const filter: Record<string, unknown> = {};
    if (options.status) filter.status = options.status;
    if (options.from || options.to) {
      filter.date = {};
      if (options.from) (filter.date as Record<string, string>).$gte = options.from;
      if (options.to) (filter.date as Record<string, string>).$lte = options.to;
    }
    const [items, total] = await Promise.all([
      this.collection
        .find(this.scoped(filter))
        .sort({ date: -1, time: -1 })
        .skip(options.skip)
        .limit(options.limit)
        .toArray(),
      this.collection.countDocuments(this.scoped(filter)),
    ]);
    return { items, total };
  }
}