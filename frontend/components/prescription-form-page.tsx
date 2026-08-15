"use client";

import {
  ArrowLeftIcon as ArrowLeft,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PrescriptionForm } from "@/components/prescription-form";
import type { Prescription } from "@/components/prescriptions-table";
import type { PatientPick } from "@/components/patient-picker";

export function PrescriptionFormPage({
  initial,
  patients,
}: {
  initial?: Prescription | null;
  patients?: PatientPick[];
}) {
  const router = useRouter();

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {initial ? "Edit Prescription" : "New Prescription"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {initial
                ? "Update the prescription and save your changes."
                : "Create a new prescription for a patient."}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            render={<Link href="/doctor/prescriptions" />}
            nativeButton={false}
          >
            <ArrowLeft className="mr-1 size-3.5" aria-hidden="true" />
            Back to Prescriptions
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-10">
        <div className="rounded-xl border border-border bg-card p-4">
          <PrescriptionForm
            key={initial?.id ?? "new"}
            initial={initial}
            patients={patients}
            onSaved={async () => {
              router.push("/doctor/prescriptions");
              router.refresh();
            }}
            onCancel={() => router.push("/doctor/prescriptions")}
          />
        </div>
      </div>
    </div>
  );
}