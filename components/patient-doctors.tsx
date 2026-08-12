"use client";

import { useMemo, useState } from "react";
import { Search, Stethoscope } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { PatientDoctor } from "@/lib/patient";

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

export function PatientDoctors({ doctors }: { doctors: PatientDoctor[] }) {
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
          <Stethoscope className="size-8 text-muted-foreground" aria-hidden="true" />
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleDoctors.map((doctor) => (
            <div
              key={doctor.id ?? doctor.name}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Stethoscope className="size-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{doctor.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {doctor.specialty ?? "Doctor"}
                    </p>
                  </div>
                </div>
                {doctor.lastVisit && (
                  <Badge variant="outline" className="shrink-0 text-xs">
                    Last visit {formatDate(doctor.lastVisit)}
                  </Badge>
                )}
              </div>

              {(doctor.qualifications || doctor.mobile) && (
                <div className="mt-3 flex flex-col gap-0.5 text-xs text-muted-foreground">
                  {doctor.qualifications && <p>{doctor.qualifications}</p>}
                  {doctor.mobile && <p>{doctor.mobile}</p>}
                </div>
              )}

              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
                <div>
                  <p className="text-lg font-semibold tabular-nums">
                    {doctor.visits}
                  </p>
                  <p className="text-xs text-muted-foreground">Visits</p>
                </div>
                <div>
                  <p className="text-lg font-semibold tabular-nums">
                    {doctor.prescriptions}
                  </p>
                  <p className="text-xs text-muted-foreground">Rx</p>
                </div>
                <div>
                  <p className="text-lg font-semibold tabular-nums">
                    {doctor.bills}
                  </p>
                  <p className="text-xs text-muted-foreground">Bills</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
