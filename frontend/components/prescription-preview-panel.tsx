"use client";

import Link from "next/link";
import {
  ArrowRightIcon as ArrowRight,
  PencilIcon as Pencil,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { PreviewSheet } from "@/components/preview-sheet";
import type { Prescription } from "@/components/prescriptions-table";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : dateFmt.format(parsed);
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export function PrescriptionPreviewPanel({
  prescription,
  onClose,
}: {
  prescription: Prescription;
  onClose: () => void;
}) {
  return (
    <PreviewSheet
      title={<span className="truncate">{prescription.patientName}</span>}
      subtitle={`Visit ${formatDate(prescription.visitDate)} · ${
        prescription.doctorName ?? "—"
      }`}
      onClose={onClose}
      footer={
        <>
          <Button
            variant="outline"
            className="flex-1"
            render={
              <Link href={`/doctor/prescriptions/${prescription.id}/edit`} />
            }
            nativeButton={false}
          >
            <Pencil className="mr-1 size-3.5" aria-hidden="true" />
            Edit
          </Button>
          <Button
            className="flex-1"
            render={<Link href={`/doctor/prescriptions/${prescription.id}`} />}
            nativeButton={false}
          >
            View Full Page
            <ArrowRight className="ml-1 size-3.5" aria-hidden="true" />
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Details
        </h2>
        <Field
          label="Age / Gender"
          value={`${prescription.age ?? "—"} / ${prescription.gender ?? "—"}`}
        />
        <Field label="Phone" value={prescription.phone ?? "—"} />
        <Field label="Diagnosis" value={prescription.diagnosis || "—"} />
        {prescription.symptoms && (
          <Field label="Symptoms" value={prescription.symptoms} />
        )}
        {prescription.testsRecommended && (
          <Field
            label="Tests Recommended"
            value={prescription.testsRecommended}
          />
        )}
        <Field
          label="Follow-up"
          value={formatDate(prescription.followUpDate)}
        />
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Medicines ({prescription.medicines.length})
        </h2>
        {prescription.medicines.length ? (
          <div className="flex flex-col gap-2">
            {prescription.medicines.map((m, i) => (
              <div
                key={`${m.name}-${i}`}
                className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
              >
                <p className="font-medium">{m.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {[m.frequency, m.duration]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
                {(m.beforeAfterFood || m.specialInstructions) && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[m.beforeAfterFood, m.specialInstructions]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No medicines.</p>
        )}
      </div>
    </PreviewSheet>
  );
}