"use client";

import { useState } from "react";
import {
  PlusIcon,
  MagnifyingGlassIcon as Search,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Stats07 from "@/components/stats-07";
import { AppointmentForm, type DoctorOption } from "@/components/appointment-form";
import { AppointmentsTable, type Appointment } from "@/components/appointments-table";
import { AppointmentPreviewPanel } from "@/components/appointment-preview-panel";
import type { PatientPick } from "@/components/patient-picker";
import type { StatsItem } from "@/lib/stats";
import { useServerPagination } from "@/hooks/use-server-pagination";

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
  const {
    rows: appointments,
    total,
    pageIndex,
    pageCount,
    search,
    setSearch,
    setPageIndex,
    refresh,
  } = useServerPagination<Appointment>({
    path: "/api/appointments",
    dataKey: "appointments",
    initialData: initialAppointments,
  });
  const [showForm, setShowForm] = useState(false);
  const [previewAppointment, setPreviewAppointment] = useState<Appointment | null>(null);

  function handleBooked() {
    return refresh();
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {previewAppointment && (
        <AppointmentPreviewPanel
          appointment={previewAppointment}
          onClose={() => setPreviewAppointment(null)}
        />
      )}
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

      <div className="flex min-w-0 flex-col gap-10">
        {showForm && (
          <AppointmentForm
            doctors={doctors}
            patients={patients}
            onBooked={handleBooked}
          />
        )}
        <AppointmentsTable
          data={appointments}
          search={search}
          doctors={doctors}
          patients={patients}
          onChanged={handleBooked}
          serverPagination={{
            pageIndex,
            pageCount,
            totalCount: total,
            onPageChange: setPageIndex,
          }}
        />
      </div>
    </div>
  );
}
