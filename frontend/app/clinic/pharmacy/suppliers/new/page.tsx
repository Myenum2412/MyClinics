"use client"

import { useState } from "react"
import { useRequireRole } from "@/hooks/use-clinic-session"
import { SupplierForm } from "@/components/clinic/pharmacy/supplier-form"
import { FormShell } from "@/components/clinic/form-kit"

export default function NewSupplierPage() {
  const session = useRequireRole("billing_staff")
  const clinicId = session?.clinicId ?? ""
  const [error, setError] = useState<string | null>(null)
  if (!session) return null
  return (
    <FormShell
      title="Add Supplier"
      subtitle="Create a new supplier record"
      backHref="/clinic/pharmacy/suppliers"
      error={error}
      onErrorDismiss={() => setError(null)}
    >
      <SupplierForm clinicId={clinicId} onError={setError} />
    </FormShell>
  )
}
