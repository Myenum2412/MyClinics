"use client";

import {
  ArrowLeftIcon as ArrowLeft,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PatientForm } from "@/components/patient-form";
import type { Patient } from "@/components/patients-table";

export function PatientFormPage({ initial }: { initial?: Patient }) {
  const router = useRouter();

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {initial ? "Edit Patient" : "Add Patient"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {initial
                ? "Update the patient&apos;s details and save your changes."
                : "Fill in the patient details below to add a new record."}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            render={<Link href="/doctor/patients" />}
            nativeButton={false}
          >
            <ArrowLeft className="mr-1 size-3.5" aria-hidden="true" />
            Back to Patients
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-10">
        <div className="rounded-xl border border-border bg-card p-4">
          <PatientForm
            key={initial?.id ?? "new"}
            initial={initial}
            onCreated={async () => {
              router.push("/doctor/patients");
              router.refresh();
            }}
          />
        </div>
      </div>
    </div>
  );
}