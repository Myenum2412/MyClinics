"use client"

import { useRequireRole } from "@/hooks/use-clinic-session"
import Link from "next/link"
import { OpeningStockForm } from "@/components/clinic/pharmacy/opening-stock-form"
import { Button } from "@/components/ui/button"

export default function OpeningStockPage() {
  const session = useRequireRole("billing_staff")
  const clinicId = session?.clinicId ?? ""
  if (!session) return null
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Add Opening Stock</h1>
          <p className="text-sm text-muted-foreground">Record new stock batches received into inventory</p>
        </div>
        <Button variant="outline" render={<Link href="/clinic/pharmacy/inventory" />}>
          Back
        </Button>
      </div>
      <OpeningStockForm clinicId={clinicId} />
    </div>
  )
}
