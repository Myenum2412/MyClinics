"use client"

import { useRequireRole } from "@/hooks/use-clinic-session"
import { useParams } from "next/navigation"
import Link from "next/link"
import { SupplierForm } from "@/components/clinic/pharmacy/supplier-form"
import { Button } from "@/components/ui/button"

export default function EditSupplierPage() {
  const session = useRequireRole("billing_staff")
  const params = useParams()
  const id = Array.isArray(params.id) ? params.id[0] : (params.id ?? "")
  const clinicId = session?.clinicId ?? ""
  if (!session) return null
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit Supplier</h1>
          <p className="text-sm text-muted-foreground">Update supplier record</p>
        </div>
        <Button variant="outline" render={<Link href="/clinic/pharmacy/suppliers" />}>
          Back
        </Button>
      </div>
      {id && <SupplierForm clinicId={clinicId} id={id} />}
    </div>
  )
}
