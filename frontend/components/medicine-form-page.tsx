"use client";

import {
  ArrowLeftIcon as ArrowLeft,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MedicineForm } from "@/components/medicine-form";
import type { Medicine } from "@/components/medicines-table";

export function MedicineFormPage({ initial }: { initial?: Medicine }) {
  const router = useRouter();

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {initial ? "Edit Medicine" : "Add Medicine"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {initial
                ? "Update the medicine details and save your changes."
                : "Add a new medicine to the clinic's medicine list."}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            render={<Link href="/doctor/medicines" />}
            nativeButton={false}
          >
            <ArrowLeft className="mr-1 size-3.5" aria-hidden="true" />
            Back to Medicines
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-10">
        <div className="rounded-xl border border-border bg-card p-4">
          <MedicineForm
            key={initial?.id ?? "new"}
            initial={initial}
            onSaved={async () => {
              router.push("/doctor/medicines");
              router.refresh();
            }}
          />
        </div>
      </div>
    </div>
  );
}