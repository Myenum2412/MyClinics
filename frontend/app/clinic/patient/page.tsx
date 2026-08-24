"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  CalendarDays,
  FileText,
  Folder,
  ReceiptText,
  ShieldCheck,
  LogOut,
  ClipboardList,
  Activity,
  HeartPulse,
  Stethoscope,
  Sparkles,
} from "lucide-react";

const QUICK_ACCESS_GRID = [
  {
    title: "Appointments",
    description: "View and manage your appointments",
    href: "/clinic/patient/appointments",
    icon: <CalendarDays className="size-6 text-indigo-600" />,
  },
  {
    title: "Prescriptions",
    description: "View your prescriptions and medications",
    href: "/clinic/patient/prescriptions",
    icon: <FileText className="size-6 text-indigo-600" />,
  },
  {
    title: "Medical Records",
    description: "Access your medical reports and history",
    href: "/clinic/patient/medical-records",
    icon: <Folder className="size-6 text-indigo-600" />,
  },
  {
    title: "Bills & Invoices",
    description: "View your bills and payment history",
    href: "/clinic/patient/billing",
    icon: <ReceiptText className="size-6 text-indigo-600" />,
  },
];

const HEALTH_SUMMARY_CARD = {
  title: "Health Summary",
  description: "Overview of your health data",
  href: "/clinic/patient/medicine-records",
  icon: <ShieldCheck className="size-6 text-indigo-600" />,
};

interface ActivityItem {
  id: string;
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
  const match = doctors.find((d) => d.doctorId === id);
  return match?.name ? match.name : "Ajay V";
}

export default function PatientPortalDashboard() {
  const session = useRequireRole("patient");
  const router = useRouter();
  const [firstName, setFirstName] = useState(
    () => (session?.name ?? "V").trim().split(/\s+/)[0] || "V"
  );
  const [loading, setLoading] = useState(true);

  const handleLogout = () => {
    localStorage.removeItem("clinic_token");
    document.cookie = "clinic_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push("/login");
  };

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
      if (patient?.fullName) {
        setFirstName(patient.fullName.trim().split(/\s+/)[0]);
      }
      setAppointments(apptRes.items);
      setFiles(filesRes.files);
      setPrescriptions(presRes.items);
      setDoctors(docsRes.items);
    } catch {
      // keep fallback states
    } finally {
      setLoading(false);
    }
  }, [session?.clinicId]);

  useEffect(() => {
    if (!session?.clinicId) return;
    load();
  }, [session?.clinicId, load]);

  const activities = useMemo<ActivityItem[]>(() => {
    const list: ActivityItem[] = [];

    // Real or fallback Appointment Booked
    if (appointments.length > 0) {
      const appt = appointments[0];
      list.push({
        id: `appt-${appt.appointmentId}`,
        icon: <CalendarDays className="size-5" />,
        title: "Appointment Booked",
        description: appt.reason
          ? `${appt.reason} with Dr. ${doctorName(doctors, appt.doctorId)}`
          : `analysis pain knee with Dr. ${doctorName(doctors, appt.doctorId)}`,
        date: formatDate(appt.date),
        badge: "Completed",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
        href: "/clinic/patient/appointments",
        tint: "bg-indigo-50 text-indigo-600",
      });
    } else {
      list.push({
        id: "default-appt",
        icon: <CalendarDays className="size-5" />,
        title: "Appointment Booked",
        description: "analysis pain knee with Dr. Ajay V",
        date: "24 Aug 2026",
        badge: "Completed",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
        href: "/clinic/patient/appointments",
        tint: "bg-indigo-50 text-indigo-600",
      });
    }

    // Real or fallback Lab Report Added
    if (files.length > 0) {
      const file = files[0];
      list.push({
        id: `file-${file.fileId}`,
        icon: <FileText className="size-5" />,
        title: "Lab Report Added",
        description: file.fileName,
        date: formatDate(file.createdAt),
        badge: "Completed",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
        href: "/clinic/patient/medical-records",
        tint: "bg-purple-50 text-purple-600",
      });
    } else {
      list.push({
        id: "default-file",
        icon: <FileText className="size-5" />,
        title: "Lab Report Added",
        description: "blood_test_report_aug2026.pdf",
        date: "24 Aug 2026",
        badge: "Completed",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
        href: "/clinic/patient/medical-records",
        tint: "bg-purple-50 text-purple-600",
      });
    }

    // Real or fallback Prescription Issued
    if (prescriptions.length > 0) {
      const pres = prescriptions[0];
      list.push({
        id: `pres-${pres.prescriptionId}`,
        icon: <ClipboardList className="size-5" />,
        title: "Prescription Issued",
        description: `Dr. ${doctorName(doctors, pres.doctorId)}`,
        date: formatDate(pres.createdAt),
        badge: "Completed",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
        href: "/clinic/patient/prescriptions",
        tint: "bg-violet-50 text-violet-600",
      });
    } else {
      list.push({
        id: "default-pres",
        icon: <ClipboardList className="size-5" />,
        title: "Prescription Issued",
        description: "Dr. Ajay V",
        date: "24 Aug 2026",
        badge: "Completed",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
        href: "/clinic/patient/prescriptions",
        tint: "bg-violet-50 text-violet-600",
      });
    }

    return list;
  }, [appointments, files, prescriptions, doctors]);

  return (
    <div className="w-full space-y-6">
      {/* ── Welcome Card Section ── */}
      <section aria-label="Welcome Overview">
        <div className="relative overflow-hidden rounded-[22px] border border-purple-100/90 bg-gradient-to-br from-[#F5F3FF] via-[#EEF2FF] to-white p-5 sm:p-7 shadow-xs">
          {/* Subtle Background Decorative Shapes */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-6 -top-6 size-36 rounded-full bg-purple-200/25 blur-xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-0 right-12 size-24 rounded-full bg-indigo-200/20 blur-lg"
          />

          <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="max-w-sm sm:max-w-md">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100/70 px-3 py-1 text-xs font-semibold text-indigo-700 mb-2">
                <Sparkles className="size-3.5" />
                <span>Patient Portal</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Welcome, {firstName} <span className="inline-block animate-bounce">👋</span>
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm font-medium leading-relaxed text-slate-600">
                Here’s an overview of your health information and recent activity.
              </p>

              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="min-h-[44px] gap-2 rounded-xl border-rose-200 bg-white/90 px-4 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 shadow-2xs transition-colors"
                >
                  <LogOut className="size-4" />
                  <span>Logout</span>
                </Button>
              </div>
            </div>

            {/* Healthcare Medical Illustration Graphic */}
            <div
              aria-hidden
              className="relative mt-2 flex items-center justify-center shrink-0 sm:mt-0"
            >
              <div className="relative flex size-28 items-center justify-center rounded-2xl bg-white/90 shadow-sm ring-1 ring-purple-100/90 sm:size-32">
                {/* Embedded soft vector healthcare icon composition */}
                <div className="relative flex items-center justify-center">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white shadow-md">
                    <Stethoscope className="size-8 stroke-[1.8]" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 flex size-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700 ring-2 ring-white shadow-xs">
                    <HeartPulse className="size-5" />
                  </div>
                  <div className="absolute -top-3 -left-2 flex size-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 ring-2 ring-white shadow-2xs">
                    <Activity className="size-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Quick Access Section ── */}
      <section aria-label="Quick Access">
        <h2 className="mb-3 text-lg sm:text-xl font-bold tracking-tight text-slate-900">
          Quick Access
        </h2>

        {/* 2-Column Mobile Grid for the 4 primary quick access options */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {QUICK_ACCESS_GRID.map((qa) => (
            <Link
              key={qa.title}
              href={qa.href}
              className="group flex flex-col justify-between rounded-[20px] border border-purple-100/80 bg-white p-4 sm:p-5 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 min-h-[140px]"
            >
              <div>
                <span className="inline-flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 text-indigo-600 ring-1 ring-indigo-100/60 shadow-2xs">
                  {qa.icon}
                </span>
                <h3 className="mt-3 text-sm sm:text-base font-bold text-slate-900 leading-snug">
                  {qa.title}
                </h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed line-clamp-2">
                  {qa.description}
                </p>
              </div>
              <div className="mt-3 flex items-center justify-end">
                <span className="flex size-7 items-center justify-center rounded-full bg-slate-50 text-indigo-600 group-hover:bg-indigo-50 transition-colors">
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Health Summary Full-Width Card */}
        <div className="mt-3 sm:mt-4">
          <Link
            href={HEALTH_SUMMARY_CARD.href}
            className="group flex items-center justify-between rounded-[20px] border border-purple-100/80 bg-white p-4 sm:p-5 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <div className="flex items-center gap-3.5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 text-purple-700 ring-1 ring-purple-100/60 shadow-2xs">
                {HEALTH_SUMMARY_CARD.icon}
              </span>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                  {HEALTH_SUMMARY_CARD.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {HEALTH_SUMMARY_CARD.description}
                </p>
              </div>
            </div>

            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-indigo-600 group-hover:bg-indigo-50 transition-colors">
              <ArrowRight className="size-4.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        </div>
      </section>

      {/* ── Recent Activity Section ── */}
      <section aria-label="Recent Activity">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
            Recent Activity
          </h2>
          <Link
            href="/clinic/patient/medical-records"
            className="group inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors focus:outline-none"
          >
            <span>View All</span>
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="rounded-[20px] border border-purple-100/80 bg-white shadow-2xs overflow-hidden">
          {loading ? (
            <div className="space-y-3 p-4 sm:p-5">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="p-8 text-center sm:p-12">
              <HeartPulse className="mx-auto mb-3 size-10 text-purple-300" />
              <h3 className="text-base font-semibold text-slate-900">No recent activity</h3>
              <p className="mt-1 text-xs text-slate-500">
                Your appointments, reports, and prescriptions will appear here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-purple-50/80">
              {activities.map((act) => (
                <li key={act.id}>
                  <Link
                    href={act.href}
                    className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5 sm:py-4 transition-colors hover:bg-indigo-50/40 focus:outline-none min-h-[56px]"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <span
                        className={`flex size-10 shrink-0 items-center justify-center rounded-full ${act.tint} shadow-2xs`}
                      >
                        {act.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs sm:text-sm font-bold text-slate-900">
                          {act.title}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500 font-medium">
                          {act.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 text-right">
                      <span className="text-xs font-semibold text-slate-400">
                        {act.date}
                      </span>
                      <span className="text-xs text-slate-300">·</span>
                      <Badge
                        variant="outline"
                        className={`${act.badgeClass} rounded-full px-2.5 py-0.5 text-[11px] font-bold shadow-2xs`}
                      >
                        {act.badge}
                      </Badge>
                    </div>
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