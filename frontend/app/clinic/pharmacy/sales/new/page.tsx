"use client"

import { useRequireRole } from "@/hooks/use-clinic-session"
import Link from "next/link"
import { SaleForm } from "@/components/clinic/pharmacy/sale-form"
import { Button } from "@/components/ui/button"

export default function NewSalePage() {
  const session = useRequireRole("billing_staff")
  const clinicId = session?.clinicId ?? ""
  if (!session) return null
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New Sale</h1>
          <p className="text-sm text-muted-foreground">Record a dispensing sale</p>
        </div>
        <Button variant="outline" render={<Link href="/clinic/pharmacy/sales" />}>
          Back
        </Button>
      </div>
      <SaleForm clinicId={clinicId} />
    </div>
  )
}
