"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { printPrescription } from "@/components/prescription-print";
import type { Prescription } from "@/components/prescriptions-table";

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

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export function PrescriptionViewDialog({
  prescription,
  onClose,
}: {
  prescription: Prescription | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(prescription)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] w-full max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{prescription?.patientName}</DialogTitle>
          <DialogDescription>
            Prescription · {prescription ? formatDate(prescription.visitDate) : ""}
          </DialogDescription>
        </DialogHeader>

        {prescription && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-4">
              <Row label="Age / Gender" value={`${prescription.age ?? "—"} / ${prescription.gender ?? "—"}`} />
              <Row label="Phone" value={prescription.phone || "—"} />
              <Row label="Visit Date" value={formatDate(prescription.visitDate)} />
              <Row label="Doctor" value={prescription.doctorName ?? "—"} />
              <Row label="Diagnosis" value={prescription.diagnosis} />
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                Medicines
              </h3>
              {prescription.medicines.length ? (
                <div className="flex flex-col gap-2">
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

            <div className="flex flex-col gap-2">
              {prescription.symptoms && (
                <Row label="Symptoms / Notes" value={prescription.symptoms} />
              )}
              {prescription.testsRecommended && (
                <Row label="Tests" value={prescription.testsRecommended} />
              )}
              <Row label="Follow-up" value={formatDate(prescription.followUpDate)} />
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => printPrescription(prescription)}
              >
                <Printer className="size-3.5" aria-hidden="true" />
                Print
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
