"use client";

import { useState, lazy, Suspense } from "react";
import Link from "next/link";
import { useRequireRole } from "@/hooks/use-clinic-session";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  FileText,
  Pill,
  CreditCard,
  Clipboard,
  LayoutDashboard,
  ChevronRight,
} from "lucide-react";

const PATIENT_SECTIONS = [
  {
    key: "appointments",
    label: "Appointments",
    icon: Calendar,
    description: "View and manage your upcoming and past appointments",
  },
  {
    key: "medical-records",
    label: "Medical Records",
    icon: FileText,
    description: "Access your medical history, diagnoses, and reports",
  },
  {
    key: "prescriptions",
    label: "Prescriptions",
    icon: Pill,
    description: "View your prescribed medications and dosage instructions",
  },
  {
    key: "billing",
    label: "Billing",
    icon: CreditCard,
    description: "View invoices, payment history, and outstanding balances",
  },
  {
    key: "medicine-records",
    label: "Medicine Records",
    icon: Clipboard,
    description: "Track your medicine intake and pharmacy records",
  },
] as const;

const PatientAppointments = lazy(() => import("./appointments/page").then((m) => ({ default: m.default })));
const PatientMedicalRecords = lazy(() => import("./medical-records/page").then((m) => ({ default: m.default })));
const PatientPrescriptions = lazy(() => import("./prescriptions/page").then((m) => ({ default: m.default })));
const PatientBilling = lazy(() => import("./billing/page").then((m) => ({ default: m.default })));
const PatientMedicineRecords = lazy(() => import("./medicine-records/page").then((m) => ({ default: m.default })));

function SectionFallback() {
  return (
    <div className="space-y-4">
      <div className="h-8 bg-slate-200 rounded w-1/4 animate-pulse" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-16 bg-slate-100 rounded animate-pulse" />
      ))}
    </div>
  );
}

function SectionContent({ sectionKey }: { sectionKey: string }) {
  switch (sectionKey) {
    case "appointments":
      return (
        <Suspense fallback={<SectionFallback />}>
          <PatientAppointments />
        </Suspense>
      );
    case "medical-records":
      return (
        <Suspense fallback={<SectionFallback />}>
          <PatientMedicalRecords />
        </Suspense>
      );
    case "prescriptions":
      return (
        <Suspense fallback={<SectionFallback />}>
          <PatientPrescriptions />
        </Suspense>
      );
    case "billing":
      return (
        <Suspense fallback={<SectionFallback />}>
          <PatientBilling />
        </Suspense>
      );
    case "medicine-records":
      return (
        <Suspense fallback={<SectionFallback />}>
          <PatientMedicineRecords />
        </Suspense>
      );
    default:
      return null;
  }
}

export default function PatientDashboardPage() {
  const session = useRequireRole("patient");
  const [activeSection, setActiveSection] = useState<string>("dashboard");

  if (activeSection !== "dashboard") {
    const section = PATIENT_SECTIONS.find((s) => s.key === activeSection);
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveSection("dashboard")}
              className="gap-1.5"
            >
              <LayoutDashboard className="size-4" />
              Dashboard
            </Button>
            {section && (
              <>
                <span className="text-slate-400">/</span>
                <span className="font-medium text-slate-900">{section.label}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/clinic/profile">
              <Button variant="ghost" size="sm" className="gap-1.5">
                Profile
              </Button>
            </Link>
          </div>
        </div>

        <div className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto w-full">
          <SectionContent sectionKey={activeSection} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-slate-900">My Health Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/clinic/profile">
            <Button variant="ghost" size="sm" className="gap-1.5">
              Profile
            </Button>
          </Link>
        </div>
      </div>

      <div className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto w-full">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Welcome, {session?.name || "Patient"}!</h2>
            <p className="mt-1 text-sm text-slate-500">Select a section below to view your health information.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PATIENT_SECTIONS.map((section) => (
              <Link key={section.key} href="#" onClick={(e) => { e.preventDefault(); setActiveSection(section.key); }}>
                <Button
                  variant="outline"
                  className="h-28 w-full flex flex-col items-start justify-center gap-3 text-left hover:bg-blue-50 hover:border-blue-200 border-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <section.icon className="size-10 text-blue-600" />
                    <div>
                      <span className="font-semibold text-slate-900 text-lg">{section.label}</span>
                      <p className="text-xs text-slate-500 mt-0.5">{section.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="size-5 text-slate-400 ml-auto" />
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}