import type { Db } from "mongodb";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import { requireClinicOf, type ClinicContext } from "@/clinic/core/context";
import { cached } from "@/lib/cache";

export class DashboardService {
  constructor(private readonly db: Db) {}

  async getSummary(ctx: ClinicContext) {
    const clinicId = requireClinicOf(ctx);
    const isDoctor = ctx.role === "doctor";
    let doctorId = ctx.doctorId;
    if (isDoctor && !doctorId) {
      const doc = await this.db.collection(CLINIC_COLLECTIONS.doctors).findOne(
        { clinicId, $or: [{ userId: ctx.userId }, ...(ctx.email ? [{ email: ctx.email }] : [])] } as any,
        { projection: { doctorId: 1 } }
      );
      if (doc?.doctorId) doctorId = doc.doctorId as string;
    }
    const cacheKey = `dashboard:${clinicId}:${isDoctor ? doctorId ?? "unknown" : "staff"}`;
    return cached(cacheKey, 30_000, async () => {
      const appointmentsCol = this.db.collection(CLINIC_COLLECTIONS.appointments);
      const patientsCol = this.db.collection(CLINIC_COLLECTIONS.patients);
      const doctorsCol = this.db.collection(CLINIC_COLLECTIONS.doctors);
      const prescriptionsCol = this.db.collection(CLINIC_COLLECTIONS.prescriptions);
      const billsCol = this.db.collection(CLINIC_COLLECTIONS.bills);

      const doctorFilter = isDoctor && doctorId ? { doctorId } : {};

      // Revenue is a sum over every non-void bill — computed server-side via $group/$sum instead
      // of pulling every bill document over the wire and reducing in JS.
      const revenueAgg = !isDoctor
        ? billsCol
            .aggregate([
              { $match: { clinicId, status: { $ne: "void" } } },
              { $group: { _id: null, totalRevenue: { $sum: "$total" }, paidRevenue: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$total", 0] } } } },
            ])
            .toArray()
        : Promise.resolve([] as any[]);

      const [apptCount, patientCount, doctorCount, rxCount, revenueRows, recentBills, recentAppointments, recentPatients] =
        await Promise.all([
          appointmentsCol.countDocuments({ clinicId, ...doctorFilter } as any),
          patientsCol.countDocuments({ clinicId, status: { $ne: "deleted" }, ...doctorFilter } as any),
          doctorsCol.countDocuments({ clinicId, status: { $ne: "deleted" } }),
          prescriptionsCol.countDocuments({ clinicId, ...doctorFilter } as any),
          revenueAgg,
          // Bounded "recent" window for the billing trend card — not every bill ever raised.
          !isDoctor
            ? billsCol
                .find({ clinicId }, { projection: { total: 1, status: 1, invoiceDate: 1, createdAt: 1 } })
                .sort({ createdAt: -1 })
                .limit(400)
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

      const totalRevenue = (revenueRows[0]?.totalRevenue as number | undefined) ?? 0;
      const paidRevenue = (revenueRows[0]?.paidRevenue as number | undefined) ?? 0;

      return {
        counts: { appointments: apptCount, patients: patientCount, doctors: doctorCount, prescriptions: rxCount, revenue: totalRevenue, paidRevenue },
        bills: recentBills,
        appointments: recentAppointments,
        patients: recentPatients,
        doctors,
      };
    });
  }
}
