"use client"

import { useState } from "react"
import { useRequireRole } from "@/hooks/use-clinic-session"
import { SaleForm } from "@/components/clinic/pharmacy/sale-form"
import { FormShell } from "@/components/clinic/form-kit"

export default function NewSalePage() {
  const session = useRequireRole("billing_staff")
  const clinicId = session?.clinicId ?? ""
  const [error, setError] = useState<string | null>(null)
  if (!session) return null
  return (
    <FormShell
      title="New Sale"
      subtitle="Record a dispensing sale"
      backHref="/clinic/pharmacy/sales"
      error={error}
      onErrorDismiss={() => setError(null)}
    >
      <SaleForm clinicId={clinicId} onError={setError} />
    </FormShell>
  )
}
