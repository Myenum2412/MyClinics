"use client";

import { useState } from "react";
import { useRequireRole } from "@/hooks/use-clinic-session";
import { MedicineForm } from "@/components/clinic/pharmacy/medicine-form";
import { FormShell } from "@/components/clinic/form-kit";

export default function NewMedicinePage() {
  const session = useRequireRole("billing_staff");
  const clinicId = session?.clinicId ?? "";
  const [error, setError] = useState<string | null>(null);
  if (!session) return null;
  return (
    <FormShell
      title="Add Medicine"
      subtitle="Create a new medicine master record"
      backHref="/clinic/pharmacy/medicines"
      error={error}
      onErrorDismiss={() => setError(null)}
    >
      <MedicineForm clinicId={clinicId} onError={setError} />
    </FormShell>
  );
}
