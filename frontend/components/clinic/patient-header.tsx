"use client";

import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { CalendarPlus } from "lucide-react";

export function PatientHeader() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-slate-100 bg-white px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
      <h1 className="text-lg font-semibold text-slate-900">Patient</h1>
      <div className="ml-auto flex items-center gap-3">
        <Link href="/clinic/patient/medical-records">
          <Button className="gap-2 rounded-lg bg-blue-600 px-4 shadow-sm hover:bg-blue-700">
            <CalendarPlus className="size-4" />
            Book Appointment
          </Button>
        </Link>
      </div>
    </header>
  );
}