"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import {
  type Appointment,
  type Bill,
  type Patient,
  listAppointments,
  listBills,
  listPatients,
} from "@/lib/clinic-api";
import { formatDate, formatTime } from "@/lib/format-time";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartBarInteractive,
  type ChartBarInteractiveDatum,
} from "@/components/chart-bar-interactive";

import { type ClinicSession } from "@/lib/clinic-api";

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

interface Greeting {
  text: string;
  emoji: string;
  gradientFrom: string;
  gradientTo: string;
  accentColor: string;
}

function getGreeting(): Greeting {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) {
    return {
      text: "Good Morning",
      emoji: "🌅",
      gradientFrom: "from-amber-500/15",
      gradientTo: "to-orange-400/5",
      accentColor: "text-amber-600 dark:text-amber-400",
    };
  }
  if (h >= 12 && h < 17) {
    return {
      text: "Good Afternoon",
      emoji: "☀️",
      gradientFrom: "from-sky-500/15",
      gradientTo: "to-blue-400/5",
      accentColor: "text-sky-600 dark:text-sky-400",
    };
  }
  if (h >= 17 && h < 21) {
    return {
      text: "Good Evening",
      emoji: "🌇",
      gradientFrom: "from-violet-500/15",
      gradientTo: "to-purple-400/5",
      accentColor: "text-violet-600 dark:text-violet-400",
    };
  }
  return {
    text: "Good Night",
    emoji: "🌙",
    gradientFrom: "from-indigo-500/15",
    gradientTo: "to-blue-900/5",
    accentColor: "text-indigo-600 dark:text-indigo-400",
  };
}

// ── Greeting Banner ───────────────────────────────────────────────────────────

function GreetingBanner({
  doctorName,
  todayCount,
  loading,
}: {
  doctorName: string;
  todayCount: number;
  loading: boolean;
}) {
  const greeting = useMemo(() => getGreeting(), []);

  // Friendly first name — strip "Dr." prefix if present
  const firstName = doctorName.replace(/^dr\.?\s*/i, "").split(" ")[0];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${greeting.gradientFrom} ${greeting.gradientTo} px-6 py-7 shadow-sm`}
    >
      {/* Decorative blurred circles */}
      <div className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-white/5 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-8 -left-8 size-32 rounded-full bg-white/5 blur-2xl" />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: greeting text */}
        <div>
          <p className={`text-sm font-semibold uppercase tracking-widest ${greeting.accentColor}`}>
            {greeting.emoji}&nbsp;&nbsp;{greeting.text}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Dr. {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        {/* Right: clickable appointment count chip */}
        <Link
          href="/clinic/appointments"
          className="group flex w-fit items-center gap-3 rounded-xl border border-border bg-background/70 px-5 py-4 shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-primary/40 hover:bg-background hover:shadow-md active:scale-[0.97]"
          title="View today appointments"
        >
          <div className="flex flex-col items-center min-w-[3.5rem]">
            {loading ? (
              <Skeleton className="h-9 w-12 rounded-lg" />
            ) : (
              <span className={`text-4xl font-extrabold tabular-nums leading-none ${greeting.accentColor}`}>
                {todayCount}
              </span>
            )}
            <span className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
              Today&apos;s Appointments
            </span>
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export function DoctorDashboard({ session }: { session: ClinicSession }) {
  const clinicId = session.clinicId ?? "";

  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);

  useEffect(() => {
    if (!clinicId) return;
    let active = true;
    setLoading(true);
    Promise.allSettled([
      listAppointments(clinicId, { limit: 50 }),
      listAppointments(clinicId, { date: todayISO(), limit: 50 }),
      listPatients(clinicId, { limit: 50 }),
      listBills(clinicId, { limit: 50 }),
    ])
      .then(([apptRes, todayRes, patientRes, billRes]) => {
        if (!active) return;
        if (apptRes.status === "fulfilled") setAppointments(apptRes.value.items);
        if (todayRes.status === "fulfilled") setTodayAppointments(todayRes.value.items);
        if (patientRes.status === "fulfilled") setPatients(patientRes.value.items);
        if (billRes.status === "fulfilled") setBills(billRes.value.items);
        if (
          apptRes.status === "rejected" &&
          patientRes.status === "rejected" &&
          billRes.status === "rejected"
        ) {
          toast.error("Failed to load dashboard data");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [clinicId]);

  const patientById = useMemo(() => {
    const map = new Map<string, Patient>();
    for (const p of patients) map.set(p.patientId, p);
    return map;
  }, [patients]);

  const recentAppointment = useMemo(() => {
    if (appointments.length === 0) return null;
    return [...appointments].sort((a, b) => {
      if (a.date === b.date) return b.time.localeCompare(a.time);
      return b.date.localeCompare(a.date);
    })[0];
  }, [appointments]);

  const monthlyBilling: ChartBarInteractiveDatum[] = useMemo(() => {
    const now = new Date();
    const totalsByKey = new Map<string, number>();
    const paidByKey = new Map<string, number>();
    for (const bill of bills) {
      if (bill.status === "void") continue;
      const invoice = new Date(bill.invoiceDate);
      if (Number.isNaN(invoice.getTime())) continue;
      const key = `${invoice.getFullYear()}-${String(invoice.getMonth() + 1).padStart(2, "0")}-01`;
      totalsByKey.set(key, (totalsByKey.get(key) ?? 0) + bill.total);
      if (bill.status === "paid") {
        paidByKey.set(key, (paidByKey.get(key) ?? 0) + bill.total);
      }
    }
    const out: ChartBarInteractiveDatum[] = [];
    for (let offset = 11; offset >= 0; offset--) {
      const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      out.push({
        date: key,
        total: Math.round(totalsByKey.get(key) ?? 0),
        paid: Math.round(paidByKey.get(key) ?? 0),
      });
    }
    return out;
  }, [bills]);

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Greeting banner */}
      <GreetingBanner
        doctorName={session.name ?? "Doctor"}
        todayCount={todayAppointments.length}
        loading={loading}
      />

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden rounded-none border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border bg-muted/20 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-foreground">
                  Recent Appointment
                </CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Latest appointment across all doctors.
                </p>
              </div>
              <Link
                href="/clinic/appointments"
                className="inline-flex h-7 items-center justify-center gap-1.5 rounded-none border border-border bg-background px-3 text-[0.8rem] font-medium transition-all hover:bg-muted hover:text-foreground"
              >
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-2 p-6">
                <Skeleton className="h-9 w-full rounded-none" />
              </div>
            ) : !recentAppointment ? (
              <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                No appointments yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Patient
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Reason
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Date &amp; Time
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const patient = patientById.get(recentAppointment.patientId);
                    return (
                      <TableRow>
                        <TableCell className="font-medium text-foreground">
                          {patient?.fullName ??
                            `Patient #${recentAppointment.patientId.slice(-6)}`}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {recentAppointment.reason || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <div className="flex flex-col">
                            <span className="text-foreground">
                              {formatDate(recentAppointment.date)}
                            </span>
                            <span className="text-xs">
                              {formatTime(recentAppointment.time)}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })()}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {loading ? (
          <Card className="overflow-hidden rounded-none border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border bg-muted/20 px-6 py-4">
              <div className="h-5 w-40 animate-pulse rounded-none bg-muted" />
            </CardHeader>
            <CardContent className="p-6">
              <Skeleton className="h-[250px] w-full rounded-none" />
            </CardContent>
          </Card>
        ) : (
          <ChartBarInteractive
            title="Billing — Last 12 Months"
            subtitle="Total invoiced amount per month (excludes voided bills)."
            data={monthlyBilling}
          />
        )}
      </div>
    </div>
  );
}
