"use client";

import { useState } from "react";
import { PlusIcon, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Stats07 from "@/components/stats-07";
import { AppointmentForm, type DoctorOption } from "@/components/appointment-form";
import { AppointmentsTable, type Appointment } from "@/components/appointments-table";
import type { PatientPick } from "@/components/patient-picker";
import type { StatsItem } from "@/lib/stats";

export function AppointmentsView({
  doctors,
  patients,
  initialAppointments,
  stats,
}: {
  doctors: DoctorOption[];
  patients?: PatientPick[];
  initialAppointments: Appointment[];
  stats?: StatsItem[];
}) {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");

  async function handleBooked() {
    const res = await fetch("/api/appointments", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setAppointments(data.appointments);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="md:w-1/3">
            <h1 className="text-xl font-semibold tracking-tight">Appointments</h1>
            <p className="text-sm text-muted-foreground">
              Book new appointments and manage the clinic&apos;s schedule.
            </p>
          </div>
          <div className="flex justify-center md:w-1/3">
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
          <div className="flex justify-end md:w-1/3">
            <Button size="sm" onClick={() => setShowForm((v) => !v)}>
              <PlusIcon className="mr-1 size-3.5" aria-hidden="true" />
              {showForm ? "Close Form" : "Book Appointment"}
            </Button>
          </div>
        </div>

        {stats && stats.length > 0 && (
          <Stats07 items={stats} className="border-0 bg-transparent p-0 shadow-none" />
        )}
      </div>

      <div className="flex flex-col gap-10">
        {showForm && (
          <AppointmentForm doctors={doctors} patients={patients} onBooked={handleBooked} />
        )}
        <AppointmentsTable
          data={appointments}
          search={search}
          doctors={doctors}
          patients={patients}
          onChanged={handleBooked}
        />
      </div>
    </div>
  );
}
