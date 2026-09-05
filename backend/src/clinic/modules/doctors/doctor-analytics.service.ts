import type { Db } from "mongodb";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import { requireClinicOf, type ClinicContext } from "@/clinic/core/context";
import { ForbiddenError, NotFoundError } from "@/clinic/core/errors";
import { endOfDayKolkata, startOfDayKolkata, parseLocalDate } from "@/clinic/core/datetime";
import { DoctorRepository } from "@/clinic/modules/doctors/doctors.repository";
import type { AppointmentDoc } from "@/clinic/modules/appointments/appointments.schema";
import type { BillDoc } from "@/clinic/modules/billing/billing.schema";
import type { PatientDoc } from "@/clinic/modules/patients/patients.schema";
import { doctorToPublic } from "@/clinic/modules/doctors/doctors.schema";

// Profit is not stored — we estimate it as a margin on collected revenue.
// This keeps analytics consistent with all billing records while being explicit
// about the assumption.
const ESTIMATED_PROFIT_MARGIN = 0.35;

function daysBetweenInclusive(from: string, to: string): number {
  const a = parseLocalDate(from);
  const b = parseLocalDate(to);
  const diff = Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  return Math.max(1, diff);
}

function fillDateSeries(
  from: string,
  to: string
): string[] {
  const out: string[] = [];
  const start = parseLocalDate(from);
  const end = parseLocalDate(to);
  for (let d = new Date(start); d.getTime() <= end.getTime(); d.setDate(d.getDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    // Use local date string via offset? But for series we can use ISO slice 0-10 from UTC midnight Kolkata instant
    // parseLocalDate ensures d is Kolkata midnight; toISOString slice gives correct date in UTC representation of that instant's date
    // Safer to format via YYYY-MM-DD from localDateISO style: reconstruct
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    // But parseLocalDate creates date at 00:00 IST as UTC instant => local date's getUTC? Let's use getDate from d in local timezone?
    // Simpler: generate via string iteration on from
    out.push(`${y}-${m}-${day}`);
  }
  // If above had off-by-one due to timezone, fallback to string increment loop
  if (out.length === 0) {
    return [];
  }
  // Correct loop using string dates directly (avoid Date timezone skew)
  const series: string[] = [];
  let cur = from;
  while (cur <= to) {
    series.push(cur);
    const parts = cur.split("-").map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + 1);
    cur = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return series;
}

export interface DoctorOverviewResult {
  doctor: ReturnType<typeof doctorToPublic>;
  range: { from: string; to: string };
  summary: {
    patientsAssigned: number;
    patientsHandled: number; // distinct patients with appointments in range
    patientsHandledAllTime: number;
    totalAppointments: number;
    completed: number;
    cancelled: number;
    noShow: number;
    scheduled: number;
    confirmed: number;
    rescheduled: number;
    completionRate: number;
    noShowRate: number;
    cancellationRate: number;
    avgPerDay: number;
    totalRevenue: number;
    totalBilled: number;
    totalPaid: number;
    outstanding: number;
    avgInvoice: number;
    revenuePerAppointment: number;
    profit: number; // estimated
    profitMargin: number;
    billsCount: number;
    billsPaid: number;
    billsIssued: number;
    billsDraft: number;
    billsVoid: number;
  };
  trends: {
    daily: { date: string; appointments: number; completed: number; cancelled: number; noShow: number; revenue: number; patients: number }[];
  };
  breakdown: {
    byStatus: { status: string; count: number; percent: number }[];
    byQueueStatus: { status: string; count: number }[];
    byPaymentStatus: { status: string; count: number; amount: number }[];
  };
  recent: {
    appointments: unknown[];
    bills: unknown[];
    patients: unknown[];
  };
}

export class DoctorAnalyticsService {
  constructor(private readonly db: Db) {}

  async getOverview(
    ctx: ClinicContext,
    doctorId: string,
    query: { from?: string; to?: string }
  ): Promise<DoctorOverviewResult> {
    const clinicId = requireClinicOf(ctx);
    if (ctx.role === "doctor" && ctx.doctorId !== doctorId) {
      throw new ForbiddenError("Doctors may only view their own performance overview");
    }

    const repo = new DoctorRepository(this.db, clinicId);
    const doctor = await repo.findByDoctorId(doctorId);
    if (!doctor) throw new NotFoundError("Doctor not found");

    // Resolve range — default last 30 days inclusive
    const todayStr = new Date().toISOString().slice(0, 10); // approximate; we will use local but ok for default
    // Use local date for today via toLocalDateISO logic without importing full helper dependency cycle
    // Compute today in Asia/Kolkata via Intl
    const todayLocal = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    let from = query.from ?? (() => {
      const d = new Date(parseLocalDate(todayLocal));
      d.setDate(d.getDate() - 29);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    })();
    let to = query.to ?? todayLocal;
    if (from > to) [from, to] = [to, from];

    const days = daysBetweenInclusive(from, to);
    const dateSeries = fillDateSeries(from, to);

    // ── APPOINTMENTS ────────────────────────────────────────────────────────
    const apptFilter: Record<string, unknown> = {
      clinicId,
      doctorId,
      date: { $gte: from, $lte: to },
    };
    // For "not deleted" — appointments use soft delete via status cancelled + deletedAt
    // We include all statuses; cancelled is a valid status to count.
    const appointments = await this.db
      .collection<AppointmentDoc>(CLINIC_COLLECTIONS.appointments)
      .find(apptFilter, { projection: { patientId: 1, date: 1, time: 1, status: 1, queueStatus: 1, createdAt: 1 } })
      .toArray();

    // All-time distinct patients for context
    let allTimeSetSize = 0;
    try {
      const colAny = this.db.collection<AppointmentDoc>(CLINIC_COLLECTIONS.appointments) as unknown as { distinct?: (key: string, filter: unknown) => Promise<unknown[]> };
      if (colAny.distinct) {
        const allTimePatientIds = await colAny.distinct("patientId", { clinicId, doctorId } as never);
        allTimeSetSize = Array.isArray(allTimePatientIds) ? allTimePatientIds.length : 0;
      } else {
        throw new Error("no distinct");
      }
    } catch {
      // Fallback for fake-db / in-memory: deduplicate via find
      const all = await this.db
        .collection<AppointmentDoc>(CLINIC_COLLECTIONS.appointments)
        .find({ clinicId, doctorId } as never, { projection: { patientId: 1 } } as never)
        .toArray();
      allTimeSetSize = new Set(all.map((a) => String((a as unknown as { patientId: unknown }).patientId ?? ""))).size;
    }

    const distinctInRange = new Set<string>();
    for (const a of appointments) if (a.patientId) distinctInRange.add(String(a.patientId));

    const statusCounts: Record<string, number> = {};
    const queueCounts: Record<string, number> = {};
    let completed = 0, cancelled = 0, noShow = 0, scheduled = 0, confirmed = 0, rescheduled = 0;
    for (const a of appointments) {
      const s = String(a.status ?? "scheduled");
      statusCounts[s] = (statusCounts[s] ?? 0) + 1;
      const qs = a.queueStatus ? String(a.queueStatus) : "scheduled";
      queueCounts[qs] = (queueCounts[qs] ?? 0) + 1;
      if (s === "completed") completed++;
      else if (s === "cancelled") cancelled++;
      else if (s === "no_show") noShow++;
      else if (s === "scheduled") scheduled++;
      else if (s === "confirmed") confirmed++;
      else if (s === "rescheduled") rescheduled++;
    }
    const totalAppointments = appointments.length;
    const completionRate = totalAppointments ? Math.round((completed / totalAppointments) * 1000) / 10 : 0;
    const noShowRate = totalAppointments ? Math.round((noShow / totalAppointments) * 1000) / 10 : 0;
    const cancellationRate = totalAppointments ? Math.round((cancelled / totalAppointments) * 1000) / 10 : 0;
    const avgPerDay = totalAppointments ? Math.round((totalAppointments / days) * 10) / 10 : 0;

    // Daily trend map
    const dailyMap = new Map<string, { appointments: number; completed: number; cancelled: number; noShow: number; patients: Set<string> }>();
    for (const d of dateSeries) dailyMap.set(d, { appointments: 0, completed: 0, cancelled: 0, noShow: 0, patients: new Set() });
    for (const a of appointments) {
      const entry = dailyMap.get(String(a.date));
      if (!entry) continue;
      entry.appointments += 1;
      if (String(a.status) === "completed") entry.completed += 1;
      if (String(a.status) === "cancelled") entry.cancelled += 1;
      if (String(a.status) === "no_show") entry.noShow += 1;
      if (a.patientId) entry.patients.add(String(a.patientId));
    }

    // ── BILLS ────────────────────────────────────────────────────────────────
    // Bills are stored with invoiceDate Date (Kolkata midnight) and amountPaid/total
    // We filter by invoiceDate within range (fallback to createdAt if invoiceDate missing)
    const billsCol = this.db.collection<BillDoc>(CLINIC_COLLECTIONS.bills);
    // Use explicit Date range for invoiceDate
    const fromStart = startOfDayKolkata(from);
    const toEnd = endOfDayKolkata(to);
    const bills = await billsCol
      .find(
        {
          clinicId,
          doctorId,
          status: { $ne: "void" as const },
          $or: [
            { invoiceDate: { $gte: fromStart, $lte: toEnd } },
            { invoiceDate: null, createdAt: { $gte: fromStart, $lte: toEnd } } as never,
            { invoiceDate: { $exists: false }, createdAt: { $gte: fromStart, $lte: toEnd } } as never,
          ],
          // Also ensure not soft-deleted (deletedAt absent)
        } as never,
        { projection: { total: 1, amountPaid: 1, balanceDue: 1, status: 1, paymentStatus: 1, invoiceDate: 1, createdAt: 1, billNumber: 1, patientId: 1, subtotal: 1, taxAmount: 1, discount: 1 } } as never
      )
      .toArray() as unknown as BillDoc[];

    // Fallback: if query using $or missed due to status=void filter, but most bills have invoiceDate, the $or is redundant — simpler broad match:
    // Ensure bills retrieved correctly even when invoiceDate absent — we already covered.
    // If bills empty but there are bills with invoiceDate null fallback, we also counted.
    // For safety, if bills is 0 and there are bills with doctorId but no invoiceDate, they would have been excluded if $or not matched — but we already included.

    let totalRevenue = 0, totalBilled = 0, totalPaid = 0, outstanding = 0;
    let billsPaid = 0, billsIssued = 0, billsDraft = 0, billsVoid = 0;
    const byPayment: Record<string, { count: number; amount: number }> = {};
    const revenueByDate = new Map<string, number>();
    for (const d of dateSeries) revenueByDate.set(d, 0);
    for (const b of bills) {
      const total = Number(b.total ?? 0);
      const paid = Number(b.amountPaid ?? 0);
      const s = String(b.status ?? "draft");
      if (s === "paid") billsPaid++;
      else if (s === "issued") billsIssued++;
      else if (s === "draft") billsDraft++;
      else if (s === "void") billsVoid++;
      // Revenue is total for non-void
      if (s !== "void") {
        totalRevenue += total;
        totalBilled += total;
        totalPaid += paid;
        outstanding += Math.max(0, total - paid);
        const invDate = b.invoiceDate ? new Date(b.invoiceDate as unknown as Date) : (b.createdAt ? new Date(b.createdAt as unknown as Date) : null);
        if (invDate) {
          const iso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(invDate);
          if (revenueByDate.has(iso)) revenueByDate.set(iso, (revenueByDate.get(iso) ?? 0) + total);
        }
      }
      const ps = String(b.paymentStatus ?? b.status ?? "unpaid");
      if (!byPayment[ps]) byPayment[ps] = { count: 0, amount: 0 };
      byPayment[ps].count += 1;
      byPayment[ps].amount += total;
    }
    const avgInvoice = bills.length ? Math.round((totalBilled / bills.length) * 100) / 100 : 0;
    const revenuePerAppointment = totalAppointments ? Math.round((totalBilled / totalAppointments) * 100) / 100 : 0;
    const profit = Math.round(totalPaid * ESTIMATED_PROFIT_MARGIN * 100) / 100;

    // Build trends daily with revenue
    const dailyTrends = dateSeries.map((date) => {
      const entry = dailyMap.get(date)!;
      return {
        date,
        appointments: entry.appointments,
        completed: entry.completed,
        cancelled: entry.cancelled,
        noShow: entry.noShow,
        revenue: Math.round((revenueByDate.get(date) ?? 0) * 100) / 100,
        patients: entry.patients.size,
      };
    });

    // Patients assigned (all-time) for this doctor
    const patientsAssigned = await this.db
      .collection<PatientDoc>(CLINIC_COLLECTIONS.patients)
      .countDocuments({ clinicId, doctorId, status: { $ne: "deleted" } } as never);

    // Recent slices (last 5-10 within range, sorted by date desc)
    const recentAppointments = await this.db
      .collection<AppointmentDoc>(CLINIC_COLLECTIONS.appointments)
      .find({ clinicId, doctorId, date: { $gte: from, $lte: to } } as never)
      .sort({ date: -1, time: -1 })
      .limit(8)
      .toArray();
    const recentBills = await billsCol
      .find({ clinicId, doctorId, status: { $ne: "void" } } as never)
      .sort({ invoiceDate: -1, createdAt: -1 })
      .limit(8)
      .toArray();
    const recentPatients = await this.db
      .collection<PatientDoc>(CLINIC_COLLECTIONS.patients)
      .find({ clinicId, doctorId, status: { $ne: "deleted" } } as never)
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(6)
      .toArray();

    // For breakdown
    const byStatus = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      percent: totalAppointments ? Math.round((count / totalAppointments) * 1000) / 10 : 0,
    }));
    const byQueueStatus = Object.entries(queueCounts).map(([status, count]) => ({ status, count }));
    const byPaymentStatus = Object.entries(byPayment).map(([status, v]) => ({ status, count: v.count, amount: Math.round(v.amount * 100) / 100 }));

    return {
      doctor: doctorToPublic(doctor as never),
      range: { from, to },
      summary: {
        patientsAssigned,
        patientsHandled: distinctInRange.size,
        patientsHandledAllTime: allTimeSetSize,
        totalAppointments,
        completed,
        cancelled,
        noShow,
        scheduled,
        confirmed,
        rescheduled,
        completionRate,
        noShowRate,
        cancellationRate,
        avgPerDay,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalBilled: Math.round(totalBilled * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        outstanding: Math.round(outstanding * 100) / 100,
        avgInvoice,
        revenuePerAppointment,
        profit,
        profitMargin: ESTIMATED_PROFIT_MARGIN,
        billsCount: bills.length,
        billsPaid,
        billsIssued,
        billsDraft,
        billsVoid,
      },
      trends: { daily: dailyTrends },
      breakdown: { byStatus, byQueueStatus, byPaymentStatus },
      recent: {
        appointments: recentAppointments.map((a) => ({
          appointmentId: a.appointmentId,
          patientId: a.patientId,
          date: a.date,
          time: a.time,
          status: a.status,
          queueStatus: a.queueStatus ?? null,
          reason: a.reason ?? null,
        })),
        bills: recentBills.map((b: BillDoc) => ({
          billId: b.billId,
          billNumber: b.billNumber,
          patientId: b.patientId,
          total: b.total,
          amountPaid: b.amountPaid,
          balanceDue: b.balanceDue,
          status: b.status,
          paymentStatus: b.paymentStatus,
          invoiceDate: b.invoiceDate ?? b.createdAt,
        })),
        patients: recentPatients.map((p: PatientDoc) => ({
          patientId: p.patientId,
          fullName: p.fullName,
          mobile: p.mobile,
          gender: p.gender,
          status: p.status,
        })),
      },
    };
  }
}
