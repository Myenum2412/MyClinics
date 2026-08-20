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
  Stethoscope,
} from "lucide-react";

export default function ClinicPage() {
  useRequireRole("doctor");

  const sections = [
    { href: "/clinic/patients", label: "Patients", description: "Manage patient records", icon: Users },
    { href: "/clinic/appointments", label: "Appointments", description: "Schedule and track visits", icon: Calendar },
    { href: "/clinic/medical-record", label: "Medical Records", description: "Clinical records & files", icon: FileText },
    { href: "/clinic/prescriptions", label: "Prescriptions", description: "Write and manage e-prescriptions", icon: Pill },
    { href: "/clinic/billing", label: "Billing", description: "Invoices and payments", icon: CreditCard },
    { href: "/clinic/records", label: "Medicine Records", description: "Medicine inventory tracking", icon: Clipboard },
    { href: "/clinic/doctors", label: "Doctors", description: "Manage clinic doctors", icon: Stethoscope },
    { href: "/clinic/reports", label: "Reports", description: "Analytics and exports", icon: FileBarChart },
    { href: "/clinic/settings", label: "Settings", description: "Clinic configuration", icon: Settings },
  ];

  return (
    <div className="w-full">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Button
              variant="outline"
              className="h-28 w-full flex flex-col items-start justify-center gap-2 px-6 text-left hover:border-primary/40 hover:bg-primary/5 transition-colors"
            >
              <section.icon className="size-6 text-primary" />
              <div>
                <div className="font-semibold text-foreground">{section.label}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{section.description}</div>
              </div>
            </Button>
          </Link>
        ))}
      </div>
    </div>
  );
}