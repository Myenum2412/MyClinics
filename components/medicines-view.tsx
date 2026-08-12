"use client";

import { useState } from "react";
import { PlusIcon, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Stats07 from "@/components/stats-07";
import { MedicineForm } from "@/components/medicine-form";
import { MedicinesTable, type Medicine } from "@/components/medicines-table";
import type { StatsItem } from "@/lib/stats";

export function MedicinesView({
  initialMedicines,
  stats,
}: {
  initialMedicines: Medicine[];
  stats?: StatsItem[];
}) {
  const [medicines, setMedicines] = useState(initialMedicines);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");

  async function handleChanged() {
    const res = await fetch("/api/medicines", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setMedicines(data.medicines);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="md:w-1/3">
            <h1 className="text-xl font-semibold tracking-tight">Medicines</h1>
            <p className="text-sm text-muted-foreground">
              Manage the medicine list used in prescriptions.
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
                placeholder="Search medicines..."
                className="pl-8"
                aria-label="Search medicines"
              />
            </div>
          </div>
          <div className="flex justify-end md:w-1/3">
            <Button size="sm" onClick={() => setShowForm((v) => !v)}>
              <PlusIcon className="mr-1 size-3.5" aria-hidden="true" />
              {showForm ? "Close Form" : "Add Medicine"}
            </Button>
          </div>
        </div>

        {stats && stats.length > 0 && (
          <Stats07 items={stats} className="border-0 bg-transparent p-0 shadow-none" />
        )}
      </div>

      <div className="flex flex-col gap-10">
        {showForm && <MedicineForm onSaved={handleChanged} />}
        <MedicinesTable data={medicines} search={search} onChanged={handleChanged} />
      </div>
    </div>
  );
}
