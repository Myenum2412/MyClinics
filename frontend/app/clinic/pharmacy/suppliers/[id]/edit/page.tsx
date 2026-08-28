"use client"

import { useState } from "react"
import { useRequireRole } from "@/hooks/use-clinic-session"
import { useParams } from "next/navigation"
import { SupplierForm } from "@/components/clinic/pharmacy/supplier-form"
import { FormShell } from "@/components/clinic/form-kit"

export default function EditSupplierPage() {
  const session = useRequireRole("billing_staff")
  const params = useParams()
  const id = Array.isArray(params.id) ? params.id[0] : (params.id ?? "")
  const clinicId = session?.clinicId ?? ""
  const [error, setError] = useState<string | null>(null)
  if (!session) return null
  return (
    <FormShell
      title="Edit Supplier"
      subtitle="Update supplier record"
      backHref="/clinic/pharmacy/suppliers"
      error={error}
      onErrorDismiss={() => setError(null)}
    >
      {id && <SupplierForm clinicId={clinicId} id={id} onError={setError} />}
    </FormShell>
  )
}
