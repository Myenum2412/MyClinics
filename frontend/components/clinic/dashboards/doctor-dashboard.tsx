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
  listAppointments,
  listBills,
  listDoctors,
  listPatients,
} from "@/lib/clinic-api";
import { Skeleton } from "@/components/ui/skeleton";
import { BillingOverviewCard } from "@/components/clinic/billing-overview-card";
import { RecentAppointmentsCard } from "@/components/clinic/recent-appointments-card";
import { Folder, ArrowRight } from "lucide-react";

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
  bgImage: string;
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
      emoji: "🌇",
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
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
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

// ── Main Dashboard ────────────────────────────────────────────────────────────

export function DoctorDashboard({ session }: { session: ClinicSession }) {
  const clinicId = session.clinicId ?? "";

  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);

  useEffect(() => {
    if (!clinicId) return;
    let active = true;
    setLoading(true);
    Promise.allSettled([
      listAppointments(clinicId, { limit: 50 }),
      listPatients(clinicId, { limit: 50 }),
      listDoctors(clinicId, { limit: 50 }),
      listBills(clinicId, { limit: 50 }),
    ])
      .then(([apptRes, patientRes, doctorRes, billRes]) => {
        if (!active) return;
        if (apptRes.status === "fulfilled") {
          setAppointments(apptRes.value.items);
        } else {
          console.error("Failed to load appointments", apptRes.reason);
          toast.error("Failed to load appointments");
        }
        if (patientRes.status === "fulfilled") {
          setPatients(patientRes.value.items);
        } else {
          console.error("Failed to load patients", patientRes.reason);
          toast.error("Failed to load patients");
        }
        if (doctorRes.status === "fulfilled") {
          setDoctors(doctorRes.value.items);
        } else {
          console.error("Failed to load doctors", doctorRes.reason);
        }
        if (billRes.status === "fulfilled") {
          setBills(billRes.value.items);
        } else {
          console.error("Failed to load bills", billRes.reason);
          const reason = billRes.reason as unknown as { status?: number; message?: string };
          if (reason?.status !== 404) toast.error("Failed to load billing data");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [clinicId]);

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Greeting banner */}
      <GreetingBanner doctorName={session.name ?? "Doctor"} />

      {/* Recent Appointments + Billing row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentAppointmentsCard
          appointments={appointments}
          patients={patients}
          doctors={doctors}
          clinicId={clinicId}
          loading={loading}
        />

        <BillingOverviewCard bills={bills} loading={loading} />
      </div>
    </div>
  );
}
