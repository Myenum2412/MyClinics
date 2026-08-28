"use client";

import { useState } from "react";
import { useRequireRole } from "@/hooks/use-clinic-session";
import { useParams } from "next/navigation";
import { MedicineForm } from "@/components/clinic/pharmacy/medicine-form";
import { FormShell } from "@/components/clinic/form-kit";

export default function EditMedicinePage() {
  const session = useRequireRole("billing_staff");
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id ?? "");
  const clinicId = session?.clinicId ?? "";
  const [error, setError] = useState<string | null>(null);
  if (!session) return null;
  return (
    <FormShell
      title="Edit Medicine"
      subtitle="Update medicine master record"
      backHref="/clinic/pharmacy/medicines"
      error={error}
      onErrorDismiss={() => setError(null)}
    >
      {id && <MedicineForm clinicId={clinicId} id={id} onError={setError} />}
    </FormShell>
  );
}
