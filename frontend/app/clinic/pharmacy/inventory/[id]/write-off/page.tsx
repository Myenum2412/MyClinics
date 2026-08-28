"use client"

import { useState } from "react"
import { useRequireRole } from "@/hooks/use-clinic-session"
import { useParams } from "next/navigation"
import { WriteOffForm } from "@/components/clinic/pharmacy/write-off-form"
import { FormShell } from "@/components/clinic/form-kit"

export default function WriteOffPage() {
  const session = useRequireRole("billing_staff")
  const params = useParams()
  const id = Array.isArray(params.id) ? params.id[0] : (params.id ?? "")
  const clinicId = session?.clinicId ?? ""
  const [error, setError] = useState<string | null>(null)
  if (!session) return null
  return (
    <FormShell
      title="Write Off Stock"
      subtitle="Reduce damaged, wasted or expired stock"
      backHref="/clinic/pharmacy/inventory"
      error={error}
      onErrorDismiss={() => setError(null)}
    >
      {id && <WriteOffForm clinicId={clinicId} inventoryId={id} onError={setError} />}
    </FormShell>
  )
}
