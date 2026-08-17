"use client";

import { useState } from "react";
import {
  MagnifyingGlassIcon as Search,
} from "@heroicons/react/24/outline";
import { Input } from "@/components/ui/input";
import Stats07 from "@/components/stats-07";
import { AppointmentsTable, type Appointment } from "@/components/appointments-table";
import {
  DoctorsTableCard,
  PrescriptionsTableCard,
} from "@/components/patient-tables";
import type { Prescription } from "@/components/prescriptions-table";
import type { PatientDoctor } from "@/lib/patient";
import type { StatsItem } from "@/lib/stats";

export function PatientAppointments({
  appointments,
  prescriptions,
  doctors,
  stats,
}: {
  appointments: Appointment[];
  prescriptions: Prescription[];
  doctors: PatientDoctor[];
  stats?: StatsItem[];
}) {
  const [search, setSearch] = useState("");

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="md:w-1/2">
            <h1 className="text-xl font-semibold tracking-tight">My Appointments</h1>
            <p className="text-sm text-muted-foreground">
              Your upcoming and past appointments at the clinic.
            </p>
          </div>
          <div className="flex justify-center md:w-1/2">
            <div className="relative w-full max-w-sm">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search appointments..."
                className="pl-8"
                aria-label="Search appointments"
              />
            </div>
          </div>
        </div>

        {stats && stats.length > 0 && (
          <Stats07 items={stats} className="border-0 bg-transparent p-0 shadow-none" />
        )}
      </div>

      <AppointmentsTable data={appointments} search={search} canManage={false} />

      <div className="grid gap-4 lg:grid-cols-2">
        <DoctorsTableCard
          doctors={doctors}
          title="Your Doctors"
          description="Doctors who have treated you"
          href="/patient/doctors"
        />
        <PrescriptionsTableCard
          prescriptions={prescriptions}
          title="Your Prescriptions"
          description="Prescriptions from your visits"
          href="/patient/medicines"
        />
      </div>
    </div>
  );
}