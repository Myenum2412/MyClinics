"use client";

import Link from "next/link";
import { useRequireRole } from "@/hooks/use-clinic-session";
import { Button } from "@/components/ui/button";
import {
  Users,
  Calendar,
  Pill,
  FileText,
  CreditCard,
  Clipboard,
  FileBarChart,
  Settings,
  LogOut,
  LayoutDashboard,
} from "lucide-react";

export default function ClinicPage() {
  const session = useRequireRole("doctor");

  const navItems = [
    { href: "/clinic/patients", label: "Patients", icon: Users },
    { href: "/clinic/appointments", label: "Appointments", icon: Calendar },
    { href: "/clinic/medical-record", label: "Medical Records", icon: FileText },
    { href: "/clinic/prescriptions", label: "Prescriptions", icon: Pill },
    { href: "/clinic/billing", label: "Billing", icon: CreditCard },
    { href: "/clinic/records", label: "Medicine Records", icon: Clipboard },
    { href: "/clinic/reports", label: "Reports", icon: FileBarChart },
    { href: "/clinic/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-slate-900">Clinic Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/clinic/profile">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <LogOut className="size-4" />
              Profile
            </Button>
          </Link>
        </div>
      </div>

      <div className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto w-full">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Welcome, {session?.name || "Admin"}!</h2>
            <p className="mt-1 text-sm text-slate-500">Select a module from the sidebar or quick links below.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="outline"
                  className="h-24 w-full flex flex-col items-center justify-center gap-2 text-left hover:bg-blue-50 hover:border-blue-200 border-slate-200 transition-colors"
                >
                  <item.icon className="size-8 text-blue-600" />
                  <span className="font-medium text-slate-900">{item.label}</span>
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}