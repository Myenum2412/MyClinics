"use client"

import { useState } from "react"
import { useRequireRole } from "@/hooks/use-clinic-session"
import { OpeningStockForm } from "@/components/clinic/pharmacy/opening-stock-form"
import { FormShell } from "@/components/clinic/form-kit"

export default function OpeningStockPage() {
  const session = useRequireRole("billing_staff")
  const clinicId = session?.clinicId ?? ""
  const [error, setError] = useState<string | null>(null)
  if (!session) return null
  return (
    <FormShell
      title="Add Opening Stock"
      subtitle="Record new stock batches received into inventory"
      backHref="/clinic/pharmacy/inventory"
      error={error}
      onErrorDismiss={() => setError(null)}
    >
      <OpeningStockForm clinicId={clinicId} onError={setError} />
    </FormShell>
  )
}
