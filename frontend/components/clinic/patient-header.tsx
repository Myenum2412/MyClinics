"use client";

import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { CalendarPlus } from "lucide-react";

export function PatientHeader() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
      <h1 className="text-lg font-semibold text-foreground">Patient</h1>
      <div className="ml-auto flex items-center gap-3">
        <ThemeToggle />
        <Link href="/clinic/patient/book-appointment">
          <Button className="gap-2 rounded-lg px-4 shadow-sm">
            <CalendarPlus className="size-4" />
            Book Appointment
          </Button>
        </Link>
      </div>
    </header>
  );
}