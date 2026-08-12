"use client";

import { useState } from "react";
import { PlusIcon, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Stats07 from "@/components/stats-07";
import { PatientForm } from "@/components/patient-form";
import { PatientViewDialog } from "@/components/patient-view-dialog";
import { PatientsTable, type Patient } from "@/components/patients-table";
import type { StatsItem } from "@/lib/stats";

export function PatientsView({
  initialPatients,
  stats,
  hideBilling = false,
}: {
  initialPatients: Patient[];
  stats?: StatsItem[];
  hideBilling?: boolean;
}) {
  const [patients, setPatients] = useState(initialPatients);
  const [showForm, setShowForm] = useState(false);
  const [viewing, setViewing] = useState<Patient | null>(null);
  const [search, setSearch] = useState("");

  async function handleCreated() {
    const res = await fetch("/api/patients", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setPatients(data.patients);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="md:w-1/3">
            <h1 className="text-xl font-semibold tracking-tight">Patients</h1>
            <p className="text-sm text-muted-foreground">
              Add new patients and manage patient records.
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
                placeholder="Search patients..."
                className="pl-8"
                aria-label="Search patients"
              />
            </div>
          </div>
          <div className="flex justify-end md:w-1/3">
            <Button size="sm" onClick={() => setShowForm((v) => !v)}>
              <PlusIcon className="mr-1 size-3.5" aria-hidden="true" />
              {showForm ? "Close Form" : "Add Patient"}
            </Button>
          </div>
        </div>

        {stats && stats.length > 0 && (
          <Stats07 items={stats} className="border-0 bg-transparent p-0 shadow-none" />
        )}
      </div>

      <div className="flex flex-col gap-10">
        {showForm && <PatientForm onCreated={handleCreated} />}
        <PatientsTable
          data={patients}
          search={search}
          onChanged={handleCreated}
          onView={setViewing}
        />
      </div>

      <PatientViewDialog
        key={viewing?.id ?? "none"}
        patient={viewing}
        onClose={() => setViewing(null)}
        hideBilling={hideBilling}
      />
    </div>
  );
}
