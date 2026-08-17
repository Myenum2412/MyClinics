"use client";

import {
  BeakerIcon as Pill,
  IdentificationIcon as Stethoscope,
} from "@heroicons/react/24/outline";
import { Badge } from "@/components/ui/badge";
import { MedicinesTableCard } from "@/components/patient-tables";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Prescription } from "@/components/prescriptions-table";

export type MedicineCatalogItem = {
  id: string;
  name: string;
  category: string | null;
  notes: string | null;
};

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
});

function formatDate(value: string) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : dateFmt.format(parsed);
}

export function PatientMedicines({
  prescriptions,
  catalog,
}: {
  prescriptions: Prescription[];
  catalog: MedicineCatalogItem[];
}) {
  const sorted = [...prescriptions].sort((a, b) =>
    b.visitDate.localeCompare(a.visitDate)
  );

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">My Medicines</h1>
        <p className="text-sm text-muted-foreground">
          Medicines prescribed to you and the clinic&apos;s medicine list.
        </p>
      </div>

      <MedicinesTableCard
        prescriptions={prescriptions}
        title="Current Medicines"
        description="Medicines prescribed to you"
        href="/patient/medicines"
      />

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Pill className="size-4 text-primary" aria-hidden="true" />
          Prescription Details
        </h2>

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border p-12 text-center">
            <Pill className="size-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium">No prescriptions yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Medicines prescribed by your doctor will appear here.
              </p>
            </div>
          </div>
        ) : (
          sorted.map((prescription) => (
            <div
              key={prescription.id}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
                <Stethoscope className="size-4 text-muted-foreground" aria-hidden="true" />
                <span className="text-sm font-medium">
                  {prescription.doctorName ?? "Doctor"}
                </span>
                <span className="text-xs text-muted-foreground">
                  · {formatDate(prescription.visitDate)}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {prescription.age ? `${prescription.age} yrs · ` : ""}
                  {prescription.gender ?? "—"}
                </span>
              </div>

              <div className="mt-3 flex flex-col gap-2">
                {prescription.diagnosis && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Diagnosis: </span>
                    {prescription.diagnosis}
                  </p>
                )}
                {prescription.symptoms && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Symptoms: </span>
                    {prescription.symptoms}
                  </p>
                )}
              </div>

              {prescription.medicines.length ? (
                <div className="mt-3 overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-xs tracking-wide text-muted-foreground uppercase">
                        <th className="px-3 py-2 text-left font-medium">Medicine</th>
                        <th className="px-3 py-2 text-left font-medium">Frequency</th>
                        <th className="px-3 py-2 text-left font-medium">Duration</th>
                        <th className="px-3 py-2 text-left font-medium">When</th>
                        <th className="px-3 py-2 text-left font-medium">Instructions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prescription.medicines.map((m, i) => (
                        <tr
                          key={`${m.name}-${i}`}
                          className="border-b border-border last:border-b-0"
                        >
                          <td className="px-3 py-2 font-medium">{m.name || "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {m.frequency || "—"}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {m.duration || "—"}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {m.beforeAfterFood || "—"}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {m.specialInstructions || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  No medicines on this prescription.
                </p>
              )}

              {prescription.testsRecommended && (
                <p className="mt-3 text-sm">
                  <span className="text-muted-foreground">Tests recommended: </span>
                  {prescription.testsRecommended}
                </p>
              )}
              {prescription.followUpDate && (
                <p className="mt-2 text-sm">
                  <span className="text-muted-foreground">Follow-up: </span>
                  {formatDate(prescription.followUpDate)}
                </p>
              )}
            </div>
          ))
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Clinic Medicine List</h2>
        {catalog.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            The clinic medicine list is empty.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                  <TableHead className="h-9">Medicine</TableHead>
                  <TableHead className="h-9">Category</TableHead>
                  <TableHead className="h-9 w-full">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {catalog.map((medicine) => (
                  <TableRow
                    key={medicine.id}
                    className="border-b border-border last:border-b-0"
                  >
                    <TableCell className="py-2.5 text-sm font-medium">
                      {medicine.name}
                    </TableCell>
                    <TableCell className="py-2.5">
                      {medicine.category ? (
                        <Badge variant="secondary" className="text-xs">
                          {medicine.category}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2.5 text-sm text-muted-foreground">
                      {medicine.notes || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}