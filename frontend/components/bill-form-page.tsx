"use client";

import {
  ArrowLeftIcon as ArrowLeft,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BillingForm } from "@/components/billing-form";
import type { Bill } from "@/components/billing-table";
import type { PatientPick } from "@/components/patient-picker";
import type { Service } from "@/components/services-view";

export function BillFormPage({
  initial,
  patients,
  services,
}: {
  initial?: Bill | null;
  patients?: PatientPick[];
  services?: Service[];
}) {
  const router = useRouter();

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {initial ? "Edit Bill" : "New Bill"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {initial
                ? "Update the bill and save your changes."
                : "Create a new bill or invoice for a patient."}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            render={<Link href="/doctor/billing" />}
            nativeButton={false}
          >
            <ArrowLeft className="mr-1 size-3.5" aria-hidden="true" />
            Back to Billing
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-10">
        <div className="rounded-xl border border-border bg-card p-4">
          <BillingForm
            key={initial?.id ?? "new"}
            initial={initial}
            patients={patients}
            services={services}
            onSaved={async () => {
              router.push("/doctor/billing");
              router.refresh();
            }}
            onCancel={() => router.push("/doctor/billing")}
          />
        </div>
      </div>
    </div>
  );
}