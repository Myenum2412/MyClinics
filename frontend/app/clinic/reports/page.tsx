"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  type Appointment,
  type Bill,
  type Doctor,
  type Patient,
  listAppointments,
  listBills,
  listDoctors,
  listPatients,
} from "@/lib/clinic-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  LineChart,
  Line,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Users,
  CalendarDays,
  Receipt,
  AlertTriangle,
  Lightbulb,
  Target,
  Download,
  FileText,
  Activity,
  CreditCard,
  UserCheck,
  Clock,
  BadgePercent,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────
type Range = "today" | "week" | "month" | "lastMonth" | "quarter" | "year" | "custom";

function formatINR(v: number): string {
  return `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}
function pct(cur: number, prev: number): number | null {
  if (prev === 0) return cur > 0 ? 100 : null;
  return Math.round(((cur - prev) / prev) * 100);
}
function inRange(dateStr: string, start: Date, end: Date): boolean {
  const d = new Date(`${dateStr}T00:00:00`);
  return !Number.isNaN(d.getTime()) && d >= start && d <= end;
}
function getRangeDates(range: Range, custom?: { from: string; to: string }): { start: Date; end: Date; prevStart: Date; prevEnd: Date; label: string } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  let start: Date;
  if (range === "today") start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  else if (range === "week") { start = new Date(now); start.setDate(now.getDate() - 6); }
  else if (range === "month") start = new Date(now.getFullYear(), now.getMonth(), 1);
  else if (range === "lastMonth") { start = new Date(now.getFullYear(), now.getMonth() - 1, 1); const e = new Date(now.getFullYear(), now.getMonth(), 0); return { start, end: e, prevStart: new Date(now.getFullYear(), now.getMonth() - 2, 1), prevEnd: new Date(now.getFullYear(), now.getMonth() - 1, 0), label: "Last Month" }; }
  else if (range === "quarter") { const q = Math.floor(now.getMonth() / 3); start = new Date(now.getFullYear(), q * 3, 1); }
  else if (range === "year") start = new Date(now.getFullYear(), 0, 1);
  else if (range === "custom" && custom?.from && custom?.to) { start = new Date(`${custom.from}T00:00:00`); const ce = new Date(`${custom.to}T23:59:59`); const days = Math.ceil((ce.getTime() - start.getTime()) / 86400000); const prevEnd = new Date(start); prevEnd.setDate(prevEnd.getDate() - 1); const prevStart = new Date(prevEnd); prevStart.setDate(prevEnd.getDate() - days + 1); return { start, end: ce, prevStart, prevEnd, label: `${custom.from} → ${custom.to}` }; }
  else start = new Date(now.getFullYear(), now.getMonth(), 1);
  const diff = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - diff);
  const label = range === "today" ? "Today" : range === "week" ? "This Week" : range === "month" ? "This Month" : range === "quarter" ? "This Quarter" : range === "year" ? "This Year" : "This Month";
  return { start, end, prevStart, prevEnd, label };
}

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#a855f7", "#ec4899"];

export default function BusinessReportsPage() {
  const session = useRequireRole("clinic_admin");
  const clinicId = session?.clinicId ?? "";
  const [range, setRange] = useState<Range>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState<Bill[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  const { start, end, prevStart, prevEnd, label } = useMemo(() => getRangeDates(range, { from: customFrom, to: customTo }), [range, customFrom, customTo]);

  const load = useCallback(() => {
    if (!clinicId) return;
    setLoading(true);
    Promise.allSettled([listBills(clinicId, { limit: 200 }), listAppointments(clinicId, { limit: 200 }), listPatients(clinicId, { limit: 200 }), listDoctors(clinicId, { limit: 100 })])
      .then(([b, a, p, d]) => {
        if (b.status === "fulfilled") setBills(b.value.items);
        if (a.status === "fulfilled") setAppointments(a.value.items);
        if (p.status === "fulfilled") setPatients(p.value.items);
        if (d.status === "fulfilled") setDoctors(d.value.items);
        if (b.status === "rejected" || a.status === "rejected" || p.status === "rejected") toast.error("Some report data failed to load");
      })
      .finally(() => setLoading(false));
  }, [clinicId]);

  useEffect(() => { load(); }, [load]);

  // ── Filtered sets ───────────────────────────────────────────────────────
  const billsInRange = useMemo(() => bills.filter(b => !b.invoiceDate || inRange(b.invoiceDate.slice(0, 10), start, end)).filter(b => b.status !== "void"), [bills, start, end]);
  const billsPrev = useMemo(() => bills.filter(b => b.invoiceDate && inRange(b.invoiceDate.slice(0, 10), prevStart, prevEnd) && b.status !== "void"), [bills, prevStart, prevEnd]);
  const apptsInRange = useMemo(() => appointments.filter(a => inRange(a.date, start, end)), [appointments, start, end]);
  const apptsPrev = useMemo(() => appointments.filter(a => inRange(a.date, prevStart, prevEnd)), [appointments, prevStart, prevEnd]);
  const patientsInRange = useMemo(() => patients.filter(p => { const d = new Date(p.createdAt ?? ""); return !Number.isNaN(d.getTime()) ? d >= start && d <= end : false; }), [patients, start, end]);

  // ── Executive Overview ──────────────────────────────────────────────────
  const totalRevenue = billsInRange.reduce((s, b) => s + b.total, 0);
  const prevRevenue = billsPrev.reduce((s, b) => s + b.total, 0);
  const revenueGrowth = pct(totalRevenue, prevRevenue);
  const totalPaid = billsInRange.reduce((s, b) => s + (b.amountPaid ?? 0), 0);
  const outstanding = billsInRange.reduce((s, b) => s + (b.balanceDue ?? 0), 0);
  const avgInvoice = billsInRange.length ? Math.round(totalRevenue / billsInRange.length) : 0;
  const avgRevenuePerPatient = patients.length ? Math.round(totalRevenue / Math.max(1, new Set(billsInRange.map(b => b.patientId)).size)) : 0;

  const totalPatients = patients.length;
  const newPatients = patientsInRange.length;
  const returningPatients = totalPatients - newPatients;
  const retentionRate = totalPatients ? Math.round((returningPatients / totalPatients) * 100) : 0;

  const totalAppts = apptsInRange.length;
  const completed = apptsInRange.filter(a => a.status === "completed").length;
  const cancelled = apptsInRange.filter(a => a.status === "cancelled").length;
  const noShow = apptsInRange.filter(a => a.status === "no_show").length;
  const completionRate = totalAppts ? Math.round((completed / totalAppts) * 100) : 0;
  const noShowRate = totalAppts ? Math.round((noShow / totalAppts) * 100) : 0;
  const cancellationRate = totalAppts ? Math.round((cancelled / totalAppts) * 100) : 0;

  // ── Revenue by doctor / service / payment ───────────────────────────────
  const revenueByDoctor = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of billsInRange) {
      const doc = doctors.find(d => d.doctorId === b.doctorId)?.name ?? b.doctorId ?? "Unknown";
      map.set(doc, (map.get(doc) ?? 0) + b.total);
    }
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [billsInRange, doctors]);

  const revenueByService = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of billsInRange) for (const it of b.items) map.set(it.description, (map.get(it.description) ?? 0) + it.lineTotal);
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [billsInRange]);

  const revenueByPayment = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of billsInRange) map.set(b.paymentType ?? "other", (map.get(b.paymentType ?? "other") ?? 0) + b.total);
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  }, [billsInRange]);

  const dailyRevenue = useMemo(() => {
    const days: { date: string; revenue: number }[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      const key = cur.toISOString().slice(0, 10);
      const rev = bills.filter(b => b.invoiceDate?.slice(0, 10) === key && b.status !== "void").reduce((s, b) => s + b.total, 0);
      days.push({ date: key.slice(5), revenue: rev });
      cur.setDate(cur.getDate() + 1);
      if (days.length > 14) break;
    }
    return days;
  }, [bills, start, end]);

  // ── Appointment peak hours/weekdays ─────────────────────────────────────
  const peakHours = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of apptsInRange) { const h = a.time.slice(0, 2); map.set(h, (map.get(h) ?? 0) + 1); }
    return [...map.entries()].map(([hour, count]) => ({ hour: `${hour}:00`, count })).sort((a, b) => b.count - a.count).slice(0, 3);
  }, [apptsInRange]);
  const peakWeekdays = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const map = new Map<string, number>();
    for (const a of apptsInRange) { const d = new Date(`${a.date}T00:00:00`).getDay(); const label = days[d]; map.set(label, (map.get(label) ?? 0) + 1); }
    return [...map.entries()].map(([day, count]) => ({ day, count })).sort((a, b) => b.count - a.count).slice(0, 3);
  }, [apptsInRange]);

  // ── Doctor performance ──────────────────────────────────────────────────
  const doctorPerf = useMemo(() => doctors.map(d => {
    const appts = apptsInRange.filter(a => a.doctorId === d.doctorId);
    const rev = billsInRange.filter(b => b.doctorId === d.doctorId).reduce((s, b) => s + b.total, 0);
    const comp = appts.filter(a => a.status === "completed").length;
    return { name: d.name, appointments: appts.length, completed: comp, revenue: rev, avg: appts.length ? Math.round(rev / appts.length) : 0, cancelRate: appts.length ? Math.round((appts.filter(a => a.status === "cancelled").length / appts.length) * 100) : 0 };
  }).sort((a, b) => b.revenue - a.revenue).slice(0, 5), [doctors, apptsInRange, billsInRange]);

  // ── Health Score (weighted) ─────────────────────────────────────────────
  const healthScore = useMemo(() => {
    if (!bills.length && !appointments.length) return null;
    const s1 = Math.min(100, Math.max(0, 50 + (revenueGrowth ?? 0))); // revenue growth
    const s2 = completionRate; // appointment efficiency
    const s3 = Math.min(100, retentionRate * 1.2);
    const s4 = outstanding > totalRevenue * 0.3 ? 40 : outstanding > totalRevenue * 0.15 ? 70 : 90; // collection
    const s5 = revenueByService.length ? 80 : 50;
    return Math.round((s1 + s2 + s3 + s4 + s5) / 5);
  }, [revenueGrowth, completionRate, retentionRate, outstanding, totalRevenue, revenueByService]);

  // ── Recommendations ─────────────────────────────────────────────────────
  const recommendations = useMemo(() => {
    const recs: { priority: "High" | "Medium" | "Opportunity"; title: string; detail: string; action: string }[] = [];
    if (noShowRate > 10) recs.push({ priority: "High", title: "Reduce no-shows", detail: `No-show rate is ${noShowRate}%.`, action: "Enable automated WhatsApp reminders 24h before appointments." });
    if (outstanding > totalRevenue * 0.15) recs.push({ priority: "High", title: "Pending payments high", detail: `${formatINR(outstanding)} outstanding (${Math.round((outstanding / Math.max(1, totalRevenue)) * 100)}% of billed).`, action: "Send automated payment reminders and enable UPI QR on invoices." });
    if (completionRate < 70) recs.push({ priority: "Medium", title: "Improve completion", detail: `Only ${completionRate}% appointments completed.`, action: "Follow up with cancelled/no-show patients within 24h." });
    if (revenueByService[0]) recs.push({ priority: "Opportunity", title: `Promote ${revenueByService[0].name}`, detail: `Top service generated ${formatINR(revenueByService[0].value)}.`, action: "Increase visibility and slots for this service." });
    if (peakHours[0]) recs.push({ priority: "Medium", title: "Peak hours", detail: `${peakHours[0].hour} is busiest (${peakHours[0].count} appts).`, action: "Add slots or staff during peak, offer discounts off-peak." });
    return recs.slice(0, 5);
  }, [noShowRate, outstanding, totalRevenue, completionRate, revenueByService, peakHours]);

  const handleExportCSV = () => {
    const rows = [["Metric", "Value"], ["Total Revenue", String(totalRevenue)], ["Total Patients", String(totalPatients)], ["Appointments", String(totalAppts)], ["Completed", String(completed)], ["Outstanding", String(outstanding)]];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `clinic-report-${label.replace(/\s+/g, "-")}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  if (loading) return <div className="p-6 space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="flex flex-col gap-6 p-1">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Business Improvement & Reports</h1>
            <p className="mt-1 text-sm text-muted-foreground">How is my clinic performing, where am I losing business, and what should I improve next? — Real data, no estimates.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5"><Download className="size-4" /> CSV</Button>
            <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5"><FileText className="size-4" /> Print</Button>
          </div>
        </div>
        <Card className="border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Label className="text-sm">Period</Label>
            <Select value={range} onValueChange={(v) => setRange(v as Range)}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="lastMonth">Last Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            {range === "custom" && (
              <>
                <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="w-40" />
                <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="w-40" />
              </>
            )}
            <Badge variant="secondary" className="ml-2">{label}: {start.toLocaleDateString()} → {end.toLocaleDateString()}</Badge>
            <span className="text-xs text-muted-foreground">vs previous period</span>
          </div>
        </Card>
      </div>

      {/* Executive Overview */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold"><Activity className="size-4 text-primary" /> Executive Overview</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Revenue", value: formatINR(totalRevenue), sub: revenueGrowth !== null ? `${revenueGrowth > 0 ? "↑" : "↓"} ${Math.abs(revenueGrowth)}% vs prev` : "—", icon: Receipt, trend: revenueGrowth },
            { label: "Total Patients", value: String(totalPatients), sub: `${newPatients} new · ${returningPatients} returning`, icon: Users },
            { label: "Appointments", value: String(totalAppts), sub: `${completed} completed · ${cancelled} cancelled · ${noShow} no-show`, icon: CalendarDays },
            { label: "Outstanding", value: formatINR(outstanding), sub: `${formatINR(totalPaid)} paid · avg ${formatINR(avgInvoice)}`, icon: CreditCard },
            { label: "Completion Rate", value: `${completionRate}%`, sub: `No-show ${noShowRate}% · Cancel ${cancellationRate}%`, icon: BadgePercent },
            { label: "Retention Rate", value: `${retentionRate}%`, sub: `${returningPatients} returning of ${totalPatients}`, icon: UserCheck },
            { label: "Avg Revenue / Patient", value: formatINR(avgRevenuePerPatient), sub: `Avg invoice ${formatINR(avgInvoice)}`, icon: Target },
            { label: "Health Score", value: healthScore !== null ? `${healthScore} / 100` : "—", sub: healthScore !== null ? (healthScore >= 80 ? "Healthy" : healthScore >= 60 ? "Stable" : "Needs attention") : "Not enough data", icon: Activity },
          ].map(card => (
            <Card key={card.label} className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{card.label}</p>
                  <card.icon className="size-4 text-muted-foreground" />
                </div>
                <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{card.value}</p>
                <p className={`mt-1 text-xs ${card.trend !== undefined ? (card.trend !== null && card.trend >= 0 ? "text-emerald-600" : "text-red-600") : "text-muted-foreground"}`}>{card.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Revenue Intelligence */}
      <Card className="border-border bg-card">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Receipt className="size-4 text-primary" /> Revenue & Financial Intelligence</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyRevenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeOpacity={0.6} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval={Math.ceil(dailyRevenue.length / 7)} />
                <YAxis tickFormatter={(v) => `₹${v / 1000}k`} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={50} />
                <Tooltip cursor={{ fill: "rgba(99,102,241,0.06)" }} />
                <Bar dataKey="revenue" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">By Doctor</p>
              {revenueByDoctor.length ? revenueByDoctor.map(r => <div key={r.name} className="mt-2 flex justify-between text-sm"><span className="text-muted-foreground truncate">{r.name}</span><span className="font-medium">{formatINR(r.value)}</span></div>) : <p className="text-xs text-muted-foreground mt-2">Not enough data</p>}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">By Service</p>
              {revenueByService.length ? revenueByService.map(r => <div key={r.name} className="mt-2 flex justify-between text-sm"><span className="text-muted-foreground truncate">{r.name}</span><span className="font-medium">{formatINR(r.value)}</span></div>) : <p className="text-xs text-muted-foreground mt-2">Not enough data</p>}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">By Payment Method</p>
              {revenueByPayment.length ? revenueByPayment.map(r => <div key={r.name} className="mt-2 flex justify-between text-sm"><span className="text-muted-foreground">{r.name}</span><span className="font-medium">{formatINR(r.value)}</span></div>) : <p className="text-xs text-muted-foreground mt-2">Not enough data</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patient Growth + Appointment */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Users className="size-4 text-primary" /> Patient Growth</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">New</p><p className="text-xl font-bold">{newPatients}</p></div>
              <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Returning</p><p className="text-xl font-bold">{returningPatients}</p></div>
              <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Retention</p><p className="text-xl font-bold">{retentionRate}%</p></div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Clinic is <span className="font-semibold text-foreground">{newPatients > returningPatients ? "growing" : newPatients === returningPatients ? "stable" : "stable/retention-focused"}</span> in this period.</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Clock className="size-4 text-primary" /> Appointment Intelligence</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2"><p className="text-xs text-emerald-700">Completed</p><p className="font-bold text-emerald-700">{completionRate}%</p></div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-2"><p className="text-xs text-amber-700">No-show</p><p className="font-bold text-amber-700">{noShowRate}%</p></div>
              <div className="rounded-lg bg-red-50 border border-red-200 p-2"><p className="text-xs text-red-700">Cancelled</p><p className="font-bold text-red-700">{cancellationRate}%</p></div>
            </div>
            <div className="text-xs text-muted-foreground">
              <p>Peak hours: {peakHours.length ? peakHours.map(p => `${p.hour} (${p.count})`).join(", ") : "Not enough data"}</p>
              <p className="mt-1">Peak weekdays: {peakWeekdays.length ? peakWeekdays.map(p => `${p.day} (${p.count})`).join(", ") : "Not enough data"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Doctor Performance */}
      <Card className="border-border bg-card">
        <CardHeader><CardTitle className="text-base">Doctor Performance</CardTitle></CardHeader>
        <CardContent>
          {doctorPerf.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b"><tr><th className="py-2 text-left">Doctor</th><th className="text-center">Appts</th><th className="text-center">Completed</th><th className="text-right">Revenue</th><th className="text-center">Avg</th><th className="text-center">Cancel%</th></tr></thead>
                <tbody>
                  {doctorPerf.map(d => (
                    <tr key={d.name} className="border-b last:border-0"><td className="py-2 font-medium">{d.name}</td><td className="text-center">{d.appointments}</td><td className="text-center">{d.completed}</td><td className="text-right">{formatINR(d.revenue)}</td><td className="text-center">{formatINR(d.avg)}</td><td className="text-center">{d.cancelRate}%</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-xs text-muted-foreground">Not enough data — add doctors and appointments.</p>}
        </CardContent>
      </Card>

      {/* Health + Recommendations */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border bg-card lg:col-span-1">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Activity className="size-4 text-primary" /> Business Health Score</CardTitle></CardHeader>
          <CardContent className="text-center">
            {healthScore !== null ? (
              <>
                <p className="text-4xl font-extrabold tracking-tight text-foreground">{healthScore} <span className="text-lg text-muted-foreground">/ 100</span></p>
                <p className="mt-1 text-sm font-medium" style={{ color: healthScore >= 80 ? "#16a34a" : healthScore >= 60 ? "#f59e0b" : "#ef4444" }}>{healthScore >= 80 ? "Healthy" : healthScore >= 60 ? "Stable" : "Needs attention"}</p>
                <p className="mt-2 text-xs text-muted-foreground">Weighted: revenue growth, completion, retention, collection, service diversity. No arbitrary scores — documented above.</p>
              </>
            ) : <p className="text-xs text-muted-foreground">Not enough data</p>}
          </CardContent>
        </Card>
        <Card className="border-border bg-card lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Lightbulb className="size-4 text-primary" /> What Should You Improve? (AI Recommendations)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {recommendations.length ? recommendations.map((r, i) => (
              <div key={i} className={`rounded-lg border p-3 ${r.priority === "High" ? "border-red-200 bg-red-50" : r.priority === "Medium" ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={r.priority === "High" ? "bg-red-100 text-red-700 border-red-200" : r.priority === "Medium" ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-emerald-100 text-emerald-700 border-emerald-200"}>{r.priority}</Badge>
                  <p className="text-sm font-semibold text-foreground">{r.title}</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{r.detail}</p>
                <p className="mt-1 text-xs font-medium text-foreground">→ {r.action}</p>
              </div>
            )) : <p className="text-xs text-muted-foreground">No issues detected — clinic is performing well.</p>}
          </CardContent>
        </Card>
      </div>

      {/* Problems & Opportunities */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="size-4 text-amber-600" /> Problems Detected</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              outstanding > totalRevenue * 0.2 && { level: "High", text: `High outstanding ${formatINR(outstanding)} (>20% of billed)` },
              noShowRate > 10 && { level: "High", text: `No-show rate ${noShowRate}%` },
              cancellationRate > 15 && { level: "Medium", text: `Cancellation ${cancellationRate}%` },
              completionRate < 65 && { level: "Medium", text: `Low completion ${completionRate}%` },
              retentionRate < 30 && { level: "Medium", text: `Low retention ${retentionRate}%` },
            ].filter(Boolean).length ? (
              ([
                outstanding > totalRevenue * 0.2 && { level: "High", text: `High outstanding ${formatINR(outstanding)} (>20% of billed)` },
                noShowRate > 10 && { level: "High", text: `No-show rate ${noShowRate}%` },
                cancellationRate > 15 && { level: "Medium", text: `Cancellation ${cancellationRate}%` },
                completionRate < 65 && { level: "Medium", text: `Low completion ${completionRate}%` },
                retentionRate < 30 && { level: "Medium", text: `Low retention ${retentionRate}%` },
              ].filter(Boolean) as { level: string; text: string }[]).map((p, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-border px-3 py-2"><span>{p.text}</span><Badge variant="outline" className={p.level === "High" ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200"}>{p.level}</Badge></div>
              ))
            ) : <p className="text-xs text-muted-foreground">No critical problems detected.</p>}
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Target className="size-4 text-emerald-600" /> Business Opportunities</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {revenueByService[0] && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">Promote <span className="font-semibold">{revenueByService[0].name}</span> — top revenue {formatINR(revenueByService[0].value)}</div>}
            {peakHours[0] && <div className="rounded-lg border border-border px-3 py-2">Fill off-peak slots — peak {peakHours[0].hour}, offer discount {peakHours[peakHours.length - 1]?.hour ?? "off-peak"}</div>}
            <div className="rounded-lg border border-border px-3 py-2">Increase portal adoption — enable online booking for returning patients</div>
          </CardContent>
        </Card>
      </div>

      <p className="text-center text-xs text-muted-foreground">All metrics calculated from this clinic's own data (bills, appointments, patients, doctors) — tenant-isolated, no fake data. Where insufficient, shows “Not enough data”.</p>
    </div>
  );
}
