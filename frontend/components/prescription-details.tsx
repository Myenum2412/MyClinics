"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { printPrescription } from "@/components/prescription-print";
import type { Prescription } from "@/components/prescriptions-table";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
});

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : dateFmt.format(parsed);
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export function PrescriptionDetails({
  prescription,
}: {
  prescription: Prescription;
}) {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {prescription.patientName}
            </h1>
            <p className="text-sm text-muted-foreground">
              Prescription · {formatDate(prescription.visitDate)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/doctor/prescriptions" />}
              nativeButton={false}
            >
              <ArrowLeft className="mr-1 size-3.5" aria-hidden="true" />
              Back to Prescriptions
            </Button>
            <Button
              size="sm"
              render={<Link href={`/doctor/prescriptions/${prescription.id}/edit`} />}
              nativeButton={false}
            >
              Edit Prescription
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => printPrescription(prescription)}
            >
              <Printer className="size-3.5" aria-hidden="true" />
              Print
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Details
          </h2>
          <Row
            label="Age / Gender"
            value={`${prescription.age ?? "—"} / ${prescription.gender ?? "—"}`}
          />
          <Row label="Phone" value={prescription.phone || "—"} />
          <Row label="Visit Date" value={formatDate(prescription.visitDate)} />
          <Row label="Doctor" value={prescription.doctorName ?? "—"} />
          <Row label="Diagnosis" value={prescription.diagnosis} />
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Follow-up & Tests
          </h2>
          <Row label="Symptoms / Notes" value={prescription.symptoms ?? "—"} />
          <Row
            label="Tests Recommended"
            value={prescription.testsRecommended ?? "—"}
          />
          <Row label="Follow-up" value={formatDate(prescription.followUpDate)} />
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Medicines ({prescription.medicines.length})
          </h2>
          {prescription.medicines.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {prescription.medicines.map((m, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-muted/30 p-4 text-sm"
                >
                  <p className="font-medium">{m.name || "Medicine"}</p>
                  <div className="mt-1.5 grid gap-1 text-muted-foreground sm:grid-cols-2">
                    <span>Frequency: {m.frequency || "—"}</span>
                    <span>Duration: {m.duration || "—"}</span>
                    <span>Food: {m.beforeAfterFood || "—"}</span>
                    {m.specialInstructions && (
                      <span className="sm:col-span-2">
                        Instructions: {m.specialInstructions}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No medicines.</p>
          )}
        </div>
      </div>
    </div>
  );
}