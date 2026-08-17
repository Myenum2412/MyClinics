"use client";

import { useMemo, useState } from "react";
import {
  MagnifyingGlassIcon as Search,
} from "@heroicons/react/24/outline";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AppointmentsTableCard } from "@/components/patient-tables";
import type { PatientDoctor } from "@/lib/patient";
import type { Appointment } from "@/components/appointments-table";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
});

function formatDate(value: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : dateFmt.format(parsed);
}

export function PatientDoctors({
  doctors,
  appointments,
}: {
  doctors: PatientDoctor[];
  appointments: Appointment[];
}) {
  const [search, setSearch] = useState("");

  const visibleDoctors = useMemo(() => {
    const q = search.trim().toLowerCase();
    return doctors.filter(
      (d) =>
        !q ||
        d.name.toLowerCase().includes(q) ||
        (d.specialty ?? "").toLowerCase().includes(q) ||
        (d.qualifications ?? "").toLowerCase().includes(q)
    );
  }, [doctors, search]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">My Doctors</h1>
        <p className="text-sm text-muted-foreground">
          Doctors who have treated you at the clinic.
        </p>
      </div>

      <div className="relative w-full max-w-xs">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search doctors..."
          aria-label="Search doctors"
          className="pl-8"
        />
      </div>

      {visibleDoctors.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border p-12 text-center">
          <div>
            <p className="text-sm font-medium">No doctors yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {search
                ? "No doctors match your search."
                : "Doctors who treat you will appear here once you have visits."}
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                <TableHead className="h-9">Doctor</TableHead>
                <TableHead className="h-9">Visits</TableHead>
                <TableHead className="h-9">Prescriptions</TableHead>
                <TableHead className="h-9">Bills</TableHead>
                <TableHead className="h-9 pr-4">Last Visit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleDoctors.map((doctor) => (
                <TableRow
                  key={doctor.id ?? doctor.name}
                  className="border-b border-border last:border-b-0"
                >
                  <TableCell className="py-3">
                    <p className="text-sm font-medium">{doctor.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {doctor.specialty ?? "Doctor"}
                      {doctor.qualifications
                        ? ` · ${doctor.qualifications}`
                        : ""}
                      {doctor.mobile ? ` · ${doctor.mobile}` : ""}
                    </p>
                  </TableCell>
                  <TableCell className="py-3 text-sm font-medium tabular-nums">
                    {doctor.visits}
                  </TableCell>
                  <TableCell className="py-3 text-sm tabular-nums">
                    {doctor.prescriptions}
                  </TableCell>
                  <TableCell className="py-3 text-sm tabular-nums">
                    {doctor.bills}
                  </TableCell>
                  <TableCell className="py-3 pr-4 text-sm text-muted-foreground tabular-nums">
                    {formatDate(doctor.lastVisit)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AppointmentsTableCard
        appointments={appointments}
        title="Your Appointments"
        description="Your bookings at the clinic"
        href="/patient/appointments"
      />
    </div>
  );
}