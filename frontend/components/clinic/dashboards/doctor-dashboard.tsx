"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";

import {
  type Appointment,
  type Bill,
  type Patient,
  type Doctor,
  type Prescription,
  listAppointments,
  listBills,
  listDoctors,
  listPatients,
  listPrescriptions,
} from "@/lib/clinic-api";
import { Card, CardContent } from "@/components/ui/card";
import { KOLKATA_TZ, now, toLocalDateISO, parseLocalDate, addDays, formatDate } from "@/lib/datetime";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";
import { BillingOverviewCard } from "@/components/clinic/billing-overview-card";
import { RecentAppointmentsCard } from "@/components/clinic/recent-appointments-card";
import { PersonAvatar } from "@/components/clinic/person-avatar";
import { Folder, ArrowRight, Users, Phone, Eye, FileText } from "lucide-react";
import {
  type Week,
  type AgendaDay,
  type CalEvent,
  type EventStatus,
} from "@/components/blocks/calendar-2";

import { type ClinicSession } from "@/lib/clinic-api";

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayISO(): string {
  return toLocalDateISO(now());
}

// ── Appointment → agenda week ─────────────────────────────────────────────────

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const APPOINTMENT_STATUS_TO_EVENT: Record<string, EventStatus> = {
  confirmed: "confirmed",
  completed: "confirmed",
  scheduled: "tentative",
  rescheduled: "tentative",
  cancelled: "cancelled",
  no_show: "cancelled",
};

/**
 * Groups appointments into a single Mon–Sun week containing today, ready to feed
 * the CalendarBlock agenda. Appointments outside the current week are ignored.
 */
function buildAppointmentWeek(
  appointments: Appointment[],
  patientMap: Map<string, string>,
  doctorMap: Map<string, string>,
  isDoctorRole: boolean
): Week {
  const today = todayISO();
  const monday = (() => {
    const d = parseLocalDate(today);
    const dow = d.getUTCDay(); // 0 Sun … 6 Sat
    const diff = dow === 0 ? -6 : 1 - dow;
    return addDays(d, diff);
  })();

  const days: AgendaDay[] = DAY_LABELS.map((label, i) => {
    const dayDate = addDays(monday, i);
    const iso = toLocalDateISO(dayDate);
    return {
      label,
      date: Number(iso.slice(8, 10)),
      isToday: iso === today,
      events: [],
    };
  });
  const dayByISO = new Map<string, AgendaDay>();
  days.forEach((d, i) => dayByISO.set(toLocalDateISO(addDays(monday, i)), d));

  const sorted = [...appointments].sort((a, b) =>
    a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)
  );

  for (const appt of sorted) {
    const day = dayByISO.get(appt.date);
    if (!day) continue;
    const patientName = patientMap.get(appt.patientId) ?? "Patient";
    const doctorName = doctorMap.get(appt.doctorId);
    const title = isDoctorRole
      ? patientName
      : doctorName
        ? `${patientName} · Dr. ${doctorName}`
        : patientName;
    const event: CalEvent = {
      time: appt.time,
      duration: appt.session ? `${appt.session[0].toUpperCase()}${appt.session.slice(1)}` : "Scheduled",
      title,
      reason: appt.reason ?? undefined,
      status: APPOINTMENT_STATUS_TO_EVENT[appt.status] ?? "tentative",
    };
    day.events.push(event);
  }

  const sundayISO = toLocalDateISO(addDays(monday, 6));
  const range = `${formatDate(parseLocalDate(toLocalDateISO(monday)))} – ${formatDate(
    parseLocalDate(sundayISO)
  )}`;

  return { range, days };
}

interface Greeting {
  text: string;
  emoji: string;
  gradientFrom: string;
  gradientTo: string;
  accentColor: string;
  bgImage: string;
}

function getGreeting(): Greeting {
  const h = Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: KOLKATA_TZ })
      .formatToParts(now())
      .find((p) => p.type === "hour")?.value ?? "0"
  ) % 24;
  if (h >= 5 && h < 12) {
    return {
      text: "Good Morning",
      emoji: "🌅",
      gradientFrom: "from-amber-500/15",
      gradientTo: "to-orange-400/5",
      accentColor: "text-amber-600 dark:text-amber-400",
      bgImage: "/goodmorning.png",
    };
  }
  if (h >= 12 && h < 17) {
    return {
      text: "Good Afternoon",
      emoji: "☀️",
      gradientFrom: "from-sky-500/15",
      gradientTo: "to-blue-400/5",
      accentColor: "text-sky-600 dark:text-sky-400",
      bgImage: "/GoodAfterNoon.png",
    };
  }
  if (h >= 17 && h < 21) {
    return {
      text: "Good Evening",
      emoji: "🌙",
      gradientFrom: "from-violet-500/15",
      gradientTo: "to-purple-400/5",
      accentColor: "text-violet-600 dark:text-violet-400",
      bgImage: "/GoodAfterNoon.png",
    };
  }
  return {
    text: "Good Night",
    emoji: "🌙",
    gradientFrom: "from-indigo-500/15",
    gradientTo: "to-blue-900/5",
    accentColor: "text-indigo-600 dark:text-indigo-400",
    bgImage: "/GoodNight.png",
  };
}

// ── Greeting Banner ───────────────────────────────────────────────────────────

function GreetingBanner({
  doctorName,
}: {
  doctorName: string;
}) {
  const greeting = useMemo(() => getGreeting(), []);

  // Friendly first name — strip "Dr." prefix if present
  const firstName = doctorName.replace(/^dr\.?\s*/i, "").split(" ")[0];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${greeting.gradientFrom} ${greeting.gradientTo} px-6 py-7 shadow-sm`}
    >
      {/* Time-of-day Background Image - Fixed to card with increased brightness */}
      <div className="pointer-events-none absolute inset-0 select-none overflow-hidden rounded-2xl">
        <Image
          src={greeting.bgImage}
          alt={greeting.text}
          fill
          sizes="(max-width: 1200px) 100vw, 1200px"
          className="object-cover object-center opacity-85 brightness-110 dark:opacity-75 dark:brightness-105 transition-all duration-300"
          priority
        />
        {/* Soft gradient overlay for crisp text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/40 to-transparent dark:from-background/90 dark:via-background/55 dark:to-background/20" />
      </div>

      {/* Decorative blurred circles */}
      <div className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-white/5 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-8 -left-8 size-32 rounded-full bg-white/5 blur-2xl" />

      <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: greeting text */}
        <div className="rounded-xl bg-background/30 p-2.5 backdrop-blur-[2px] sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <p className={`text-sm font-bold uppercase tracking-widest ${greeting.accentColor}`}>
            {greeting.emoji}&nbsp;&nbsp;{greeting.text}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Dr. {firstName}
          </h1>
          <p className="mt-1 text-sm font-medium text-foreground/80">
            {new Intl.DateTimeFormat("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: KOLKATA_TZ,
            }).format(now())}
          </p>
        </div>

        {/* Right: Medical Record button */}
        <Link
          href="/clinic/medical-record"
          className="group flex w-fit items-center gap-3 rounded-xl border border-border/80 bg-background/80 px-5 py-4 shadow-md backdrop-blur-md transition-all duration-200 hover:border-primary/40 hover:bg-background hover:shadow-lg active:scale-[0.97]"
          title="Open medical records"
        >
          <div className="flex size-10 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100">
            <Folder className="size-5 text-indigo-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">Medical Record</p>
            <p className="text-xs text-muted-foreground">View patient files</p>
          </div>
          <ArrowRight className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}

// ── Doctor Assigned Patients Card ──────────────────────────────────────────────

function DoctorPatientsCard({
  patients,
  clinicId,
  loading,
}: {
  patients: Patient[];
  clinicId: string;
  loading: boolean;
}) {
  return (
    <Card className="border-border shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-border bg-muted/20 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Users className="size-4 text-primary" />
              My Assigned Patients
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Patients currently assigned to your care.
            </p>
          </div>
          <Link href="/clinic/patients">
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1">
              View all <ArrowRight className="size-3.5" />
            </Button>
          </Link>
        </div>

        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : patients.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No patients assigned to you yet.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {patients.slice(0, 5).map((p) => (
                <div key={p.patientId} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <PersonAvatar clinicId={clinicId} ownerType="patient" ownerId={p.patientId} name={p.fullName} />
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-foreground">{p.fullName}</span>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Phone className="size-3" /> {p.mobile || "No Contact"}
                      </span>
                    </div>
                  </div>
                  <Link href={`/clinic/records?patientId=${p.patientId}`}>
                    <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1">
                      <Eye className="size-3" /> EHR File
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export function DoctorDashboard({ session }: { session: ClinicSession }) {
  const clinicId = session.clinicId ?? "";
  const isDoctorRole = session.role === "doctor";

  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);

  useEffect(() => {
    if (!clinicId) return;
    let active = true;
    setLoading(true);

    const promises: Promise<any>[] = [
      listAppointments(clinicId, { limit: 50 }),
      listPatients(clinicId, { limit: 50 }),
      listDoctors(clinicId, { limit: 50 }),
      listPrescriptions(clinicId, { limit: 50 }),
    ];

    if (!isDoctorRole) {
      promises.push(listBills(clinicId, { limit: 50 }));
    }

    Promise.allSettled(promises)
      .then(([apptRes, patientRes, doctorRes, rxRes, billRes]) => {
        if (!active) return;
        if (apptRes.status === "fulfilled") {
          setAppointments(apptRes.value.items);
        }
        if (patientRes.status === "fulfilled") {
          setPatients(patientRes.value.items);
        }
        if (doctorRes.status === "fulfilled") {
          setDoctors(doctorRes.value.items);
        }
        if (rxRes && rxRes.status === "fulfilled") {
          setPrescriptions(rxRes.value.items);
        }
        if (billRes && billRes.status === "fulfilled") {
          setBills(billRes.value.items);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [clinicId, isDoctorRole]);

  // Stats section cards
  const chartConfig = { capacity: { label: "Capacity", color: "hsl(var(--primary))" } } satisfies ChartConfig;
  const totalRevenue = bills.reduce((s, b) => (b.status !== "void" ? s + b.total : s), 0);

  const statsData = isDoctorRole
    ? [
        {
          name: "My Patients",
          current: patients.length,
          allowed: 100,
          capacity: Math.min(100, Math.round((patients.length / 100) * 100)),
          fill: "var(--chart-1)",
        },
        {
          name: "Appointments",
          current: appointments.length,
          allowed: 50,
          capacity: Math.min(100, Math.round((appointments.length / 50) * 100)),
          fill: "var(--chart-2)",
        },
        {
          name: "Prescriptions",
          current: prescriptions.length,
          allowed: 100,
          capacity: Math.min(100, Math.round((prescriptions.length / 100) * 100)),
          fill: "var(--chart-3)",
        },
        {
          name: "Doctors Roster",
          current: doctors.length,
          allowed: 10,
          capacity: Math.min(100, Math.round((doctors.length / 10) * 100)),
          fill: "var(--chart-4)",
        },
      ]
    : [
        {
          name: "Patients",
          current: patients.length,
          allowed: 100,
          capacity: Math.min(100, Math.round((patients.length / 100) * 100)),
          fill: "var(--chart-1)",
        },
        {
          name: "Appointments",
          current: appointments.length,
          allowed: 50,
          capacity: Math.min(100, Math.round((appointments.length / 50) * 100)),
          fill: "var(--chart-2)",
        },
        {
          name: "Revenue",
          current: totalRevenue,
          allowed: Math.max(totalRevenue, 1),
          capacity: totalRevenue ? Math.min(100, Math.round((bills.filter(b => b.status === "paid").reduce((s, b) => s + b.total, 0) / Math.max(1, totalRevenue)) * 100)) : 0,
          fill: "var(--chart-3)",
        },
        {
          name: "Doctors",
          current: doctors.length,
          allowed: 10,
          capacity: Math.min(100, Math.round((doctors.length / 10) * 100)),
          fill: "var(--chart-4)",
        },
      ];

  const appointmentWeek = useMemo(() => {
    const pMap = new Map(patients.map((p) => [p.patientId, p.fullName]));
    const dMap = new Map(doctors.map((d) => [d.doctorId, d.name]));
    return buildAppointmentWeek(appointments, pMap, dMap, isDoctorRole);
  }, [appointments, patients, doctors, isDoctorRole]);

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Greeting banner */}
      <GreetingBanner doctorName={session.name ?? "Doctor"} />

      {/* Section cards — stats-07 design */}
      <div>
        <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {statsData.map((item) => (
            <Card className="p-4 shadow-2xs" key={item.name}>
              <CardContent className="flex items-center space-x-4 p-0">
                <div className="relative flex items-center justify-center">
                  <ChartContainer className="h-[80px] w-[80px]" config={chartConfig}>
                    <RadialBarChart barSize={6} data={[item]} endAngle={-270} innerRadius={30} outerRadius={60} startAngle={90}>
                      <PolarAngleAxis angleAxisId={0} axisLine={false} domain={[0, 100]} tick={false} type="number" />
                      <RadialBar angleAxisId={0} background cornerRadius={10} dataKey="capacity" fill={item.fill} />
                    </RadialBarChart>
                  </ChartContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-semibold text-xs text-foreground">{item.capacity}%</span>
                  </div>
                </div>
                <div>
                  <dt className="font-semibold text-foreground text-sm tracking-tight leading-none mb-1">{item.name}</dt>
                  <dd className="text-muted-foreground text-xs">
                    {item.name === "Revenue" ? `₹${item.current.toLocaleString("en-IN")}` : `${item.current} of ${item.allowed} ${isDoctorRole ? 'assigned' : 'used'}`}
                  </dd>
                </div>
              </CardContent>
            </Card>
          ))}
        </dl>
      </div>

      {/* Recent Appointments + Doctor Patients / Billing row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentAppointmentsCard
          loading={loading}
          weekCalendar={appointmentWeek}
        />

        {isDoctorRole ? (
          <DoctorPatientsCard patients={patients} clinicId={clinicId} loading={loading} />
        ) : (
          <BillingOverviewCard bills={bills} loading={loading} />
        )}
      </div>
    </div>
  );
}
