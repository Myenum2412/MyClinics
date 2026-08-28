"use client"

import { useState } from "react"
import { useRequireRole } from "@/hooks/use-clinic-session"
import { PurchaseForm } from "@/components/clinic/pharmacy/purchase-form"
import { FormShell } from "@/components/clinic/form-kit"

export default function NewPurchasePage() {
  const session = useRequireRole("billing_staff")
  const clinicId = session?.clinicId ?? ""
  const [error, setError] = useState<string | null>(null)
  if (!session) return null
  return (
    <FormShell
      title="New Purchase"
      subtitle="Record a supplier purchase and its line items"
      backHref="/clinic/pharmacy/purchases"
      error={error}
      onErrorDismiss={() => setError(null)}
    >
      <PurchaseForm clinicId={clinicId} onError={setError} />
    </FormShell>
  )
}
