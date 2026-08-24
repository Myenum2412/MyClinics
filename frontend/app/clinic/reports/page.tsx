"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  type Appointment,
  type Bill,
  type Doctor,
  type Patient,
  type MedicineRecord,
  type Prescription,
  listAppointments,
  listBills,
  listDoctors,
  listPatients,
  listRecords,
  listPrescriptions,
} from "@/lib/clinic-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Stethoscope,
  FileText,
  Download,
  ArrowUp,
  ArrowDown,
  Target,
  Activity,
} from "lucide-react";

type Range = "7d" | "30d" | "3m" | "12m" | "all";

function formatINR(v: number): string {
  if (v >= 100000) return `₹${(v / 1000).toFixed(0)}K`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return `₹${v.toLocaleString("en-IN")}`;
}
function formatFullINR(v: number): string {
  return `₹${v.toLocaleString("en-IN")}`;
}
function formatDateLabel(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
function monthLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

const COLORS = {
  primary: "#6366f1",
  primaryLight: "#a5b4fc",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  slate: "#64748b",
  indigo: "#6366f1",
  emerald: "#059669",
  amber: "#d97706",
};

export default function ReportsPage() {
  const session = useRequireRole("staff");
  const clinicId = session?.clinicId ?? "";
  const [range, setRange] = useState<Range>("30d");
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [records, setRecords] = useState<MedicineRecord[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);

  const load = useCallback(() => {
    if (!clinicId) return;
    setLoading(true);
    Promise.allSettled([
      listPatients(clinicId, { limit: 200 }),
      listDoctors(clinicId, { limit: 100 }),
      listAppointments(clinicId, { limit: 200 }),
      listBills(clinicId, { limit: 200 }),
      listRecords(clinicId, { limit: 200 }),
      listPrescriptions(clinicId, { limit: 200 }),
    ])
      .then(([pRes, dRes, aRes, bRes, rRes, prRes]) => {
        if (pRes.status === "fulfilled") setPatients(pRes.value.items);
        if (dRes.status === "fulfilled") setDoctors(dRes.value.items);
        if (aRes.status === "fulfilled") setAppointments(aRes.value.items);
        if (bRes.status === "fulfilled") setBills(bRes.value.items);
        if (rRes.status === "fulfilled") setRecords(rRes.value.items);
        if (prRes.status === "fulfilled") setPrescriptions(prRes.value.items);
        if ([pRes, dRes, aRes, bRes].every((r) => r.status === "rejected")) {
          toast.error("Failed to load report data");
        }
      })
      .finally(() => setLoading(false));
  }, [clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  const windowStart = useMemo(() => {
    const now = new Date();
    if (range === "all") return new Date(2020, 0, 1);
    if (range === "7d") return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    if (range === "30d") return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    if (range === "3m") return new Date(now.getFullYear(), now.getMonth() - 3, 1);
    return new Date(now.getFullYear(), now.getMonth() - 12, 1);
  }, [range]);

  const filtered = useMemo(() => {
    const f = (dateStr: string) => new Date(dateStr) >= windowStart;
    const appts = appointments.filter((a) => f(a.date));
    const billsF = bills.filter((b) => !b.invoiceDate || new Date(b.invoiceDate) >= windowStart);
    const pats = patients.filter((p) => !p.createdAt || new Date(p.createdAt) >= windowStart);
    // For patients, if createdAt missing, include all for "all" range, else use window
    return { appts, billsF, pats };
  }, [appointments, bills, patients, windowStart]);

  // Business metrics
  const metrics = useMemo(() => {
    const totalBilled = filtered.billsF.filter((b) => b.status !== "void").reduce((s, b) => s + b.total, 0);
    const totalPaid = filtered.billsF.reduce((s, b) => s + (b.amountPaid ?? 0), 0);
    const outstanding = filtered.billsF.reduce((s, b) => s + (b.balanceDue ?? 0), 0);
    const collectionRate = totalBilled > 0 ? (totalPaid / totalBilled) * 100 : 0;
    const totalPatients = patients.length;
    const newPatients = filtered.pats.length;
    const activePatients = patients.filter((p) => p.status === "active").length;
    const totalAppts = filtered.appts.length;
    const completed = filtered.appts.filter((a) => a.status === "completed").length;
    const cancelled = filtered.appts.filter((a) => a.status === "cancelled").length;
    const noShow = filtered.appts.filter((a) => a.status === "no_show").length;
    const scheduled = filtered.appts.filter((a) => a.status === "scheduled").length;
    const completionRate = totalAppts > 0 ? (completed / totalAppts) * 100 : 0;
    const noShowRate = totalAppts > 0 ? (noShow / totalAppts) * 100 : 0;
    const avgBill = filtered.billsF.length > 0 ? totalBilled / filtered.billsF.length : 0;
    const avgRevenuePerPatient = totalPatients > 0 ? bills.filter((b)=>b.status!=="void").reduce((s,b)=>s+b.total,0) / totalPatients : 0;
    return {
      totalBilled,
      totalPaid,
      outstanding,
      collectionRate,
      totalPatients,
      newPatients,
      activePatients,
      totalAppts,
      completed,
      cancelled,
      noShow,
      scheduled,
      completionRate,
      noShowRate,
      avgBill,
      avgRevenuePerPatient,
    };
  }, [filtered, patients, bills]);

  // Revenue trend (monthly)
  const revenueTrend = useMemo(() => {
    const now = new Date();
    const months = range === "7d" ? 7 : range === "30d" ? 6 : range === "3m" ? 3 : range === "12m" ? 12 : 12;
    const isDaily = range === "7d" || range === "30d";
    const totals = new Map<string, { billed: number; paid: number }>();
    for (const b of bills) {
      if (b.status === "void") continue;
      const d = new Date(b.invoiceDate);
      if (Number.isNaN(d.getTime()) || d < windowStart) continue;
      const key = isDaily
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const cur = totals.get(key) ?? { billed: 0, paid: 0 };
      cur.billed += b.total;
      cur.paid += b.amountPaid ?? 0;
      totals.set(key, cur);
    }
    const data: { label: string; billed: number; paid: number }[] = [];
    const count = isDaily ? (range === "7d" ? 7 : 30) : months;
    for (let i = count - 1; i >= 0; i--) {
      const d = isDaily ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - i) : new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = isDaily
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = isDaily ? d.toLocaleDateString("en-US", { day: "2-digit", month: "short" }) : monthLabel(d);
      const v = totals.get(key) ?? { billed: 0, paid: 0 };
      data.push({ label, billed: Math.round(v.billed), paid: Math.round(v.paid) });
    }
    return data;
  }, [bills, windowStart, range]);

  const statusPie = useMemo(() => {
    return [
      { name: "Completed", value: metrics.completed, fill: COLORS.success },
      { name: "Scheduled", value: metrics.scheduled, fill: COLORS.primary },
      { name: "Cancelled", value: metrics.cancelled, fill: COLORS.danger },
      { name: "No-show", value: metrics.noShow, fill: COLORS.warning },
    ].filter((d) => d.value > 0);
  }, [metrics]);

  const doctorUtilization = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of filtered.appts) {
      map.set(a.doctorId, (map.get(a.doctorId) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([doctorId, count]) => {
        const doc = doctors.find((d) => d.doctorId === doctorId);
        return { name: doc?.name ?? doctorId.slice(-6), count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filtered.appts, doctors]);

  const topReasons = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of filtered.appts) {
      const r = (a.reason ?? "General").trim() || "General";
      map.set(r, (map.get(r) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filtered.appts]);

  const insights = useMemo(() => {
    const list: { icon: typeof TrendingUp; color: string; title: string; desc: string }[] = [];
    if (metrics.noShowRate > 10) {
      list.push({
        icon: AlertTriangle,
        color: "text-amber-600",
        title: "High no-show rate",
        desc: `No-show is ${metrics.noShowRate.toFixed(1)}%. Enable SMS/WhatsApp reminders 1 hour before slot to reduce.`,
      });
    } else if (metrics.noShowRate > 0) {
      list.push({
        icon: CheckCircle,
        color: "text-emerald-600",
        title: "No-show under control",
        desc: `Only ${metrics.noShowRate.toFixed(1)}% no-shows — keep current reminder flow.`,
      });
    }
    if (metrics.collectionRate < 80 && metrics.totalBilled > 0) {
      list.push({
        icon: DollarSign,
        color: "text-red-600",
        title: "Outstanding is high",
        desc: `Collection rate ${metrics.collectionRate.toFixed(0)}% (₹${metrics.outstanding.toLocaleString("en-IN")} outstanding). Follow up on issued bills.`,
      });
    } else if (metrics.collectionRate >= 90) {
      list.push({
        icon: TrendingUp,
        color: "text-emerald-600",
        title: "Excellent collection",
        desc: `${metrics.collectionRate.toFixed(0)}% collected — revenue flow is healthy.`,
      });
    }
    if (metrics.completionRate < 60 && metrics.totalAppts > 0) {
      list.push({
        icon: Activity,
        color: "text-indigo-600",
        title: "Low completion",
        desc: `Only ${metrics.completionRate.toFixed(0)}% appointments completed. Check scheduling gaps or doctor availability.`,
      });
    }
    if (doctorUtilization.length > 1) {
      const top = doctorUtilization[0];
      const low = doctorUtilization[doctorUtilization.length - 1];
      if (top.count > low.count * 2) {
        list.push({
          icon: Stethoscope,
          color: "text-indigo-600",
          title: "Uneven doctor load",
          desc: `${top.name} has ${top.count} appts vs ${low.name} ${low.count}. Rebalance to reduce wait.`,
        });
      }
    }
    if (records.length === 0 && appointments.length > 0) {
      list.push({
        icon: FileText,
        color: "text-slate-600",
        title: "Document your visits",
        desc: "No medical records in this window — ensure doctors add diagnosis/treatment for continuity.",
      });
    }
    if (list.length === 0) {
      list.push({
        icon: Target,
        color: "text-indigo-600",
        title: "Business is steady",
        desc: "All key metrics are within healthy ranges. Focus on patient retention and reviews.",
      });
    }
    return list.slice(0, 4);
  }, [metrics, doctorUtilization, records.length, appointments.length]);

  const handleExport = () => {
    const data = {
      range,
      windowStart: windowStart.toISOString(),
      metrics,
      revenueTrend,
      statusPie,
      doctorUtilization,
      topReasons,
      insights: insights.map((i) => ({ title: i.title, desc: i.desc })),
      generatedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clinic-report-${range}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Business Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Actionable insights from appointments, patients, billing and records to grow your clinic.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={(v) => setRange(v as Range)}>
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="3m">Last 3 months</SelectItem>
              <SelectItem value="12m">Last 12 months</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={handleExport}>
            <Download className="size-4" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-[20px] border border-border bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <DollarSign className="size-4 text-indigo-600" />
              Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tracking-tight text-foreground">{formatFullINR(metrics.totalBilled)}</p>
            <p className="text-xs text-muted-foreground">
              Paid {formatFullINR(metrics.totalPaid)} · Outstanding {formatFullINR(metrics.outstanding)} · {metrics.collectionRate.toFixed(0)}% collected
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <Badge variant="outline" className={metrics.collectionRate >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}>
                {metrics.collectionRate >= 80 ? <TrendingUp className="mr-1 size-3" /> : <TrendingDown className="mr-1 size-3" />}
                {metrics.collectionRate.toFixed(0)}% collection
              </Badge>
              <span className="text-muted-foreground">Avg bill {formatINR(metrics.avgBill)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[20px] border border-border bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="size-4 text-indigo-600" />
              Patients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tracking-tight text-foreground">{metrics.totalPatients}</p>
            <p className="text-xs text-muted-foreground">
              {metrics.newPatients} new · {metrics.activePatients} active · {formatFullINR(metrics.avgRevenuePerPatient)} avg revenue
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                <ArrowUp className="mr-1 size-3" />
                {metrics.newPatients} new in window
              </Badge>
              <span className="text-muted-foreground">{records.length} records · {prescriptions.length} prescriptions</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[20px] border border-border bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calendar className="size-4 text-indigo-600" />
              Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tracking-tight text-foreground">{metrics.totalAppts}</p>
            <p className="text-xs text-muted-foreground">
              {metrics.completed} completed · {metrics.cancelled} cancelled · {metrics.noShow} no-show
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge variant="outline" className={metrics.completionRate >= 70 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}>
                {metrics.completionRate.toFixed(0)}% completed
              </Badge>
              <Badge variant="outline" className={metrics.noShowRate <= 10 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}>
                {metrics.noShowRate.toFixed(1)}% no-show
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend + Status */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 rounded-[20px] border border-border bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Revenue Trend</CardTitle>
            <p className="text-xs text-muted-foreground">Billed vs Paid · {range}</p>
          </CardHeader>
          <CardContent>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" strokeOpacity={0.6} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} interval={0} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={formatINR} width={56} />
                  <Tooltip
                    cursor={{ fill: "rgba(99,102,241,0.06)" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as (typeof revenueTrend)[number];
                      return (
                        <div className="rounded-lg border bg-white px-3 py-2 shadow-md">
                          <p className="text-xs font-medium text-muted-foreground">{d.label}</p>
                          <p className="text-xs">Billed: <span className="font-bold">{formatFullINR(d.billed)}</span></p>
                          <p className="text-xs">Paid: <span className="font-bold">{formatFullINR(d.paid)}</span></p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="billed" fill={COLORS.primaryLight} radius={[6, 6, 0, 0]} barSize={12} name="Billed" />
                  <Bar dataKey="paid" fill={COLORS.primary} radius={[6, 6, 0, 0]} barSize={12} name="Paid" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[20px] border border-border bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Appointment Status</CardTitle>
            <p className="text-xs text-muted-foreground">Breakdown for selected window</p>
          </CardHeader>
          <CardContent>
            {statusPie.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No appointments in this window</p>
            ) : (
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusPie} cx="50%" cy="50%" innerRadius={56} outerRadius={84} dataKey="value" paddingAngle={2}>
                      {statusPie.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {statusPie.map((s) => (
                    <span key={s.name} className="inline-flex items-center gap-1.5 text-xs">
                      <span className="size-2 rounded-full" style={{ background: s.fill }} />
                      {s.name} {s.value}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Doctor Utilization + Top Reasons */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-[20px] border border-border bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Stethoscope className="size-4 text-indigo-600" />
              Doctor Utilization
            </CardTitle>
            <p className="text-xs text-muted-foreground">Top 5 by appointments in window</p>
          </CardHeader>
          <CardContent>
            {doctorUtilization.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No appointments</p>
            ) : (
              <div className="space-y-3">
                {doctorUtilization.map((d) => (
                  <div key={d.name} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{d.name}</span>
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-24 rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-indigo-500"
                          style={{ width: `${(d.count / Math.max(...doctorUtilization.map((x) => x.count))) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-sm font-bold tabular-nums">{d.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[20px] border border-border bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="size-4 text-indigo-600" />
              Top Reasons
            </CardTitle>
            <p className="text-xs text-muted-foreground">Most frequent appointment reasons</p>
          </CardHeader>
          <CardContent>
            {topReasons.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No data</p>
            ) : (
              <div className="space-y-3">
                {topReasons.map(([reason, count]) => (
                  <div key={reason} className="flex items-center justify-between">
                    <span className="max-w-[200px] truncate text-sm text-foreground">{reason}</span>
                    <Badge variant="outline" className="bg-slate-50">
                      {count}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Business Improvement Insights */}
      <Card className="rounded-[20px] border border-border bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Target className="size-4 text-indigo-600" />
            Business Improvement Insights
          </CardTitle>
          <p className="text-xs text-muted-foreground">Auto-generated from your clinic&apos;s real data — act on these to grow</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {insights.map((ins) => (
              <div key={ins.title} className="rounded-xl border border-border bg-slate-50/50 p-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-white border ${ins.color.replace("text-", "border-").replace("600", "200")}`}>
                    <ins.icon className={`size-4 ${ins.color}`} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">{ins.title}</h4>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{ins.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>Checked pages: Appointments, Patients, Doctors, Billing, Medical Records, Prescriptions</span>
            <span className="hidden sm:inline">·</span>
            <span>Data window: {range} · Generated {new Date().toLocaleString("en-IN")}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
