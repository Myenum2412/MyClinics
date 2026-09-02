"use client";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, HeartPulse, Pill, Package, Receipt } from "lucide-react";

const FORMS = [
  { title: "Appointments", desc: "Schedule patient visits", href: "/clinic/appointments", icon: CalendarDays, color: "bg-blue-500" },
  { title: "Treatment", desc: "Record & plan treatments", href: "/clinic/complaints", icon: HeartPulse, color: "bg-emerald-500" },
  { title: "Prescription", desc: "Create prescriptions", href: "/clinic/prescriptions", icon: Pill, color: "bg-purple-500" },
  { title: "Medicine", desc: "Manage pharmacy medicines", href: "/clinic/pharmacy/medicines", icon: Package, color: "bg-amber-500" },
  { title: "Billing", desc: "Create bills & invoices", href: "/clinic/billing", icon: Receipt, color: "bg-indigo-500" },
];

export default function QuickAddPage(){
  return (
    <div className="flex flex-col gap-6">
      <div><h1 className="text-2xl font-bold tracking-tight">Quick Add</h1><p className="text-sm text-muted-foreground">All forms in one place — click to open.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FORMS.map(f=> (
          <Link key={f.title} href={f.href} className="group">
            <Card className="h-full hover:shadow-md transition-shadow border hover:border-primary/20">
              <CardHeader className="flex flex-row items-center gap-3">
                <div className={`flex size-10 items-center justify-center rounded-xl text-white ${f.color}`}><f.icon className="size-5"/></div>
                <CardTitle className="text-base">{f.title}</CardTitle>
              </CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{f.desc}</p><span className="mt-3 inline-flex text-xs font-medium text-primary group-hover:underline">Open →</span></CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
