"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PlusIcon,
  MagnifyingGlassIcon as Search,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Stats07 from "@/components/stats-07";
import { DoctorForm } from "@/components/doctor-form";
import { DoctorsTable, type Doctor } from "@/components/doctors-table";
import type { StatsItem } from "@/lib/stats";

export function DoctorsView({
  initialDoctors,
  stats,
}: {
  initialDoctors: Doctor[];
  stats?: StatsItem[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function handleChanged() {
    router.refresh();
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="md:w-1/3">
            <h1 className="text-xl font-semibold tracking-tight">Doctors</h1>
            <p className="text-sm text-muted-foreground">
              Add new doctors and manage doctor accounts.
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
                placeholder="Search doctors..."
                className="pl-8"
                aria-label="Search doctors"
              />
            </div>
          </div>
          <div className="flex justify-end md:w-1/3">
            <Button size="sm" onClick={() => setShowForm((v) => !v)}>
              <PlusIcon className="mr-1 size-3.5" aria-hidden="true" />
              {showForm ? "Close Form" : "Add Doctor"}
            </Button>
          </div>
        </div>

        {stats && stats.length > 0 && (
          <Stats07 items={stats} className="border-0 bg-transparent p-0 shadow-none" />
        )}
      </div>

      <div className="flex flex-col gap-10">
        {showForm && <DoctorForm onSaved={handleChanged} />}
        <DoctorsTable
          data={initialDoctors}
          search={search}
          onChanged={handleChanged}
        />
      </div>
    </div>
  );
}
