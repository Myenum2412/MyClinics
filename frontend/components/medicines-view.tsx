"use client";

import { useState } from "react";
import Link from "next/link";
import { PlusIcon, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Stats07 from "@/components/stats-07";
import { MedicinesTable, type Medicine } from "@/components/medicines-table";
import { MedicinePreviewPanel } from "@/components/medicine-preview-panel";
import type { StatsItem } from "@/lib/stats";
import { useServerPagination } from "@/hooks/use-server-pagination";

export function MedicinesView({
  initialMedicines,
  stats,
}: {
  initialMedicines: Medicine[];
  stats?: StatsItem[];
}) {
  const {
    rows: medicines,
    total,
    pageIndex,
    pageCount,
    search,
    setSearch,
    setPageIndex,
    refresh,
  } = useServerPagination<Medicine>({
    path: "/api/medicines",
    dataKey: "medicines",
    initialData: initialMedicines,
  });

  function handleChanged() {
    return refresh();
  }

  const [previewMedicine, setPreviewMedicine] = useState<Medicine | null>(null);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {previewMedicine && (
        <MedicinePreviewPanel
          medicine={previewMedicine}
          onClose={() => setPreviewMedicine(null)}
        />
      )}
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
            <Button
              size="sm"
              render={<Link href="/doctor/medicines/new" />}
              nativeButton={false}
            >
              <PlusIcon className="mr-1 size-3.5" aria-hidden="true" />
              Add Medicine
            </Button>
          </div>
        </div>

        {stats && stats.length > 0 && (
          <Stats07 items={stats} className="border-0 bg-transparent p-0 shadow-none" />
        )}
      </div>

      <div className="flex flex-col gap-10">
        <MedicinesTable
          data={medicines}
          search={search}
          onChanged={handleChanged}
          onPreview={setPreviewMedicine}
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
