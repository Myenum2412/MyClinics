"use client";

import { lazy, Suspense } from "react";
import Link from "next/link";
import { useRequireRole } from "@/hooks/use-clinic-session";
import { Button } from "@/components/ui/button";

const PatientMedicalRecords = lazy(() => import("./medical-records/page").then((m) => ({ default: m.default })));

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

export default function PatientPortalPage() {
  const session = useRequireRole("patient");

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-slate-900">Medical Records</h1>
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
        <Suspense fallback={<SectionFallback />}>
          <PatientMedicalRecords />
        </Suspense>
      </div>
    </div>
  );
}