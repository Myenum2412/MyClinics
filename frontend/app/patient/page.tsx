import Link from "next/link";
import {
  ArrowRight,
  CalendarDaysIcon,
  FileText,
  Pill,
  ReceiptText,
  Stethoscope,
} from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import Stats07 from "@/components/stats-07";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PatientUnlinked } from "@/components/patient-unlinked";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { loadPatientData } from "@/lib/patient";
import { categoryLabel } from "@/lib/report-folders";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Patient Dashboard',
  description: 'Your health overview at My Clinics — appointments, medicines, billing and medical reports in one place.',
};

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
});

function formatDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : dateFmt.format(parsed);
}

const SECTIONS = [
  {
    title: "Medical Reports",
    description: "View your appointments, bills, prescriptions and documents.",
    href: "/patient/reports",
    icon: FileText,
  },
  {
    title: "Billing",
    description: "Check your invoices and payment status.",
    href: "/patient/billing",
    icon: ReceiptText,
  },
  {
    title: "Medicines",
    description: "See medicines prescribed to you.",
    href: "/patient/medicines",
    icon: Pill,
  },
  {
    title: "Appointments",
    description: "Your upcoming and past appointments.",
    href: "/patient/appointments",
    icon: CalendarDaysIcon,
  },
  {
    title: "My Doctors",
    description: "Doctors who have treated you at the clinic.",
    href: "/patient/doctors",
    icon: Stethoscope,
  },
];

export default async function PatientDashboardPage() {
  const session = await auth();
  const db = await getDb();
  const data = await loadPatientData(db, session);
  if (!data) return <PatientUnlinked />;

  const { patient, appointments, reports, bills, prescriptions, doctors } = data;
  const medicineCount = new Set(
    prescriptions.flatMap((p) => p.medicines.map((m) => m.name.trim()).filter(Boolean))
  ).size;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome, {patient.fullName}
        </h1>
        <p className="text-sm text-muted-foreground">
          {patient.age ? `${patient.age} years` : "Age n/a"}
          {patient.gender ? ` · ${patient.gender}` : ""}
          {patient.mobile ? ` · ${patient.mobile}` : ""}
          {patient.email ? ` · ${patient.email}` : ""}
        </p>
      </div>

      <Stats07
        title="Your Health Overview"
        description="A snapshot of your records at the clinic."
        items={[
          {
            name: "Appointments",
            current: appointments.length,
            allowed: 20,
            fill: "var(--chart-1)",
          },
          {
            name: "Medical Reports",
            current: reports.length,
            allowed: 20,
            fill: "var(--chart-2)",
          },
          {
            name: "Invoices",
            current: bills.length,
            allowed: 20,
            fill: "var(--chart-3)",
          },
          {
            name: "Medicines",
            current: medicineCount,
            allowed: 20,
            fill: "var(--chart-4)",
          },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
          >
            <div className="flex items-center justify-between gap-2">
              <section.icon
                className="size-5 text-primary"
                aria-hidden="true"
              />
              <ArrowRight
                className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </div>
            <p className="mt-3 text-sm font-medium">{section.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {section.description}
            </p>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Reports</CardTitle>
            <CardDescription>Your latest documents</CardDescription>
          </div>
          <Link
            href="/patient/reports"
            className="text-sm font-medium text-foreground hover:underline"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No reports yet. They will appear here once the clinic uploads them.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {reports.slice(0, 5).map((file) => (
                <li
                  key={file.id}
                  className="flex flex-wrap items-center gap-2 py-2.5"
                >
                  <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {file.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(file.createdAt)}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {categoryLabel(file.category)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Your Doctors</CardTitle>
            <CardDescription>Doctors who have treated you</CardDescription>
          </div>
          <Link
            href="/patient/doctors"
            className="text-sm font-medium text-foreground hover:underline"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {doctors.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No doctors assigned yet. They will appear here once you have
              visits at the clinic.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {doctors.slice(0, 4).map((doctor) => (
                <li
                  key={doctor.id ?? doctor.name}
                  className="flex flex-wrap items-center gap-2 py-2.5"
                >
                  <Stethoscope
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {doctor.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {doctor.specialty ?? "Doctor"} · {doctor.visits} visit
                    {doctor.visits === 1 ? "" : "s"}
                    {doctor.lastVisit
                      ? ` · last ${formatDate(doctor.lastVisit)}`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Toaster />
    </div>
  );
}
