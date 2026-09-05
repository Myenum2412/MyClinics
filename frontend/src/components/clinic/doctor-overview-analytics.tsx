"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getDoctorOverview, type DoctorOverviewResult } from "@/lib/clinic-api";
import { todayISO } from "@/lib/datetime";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Users,
  CalendarDays,
  ClipboardCheck,
  TrendingUp,
  IndianRupee,
  Wallet,
  BarChart3,
  Clock3,
  AlertTriangle,
  Activity,
  FileText,
  User,
  CreditCard,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

function formatCurrency(n: number): string {
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatNumber(n: number): string {
  return Number(n).toLocaleString("en-IN");
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function presetRange(preset: string): { from: string; to: string } {
  const to = todayISO();
  const end = new Date(`${to}T00:00:00`);
  const fromDate = new Date(end);
  switch (preset) {
    case "7d":
      fromDate.setDate(end.getDate() - 6);
      break;
    case "30d":
      fromDate.setDate(end.getDate() - 29);
      break;
    case "90d":
      fromDate.setDate(end.getDate() - 89);
      break;
    case "month":
      fromDate.setDate(1);
      break;
    case "3m":
      fromDate.setMonth(end.getMonth() - 3);
      fromDate.setDate(fromDate.getDate() + 1);
      break;
    case "6m":
      fromDate.setMonth(end.getMonth() - 6);
      fromDate.setDate(fromDate.getDate() + 1);
      break;
    case "year":
      fromDate.setMonth(0);
      fromDate.setDate(1);
      break;
    default:
      fromDate.setDate(end.getDate() - 29);
  }
  return { from: toISODate(fromDate), to };
}

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  trend?: string;
}) {
  return (
    <Card className="border-border shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
            <p className="mt-1 text-xl font-bold tracking-tight text-foreground truncate">{value}</p>
            {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
            {trend && <p className="mt-1 text-xs font-medium text-emerald-600">{trend}</p>}
          </div>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionHeader({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
        <Icon className="size-4 text-primary" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}

export function DoctorOverviewAnalytics({ clinicId, doctorId }: { clinicId: string; doctorId: string }) {
  const [range, setRange] = useState<{ from: string; to: string }>(() => presetRange("30d"));
  const [activePreset, setActivePreset] = useState<string>("30d");
  const [data, setData] = useState<DoctorOverviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!clinicId || !doctorId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getDoctorOverview(clinicId, doctorId, range);
      setData(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load doctor overview";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [clinicId, doctorId, range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summary = data?.summary;
  const daily = data?.trends.daily ?? [];

  // Filter daily for charts: last bars sparse if range large; keep all
  const chartData = useMemo(() => daily, [daily]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="p-6 text-sm text-destructive">Failed to load analytics: {error}</CardContent>
      </Card>
    );
  }

  if (!data || !summary) {
    return <p className="text-sm text-muted-foreground">No analytics available.</p>;
  }

  const presetButtons: { key: string; label: string }[] = [
    { key: "7d", label: "7D" },
    { key: "30d", label: "30D" },
    { key: "90d", label: "90D" },
    { key: "month", label: "This Month" },
    { key: "3m", label: "3M" },
    { key: "6m", label: "6M" },
    { key: "year", label: "This Year" },
  ];

  const totalTrendLabel = `${data.range.from} → ${data.range.to}`;

  return (
    <div className="space-y-6">
      {/* Date Range Controls */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CalendarDays className="size-4 text-primary" />
            Performance Period
            <Badge variant="secondary" className="ml-2 font-normal">{totalTrendLabel}</Badge>
          </CardTitle>
          <CardDescription>Analytics are calculated from actual appointments, bills, and patient records for this doctor within the selected period.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {presetButtons.map((p) => (
              <Button
                key={p.key}
                variant={activePreset === p.key ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setActivePreset(p.key);
                  setRange(presetRange(p.key));
                }}
              >
                {p.label}
              </Button>
            ))}
            <div className="ml-auto flex items-center gap-2 text-xs">
              <Label className="text-muted-foreground">Custom</Label>
              <Input type="date" value={range.from} onChange={(e) => { setActivePreset("custom"); setRange((r) => ({ ...r, from: e.target.value })); }} className="h-7 w-[150px] text-xs" />
              <span className="text-muted-foreground">—</span>
              <Input type="date" value={range.to} onChange={(e) => { setActivePreset("custom"); setRange((r) => ({ ...r, to: e.target.value })); }} className="h-7 w-[150px] text-xs" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Patients Handled" value={formatNumber(summary.patientsHandled)} sub={`${summary.patientsAssigned} assigned · ${summary.patientsHandledAllTime} all-time`} icon={Users} trend={`${summary.patientsHandled} in period`} />
        <StatCard title="Total Appointments" value={formatNumber(summary.totalAppointments)} sub={`${summary.avgPerDay}/day · ${summary.completionRate}% completed`} icon={CalendarDays} />
        <StatCard title="Completed" value={formatNumber(summary.completed)} sub={`${summary.scheduled} scheduled · ${summary.confirmed} confirmed`} icon={ClipboardCheck} trend={`${summary.completionRate}% completion`} />
        <StatCard title="No-Show / Cancelled" value={`${summary.noShow} / ${summary.cancelled}`} sub={`${summary.noShowRate}% no-show · ${summary.cancellationRate}% cancelled`} icon={AlertTriangle} />
        <StatCard title="Revenue Billed" value={formatCurrency(summary.totalBilled)} sub={`${summary.billsCount} bills · avg ${formatCurrency(summary.avgInvoice)}`} icon={IndianRupee} />
        <StatCard title="Collected" value={formatCurrency(summary.totalPaid)} sub={`${formatCurrency(summary.outstanding)} outstanding · ${summary.billsPaid} paid`} icon={Wallet} trend={summary.totalBilled ? `${Math.round((summary.totalPaid/summary.totalBilled)*100)}% collected` : undefined} />
        <StatCard title="Profit (est.)" value={formatCurrency(summary.profit)} sub={`Margin ${(summary.profitMargin*100).toFixed(0)}% on collected`} icon={TrendingUp} />
        <StatCard title="Revenue / Appt." value={formatCurrency(summary.revenuePerAppointment)} sub={`Billing efficiency`} icon={BarChart3} />
      </div>

      {/* Profile + performance badges */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Doctor Profile Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Specialization</span><span className="font-medium">{data.doctor.specialization || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Qualification</span><span className="font-medium">{data.doctor.qualification || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Experience</span><span className="font-medium">{data.doctor.experienceYears != null ? `${data.doctor.experienceYears} yrs` : "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Fee</span><span className="font-medium">{data.doctor.fee != null ? formatCurrency(data.doctor.fee) : "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Department</span><span className="font-medium">{data.doctor.department || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant="outline" className={data.doctor.status==="active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : ""}>{data.doctor.status}</Badge></div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">At a Glance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground">Workload intensity</div>
                <div className="mt-1 text-lg font-bold">{summary.avgPerDay} <span className="text-sm font-normal text-muted-foreground">appts/day</span></div>
                <div className="text-xs text-muted-foreground">{summary.totalAppointments} in {chartData.length} days</div>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground">Collection health</div>
                <div className="mt-1 text-lg font-bold">{formatCurrency(summary.outstanding)} <span className="text-sm font-normal text-muted-foreground">pending</span></div>
                <div className="text-xs text-muted-foreground">{summary.billsIssued} issued · {summary.billsDraft} draft</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {data.breakdown.byStatus.map((s) => (
                <Badge key={s.status} variant="secondary" className="font-normal">{s.status}: {s.count} ({s.percent}%)</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <SectionHeader icon={Activity} title="Patient Visit Trend" description="Appointments & completed per day" />
          </CardHeader>
          <CardContent className="h-[280px]">
            {chartData.length === 0 ? <p className="pt-12 text-center text-sm text-muted-foreground">No appointments in this period</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="appointments" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} name="Appointments" />
                  <Area type="monotone" dataKey="completed" stroke="#10b981" fill="#10b981" fillOpacity={0.15} name="Completed" />
                  <Area type="monotone" dataKey="patients" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.1} name="Patients" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <SectionHeader icon={IndianRupee} title="Revenue Trend" description="Billed revenue per day" />
          </CardHeader>
          <CardContent className="h-[280px]">
            {chartData.length === 0 ? <p className="pt-12 text-center text-sm text-muted-foreground">No revenue in this period</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `₹${v}`} />
                  <Tooltip formatter={(value: unknown) => formatCurrency(Number(value as number))} />
                  <Bar dataKey="revenue" fill="#0ea5e9" name="Revenue" radius={[4,4,0,0]} />
                  <Bar dataKey="appointments" fill="#f59e0b" name="Appointments" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <SectionHeader icon={BarChart3} title="Appointment Status Breakdown" description="Distribution within period" />
          </CardHeader>
          <CardContent className="h-[260px] flex items-center justify-center">
            {data.breakdown.byStatus.length === 0 ? <p className="text-sm text-muted-foreground">No appointments</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.breakdown.byStatus.map((b) => ({ name: b.status, value: b.count }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value, percent }: any) => `${name} ${value} (${((percent ?? 0)*100).toFixed(0)}%)`}>
                    {data.breakdown.byStatus.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <SectionHeader icon={CreditCard} title="Revenue vs Profit" description={`Revenue ${formatCurrency(summary.totalBilled)} · Profit est. ${formatCurrency(summary.profit)} · Collected ${formatCurrency(summary.totalPaid)}`} />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: "Billed", value: summary.totalBilled },
                  { name: "Collected", value: summary.totalPaid },
                  { name: "Outstanding", value: summary.outstanding },
                  { name: "Profit (est.)", value: summary.profit },
                ]} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v: number) => `₹${v}`} tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip formatter={(value: unknown) => formatCurrency(Number(value as number))} />
                  <Bar dataKey="value" fill="#10b981" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-muted-foreground">Profit is estimated at {(summary.profitMargin*100).toFixed(0)}% margin on collected revenue (totalPaid). Actual profit depends on operational costs not tracked in billing. Outstanding is billed minus collected.</p>
            <div className="flex flex-wrap gap-1.5">
              {data.breakdown.byPaymentStatus.map((b) => (
                <Badge key={b.status} variant="outline" className="text-xs">{b.status}: {b.count} ({formatCurrency(b.amount)})</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent tables */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <SectionHeader icon={Clock3} title="Recent Appointments" description="Last 8 in selected period" />
          </CardHeader>
          <CardContent className="p-0">
            {data.recent.appointments.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">No appointments in this period</p> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recent.appointments.map((a) => (
                    <TableRow key={a.appointmentId}>
                      <TableCell className="text-xs">{a.date}</TableCell>
                      <TableCell className="text-xs">{a.time}</TableCell>
                      <TableCell className="text-xs truncate max-w-[110px]" title={a.patientId}>{a.patientId.slice(0,8)}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[11px]">{a.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <SectionHeader icon={FileText} title="Recent Invoices" description="Last 8 bills for this doctor" />
          </CardHeader>
          <CardContent className="p-0">
            {data.recent.bills.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">No bills for this doctor in period</p> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recent.bills.map((b) => (
                    <TableRow key={b.billId}>
                      <TableCell className="text-xs font-mono">{b.billNumber}</TableCell>
                      <TableCell className="text-xs">{formatCurrency(b.total)}</TableCell>
                      <TableCell className="text-xs">{formatCurrency(b.amountPaid)}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[11px]">{b.paymentStatus || b.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <SectionHeader icon={User} title="Patients Handled" description={`${data.recent.patients.length} most recent assigned patients`} />
        </CardHeader>
        <CardContent className="p-0">
          {data.recent.patients.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">No assigned patients</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recent.patients.map((p) => (
                  <TableRow key={p.patientId}>
                    <TableCell className="text-sm font-medium">{p.fullName}</TableCell>
                    <TableCell className="text-xs">{p.mobile}</TableCell>
                    <TableCell className="text-xs">{p.gender ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[11px]">{p.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground text-center">Data is consistent with appointment, billing, payment, and patient records · Period: {data.range.from} to {data.range.to} · Revenue from bills where doctorId matches and invoiceDate falls inside period (void excluded) · Profit estimated</p>
    </div>
  );
}
