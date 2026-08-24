"use client";

import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Bell } from "lucide-react";

interface PatientHeaderProps {
  clinicName?: string;
  unreadCount?: number;
}

export function PatientHeader({
  clinicName = "Meenu Care",
  unreadCount = 2,
}: PatientHeaderProps) {
  const displayClinicName = clinicName && clinicName !== "My Clinic" ? clinicName : "Meenu Care";

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-purple-100/80 bg-white/90 px-4 backdrop-blur-md transition-all shadow-2xs">
      {/* Left: Hamburger menu + Circular 'C' Logo + Brand Name & Subtitle */}
      <div className="flex items-center gap-3">
        <SidebarTrigger className="-ml-1 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/80 transition-colors" />

        <div className="flex items-center gap-2.5">
          {/* Circular "C" logo */}
          <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-violet-500 text-white font-black text-lg shadow-sm ring-2 ring-purple-100/80 shrink-0">
            C
          </div>

          <div className="flex flex-col min-w-0">
            <span className="truncate text-base font-bold text-slate-900 leading-tight tracking-tight">
              {displayClinicName}
            </span>
            <span className="truncate text-[11px] font-semibold text-indigo-600 leading-tight">
              Patient Portal
            </span>
          </div>
        </div>
      </div>

      {/* Right: Notifications bell icon with small notification indicator badge */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Link
          href="/clinic/notifications"
          aria-label="View notifications"
          className="relative flex size-10 items-center justify-center rounded-full bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200/60 transition-colors shadow-2xs min-h-[44px] min-w-[44px]"
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-500 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-indigo-600 ring-2 ring-white" />
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}