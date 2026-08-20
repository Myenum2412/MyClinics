"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  getMyPatient,
  listDoctors,
  listMedicalRecordFiles,
  myAppointments,
  myPrescriptions,
  type Appointment,
  type Doctor,
  type MedicalRecordFile,
  type Prescription,
} from "@/lib/clinic-api";
import { formatDate } from "@/lib/format-time";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRight,
  Calendar,
  CalendarPlus,
  ClipboardList,
  FileText,
  Folder,
  HeartPulse,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";

const QUICK_ACCESS = [
  {
    title: "Appointments",
    description: "View and manage your appointments",
    href: "/clinic/patient/appointments",
    icon: <Calendar className="size-6" />,
  },
  {
    title: "Prescriptions",
    description: "View your prescriptions and medications",
    href: "/clinic/patient/prescriptions",
    icon: <FileText className="size-6" />,
  },
  {
    title: "Medical Records",
    description: "Access your medical reports and history",
    href: "/clinic/patient/medical-records",
    icon: <Folder className="size-6" />,
  },
  {
    title: "Bills & Invoices",
    description: "View your bills and payment history",
    href: "/clinic/patient/billing",
    icon: <ReceiptText className="size-6" />,
  },
  {
    title: "Health Summary",
    description: "Overview of your health data",
    href: "/clinic/patient/medicine-records",
    icon: <ShieldCheck className="size-6" />,
  },
];

const STATUS_CLASS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
  no_show: "bg-slate-100 text-slate-600",
};

interface Activity {
  icon: React.ReactNode;
  title: string;
  description: string;
  date: string;
  badge: string;
  badgeClass: string;
  href: string;
  tint: string;
}

function doctorName(doctors: Doctor[], id: string): string {
  return doctors.find((d) => d.doctorId === id)?.name ?? "Clinic";
}

export default function PatientPortalPage() {
  const session = useRequireRole("patient");
  const [firstName, setFirstName] = useState(
    () => (session?.name ?? "there").trim().split(/\s+/)[0]
  );
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [files, setFiles] = useState<MedicalRecordFile[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  const load = useCallback(async () => {
    if (!session?.clinicId) return;
    try {
      const [patient, apptRes, filesRes, presRes, docsRes] = await Promise.all([
        getMyPatient(session.clinicId),
        myAppointments(session.clinicId, { limit: 20 }),
        listMedicalRecordFiles(session.clinicId),
        myPrescriptions(session.clinicId, { limit: 20 }),
        listDoctors(session.clinicId, { status: "active", limit: 100 }),
      ]);
      if (patient?.fullName) setFirstName(patient.fullName.trim().split(/\s+/)[0]);
      setAppointments(apptRes.items);
      setFiles(filesRes.files);
      setPrescriptions(presRes.items);
      setDoctors(docsRes.items);
    } catch {
      // keep empty state
    } finally {
      setLoading(false);
    }
  }, [session?.clinicId]);

  useEffect(() => {
    if (!session?.clinicId) return;
    load();
  }, [session?.clinicId, load]);

  const activities = useMemo<Activity[]>(() => {
    const list: Activity[] = [];

    const latestAppt = appointments[0];
    if (latestAppt) {
      list.push({
        icon: <Calendar className="size-4" />,
        title: "Appointment Booked",
        description: `${latestAppt.reason || "Consultation"} with Dr. ${doctorName(doctors, latestAppt.doctorId)}`,
        date: formatDate(latestAppt.date),
        badge: latestAppt.status.replace("_", " "),
        badgeClass: STATUS_CLASS[latestAppt.status] ?? "bg-slate-100 text-slate-600",
        href: "/clinic/patient/appointments",
        tint: "bg-blue-50 text-blue-600",
      });
    }

    const latestFile = files[0];
    if (latestFile) {
      list.push({
        icon: <FileText className="size-4" />,
        title: "Lab Report Added",
        description: latestFile.fileName,
        date: formatDate(latestFile.createdAt),
        badge: "Completed",
        badgeClass: "bg-emerald-100 text-emerald-700",
        href: "/clinic/patient/medical-records",
        tint: "bg-violet-50 text-violet-600",
      });
    }

    const latestPres = prescriptions[0];
    if (latestPres) {
      list.push({
        icon: <ClipboardList className="size-4" />,
        title: "Prescription Issued",
        description: `Dr. ${doctorName(doctors, latestPres.doctorId)}`,
        date: formatDate(latestPres.createdAt),
        badge: "View",
        badgeClass: "bg-blue-100 text-blue-700",
        href: "/clinic/patient/prescriptions",
        tint: "bg-emerald-50 text-emerald-600",
      });
    }

    return list;
  }, [appointments, files, prescriptions, doctors]);

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-8">
      {/* ── Welcome card ── */}
      <section className="relative overflow-hidden rounded-2xl border border-blue-100 bg-blue-50 p-6 md:p-8">
        <div className="relative z-10 max-w-xl">
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
            Welcome, {firstName} <span className="inline-block">👋</span>
          </h1>
          <p className="mt-2 text-sm text-slate-600 md:text-base">
            Here&apos;s an overview of your health information and recent activity.
          </p>
          <Link href="/clinic/patient/medical-records">
            <Button className="mt-5 gap-2 rounded-lg bg-blue-600 px-5 shadow-sm hover:bg-blue-700">
              <CalendarPlus className="size-4" />
              Book Appointment
            </Button>
          </Link>
        </div>

        {/* Soft decorative illustration */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 hidden items-center justify-end gap-3 pr-10 lg:flex"
        >
          <div className="relative flex size-36 items-center justify-center rounded-3xl bg-white shadow-sm ring-1 ring-blue-100 rotate-6">
            <FileText className="size-14 text-blue-500" />
          </div>
          <div className="relative flex size-28 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-blue-100 -rotate-6 -translate-y-3">
            <ClipboardList className="size-12 text-indigo-500" />
          </div>
          <div className="absolute right-20 top-4 flex size-16 items-center justify-center rounded-full bg-blue-600 text-white shadow-md">
            <ShieldCheck className="size-8" />
          </div>
          <div className="absolute bottom-6 right-40 size-4 rounded-full bg-blue-300" />
          <div className="absolute bottom-2 right-24 size-6 rounded-full bg-indigo-200" />
          <div className="absolute right-60 top-10 size-3 rounded-full bg-blue-200" />
        </div>
      </section>

      {/* ── Quick Access ── */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Quick Access</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {QUICK_ACCESS.map((qa) => (
            <Link
              key={qa.title}
              href={qa.href}
              className="group rounded-xl border border-blue-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
            >
              <span className="flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                {qa.icon}
              </span>
              <h3 className="mt-4 text-base font-semibold text-slate-900">{qa.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{qa.description}</p>
              <span className="mt-3 flex items-center justify-end text-blue-600">
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Recent Activity ── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
          <Link
            href="/clinic/patient/medical-records"
            className="group flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View All
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="space-y-3 p-5">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="p-12 text-center">
              <HeartPulse className="mx-auto mb-4 size-12 text-slate-300" />
              <h3 className="text-lg font-medium text-slate-900">No recent activity</h3>
              <p className="mt-2 text-sm text-slate-500">
                Your appointments, reports and prescriptions will appear here.
              </p>
            </div>
          ) : (
            <ul>
              {activities.map((a, i) => (
                <li key={a.title} className={i > 0 ? "border-t border-slate-100" : ""}>
                  <Link href={a.href} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50/60">
                    <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${a.tint}`}>
                      {a.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">{a.title}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{a.description}</p>
                    </div>
                    <div className="hidden shrink-0 text-xs text-slate-400 sm:block">{a.date}</div>
                    <Badge className={`${a.badgeClass} shrink-0`} variant="outline">
                      {a.badge}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}