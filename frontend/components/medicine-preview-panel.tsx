"use client";

import Link from "next/link";
import {
  ArrowRightIcon as ArrowRight,
  PencilIcon as Pencil,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { PreviewSheet } from "@/components/preview-sheet";
import type { Medicine } from "@/components/medicines-table";

export function MedicinePreviewPanel({
  medicine,
  onClose,
}: {
  medicine: Medicine;
  onClose: () => void;
}) {
  return (
    <PreviewSheet
      title={<span className="truncate">{medicine.name}</span>}
      subtitle={medicine.category ?? "No category"}
      onClose={onClose}
      footer={
        <Button
          className="w-full"
          render={<Link href={`/doctor/medicines/${medicine.id}/edit`} />}
          nativeButton={false}
        >
          <Pencil className="mr-1 size-3.5" aria-hidden="true" />
          Edit Medicine
          <ArrowRight className="ml-1 size-3.5" aria-hidden="true" />
        </Button>
      }
    >
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Details
        </h2>
        <div className="flex items-baseline justify-between gap-4 text-sm">
          <span className="shrink-0 text-muted-foreground">S.No</span>
          <span className="text-right font-medium tabular-nums">
            {medicine.sno ?? "—"}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-4 text-sm">
          <span className="shrink-0 text-muted-foreground">Name</span>
          <span className="text-right font-medium">{medicine.name}</span>
        </div>
        <div className="flex items-baseline justify-between gap-4 text-sm">
          <span className="shrink-0 text-muted-foreground">Category</span>
          <span className="text-right font-medium">
            {medicine.category ?? "—"}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-4 text-sm">
          <span className="shrink-0 text-muted-foreground">Composition</span>
          <span className="text-right font-medium">
            {medicine.composition ?? "—"}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-4 text-sm">
          <span className="shrink-0 text-muted-foreground">Dosage</span>
          <span className="text-right font-medium">
            {medicine.dosage ?? "—"}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-4 text-sm">
          <span className="shrink-0 text-muted-foreground">
            Prescription
          </span>
          <span className="text-right font-medium">
            {medicine.requiresPrescription ? "Rx only" : "OTC"}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-4 text-sm">
          <span className="shrink-0 text-muted-foreground">Notes</span>
          <span className="text-right font-medium">{medicine.notes ?? "—"}</span>
        </div>
      </div>
    </PreviewSheet>
  );
}