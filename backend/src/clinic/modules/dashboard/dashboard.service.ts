import type { Db } from "mongodb";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import { requireClinicOf, type ClinicContext } from "@/clinic/core/context";
import { cached } from "@/lib/cache";

export class DashboardService {
  constructor(private readonly db: Db) {}

  async getSummary(ctx: ClinicContext) {
    const clinicId = requireClinicOf(ctx);
    const isDoctor = ctx.role === "doctor";
    // 30s cache per clinic+role+doctorId
    const cacheKey = `dashboard:${clinicId}:${isDoctor ? ctx.doctorId : "staff"}`;
    return cached(cacheKey, 30_000, async () => {
      const appointmentsCol = this.db.collection(CLINIC_COLLECTIONS.appointments);
      const patientsCol = this.db.collection(CLINIC_COLLECTIONS.patients);
      const doctorsCol = this.db.collection(CLINIC_COLLECTIONS.doctors);
      const prescriptionsCol = this.db.collection(CLINIC_COLLECTIONS.prescriptions);
      const billsCol = this.db.collection(CLINIC_COLLECTIONS.bills);

      const doctorFilter = isDoctor ? { doctorId: ctx.doctorId } : {};

      const [apptCount, patientCount, doctorCount, rxCount, billDocs, recentAppointments, recentPatients] =
        await Promise.all([
          appointmentsCol.countDocuments({ clinicId, ...doctorFilter } as any),
          patientsCol.countDocuments({ clinicId, status: { $ne: "deleted" }, ...doctorFilter } as any),
          doctorsCol.countDocuments({ clinicId, status: { $ne: "deleted" } }),
          prescriptionsCol.countDocuments({ clinicId, ...doctorFilter } as any),
          !isDoctor
            ? billsCol
                .find({ clinicId }, { projection: { total: 1, status: 1 } })
                .toArray()
            : Promise.resolve([] as any[]),
          appointmentsCol
            .find({ clinicId, ...doctorFilter } as any, { projection: { clinicId: 0, _id: 0 } })
            .sort({ date: -1, time: -1 })
            .limit(20)
            .toArray(),
          patientsCol
            .find({ clinicId, status: { $ne: "deleted" }, ...doctorFilter } as any, {
              projection: { patientId: 1, fullName: 1, mobile: 1, doctorId: 1 },
            })
            .sort({ createdAt: -1 })
            .limit(5)
            .toArray(),
        ]);

      // also fetch doctors map small projection for calendar titles
      const doctors = await doctorsCol
        .find({ clinicId }, { projection: { doctorId: 1, name: 1 } })
        .limit(50)
        .toArray();

      const bills = billDocs as any[];
      const totalRevenue = bills.reduce((s: number, b: any) => (b.status !== "void" ? s + (b.total ?? 0) : s), 0);

      return {
        counts: { appointments: apptCount, patients: patientCount, doctors: doctorCount, prescriptions: rxCount, revenue: totalRevenue },
        bills: !isDoctor ? bills : [],
        appointments: recentAppointments,
        patients: recentPatients,
        doctors,
      };
    });
  }
}
