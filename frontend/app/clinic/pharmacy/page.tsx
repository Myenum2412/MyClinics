"use client"

import * as React from "react"
import Link from "next/link"
import { useRequireRole } from "@/hooks/use-clinic-session"
import {
  getPharmacyDashboard,
  getPharmacyAlerts,
  type PharmacyDashboard,
  type PharmacyAlerts,
} from "@/lib/clinic-api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

const fmtMoney = (n: number) =>
  `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n || 0)}`

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: "default" | "warn" | "danger" | "ok"
}) {
  const toneClass =
    tone === "danger"
      ? "text-red-600"
      : tone === "warn"
        ? "text-amber-600"
        : tone === "ok"
          ? "text-emerald-600"
          : "text-foreground"
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`mt-1 text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
      </CardContent>
    </Card>
  )
}

export default function PharmacyDashboardPage() {
  const session = useRequireRole("billing_staff")
  const clinicId = session?.clinicId ?? ""
  const [dash, setDash] = React.useState<PharmacyDashboard | null>(null)
  const [alerts, setAlerts] = React.useState<PharmacyAlerts | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!clinicId) return
    let active = true
    setLoading(true)
    Promise.all([getPharmacyDashboard(clinicId), getPharmacyAlerts(clinicId)])
      .then(([d, a]) => {
        if (!active) return
        setDash(d)
        setAlerts(a)
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [clinicId])

  if (!session) return null

  const statuses = [
    { label: "In Stock", value: (dash?.totalMedicines ?? 0) - (dash?.lowStock ?? 0) - (dash?.outOfStock ?? 0), tone: "bg-emerald-500" as const },
    { label: "Low", value: dash?.lowStock ?? 0, tone: "bg-amber-500" as const },
    { label: "Out", value: dash?.outOfStock ?? 0, tone: "bg-red-500" as const },
    { label: "Near Expiry", value: dash?.nearExpiry ?? 0, tone: "bg-orange-400" as const },
    { label: "Expired", value: dash?.expired ?? 0, tone: "bg-rose-700" as const },
  ]
  const maxStatus = Math.max(1, ...statuses.map((s) => s.value))

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pharmacy</h1>
          <p className="text-sm text-muted-foreground">Inventory health and dispensing overview</p>
        </div>
        <Button render={<Link href="/clinic/pharmacy/sales" />}>New Sale</Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {loading || !dash ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-5">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="mt-2 h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Stat label="Stock Value" value={fmtMoney(dash.totalStockValue)} tone="ok" />
            <Stat label="Low Stock" value={String(dash.lowStock)} tone="warn" />
            <Stat label="Out of Stock" value={String(dash.outOfStock)} tone="danger" />
            <Stat label="Near Expiry" value={String(dash.nearExpiry)} tone="warn" />
            <Stat label="Reorder" value={String(dash.reorderCount)} tone="warn" />
            <Stat label="Medicines" value={String(dash.totalMedicines)} />
            <Stat label="Today Sales" value={`${dash.todaySales.count} · ${fmtMoney(dash.todaySales.value)}`} tone="ok" />
            <Stat label="Purchase Value" value={fmtMoney(dash.purchaseValue)} />
            <Stat label="Movements Today" value={String(dash.stockMovementsToday)} />
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stock Status Distribution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {statuses.map((s) => (
            <div key={s.label} className="flex items-center gap-3 text-sm">
              <span className="w-24 shrink-0 text-muted-foreground">{s.label}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full ${s.tone}`} style={{ width: `${(s.value / maxStatus) * 100}%` }} />
              </div>
              <span className="w-10 shrink-0 text-right tabular-nums">{s.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Low Stock &amp; Reorder</CardTitle>
            <Button variant="ghost" size="sm" render={<Link href="/clinic/pharmacy/inventory?status=low_stock" />}>
              View
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {!alerts ? (
              <Skeleton className="h-20 w-full" />
            ) : alerts.lowStock.length === 0 && alerts.reorderSuggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No low-stock items.</p>
            ) : (
              alerts.reorderSuggestions.slice(0, 6).map((r) => (
                <div key={r.inventoryId} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">Batch {r.batchNumber} · avail {r.available}</p>
                  </div>
                  <Badge variant="secondary">order {r.suggested}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Out of Stock</CardTitle>
            <Button variant="ghost" size="sm" render={<Link href="/clinic/pharmacy/inventory?status=out_of_stock" />}>
              View
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {!alerts ? (
              <Skeleton className="h-20 w-full" />
            ) : alerts.outOfStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing out of stock. 🎉</p>
            ) : (
              alerts.outOfStock.slice(0, 6).map((i) => (
                <div key={i.inventoryId} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{i.name}</p>
                    <p className="text-xs text-muted-foreground">Batch {i.batchNumber}</p>
                  </div>
                  <Badge variant="destructive">out</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Near Expiry (next 90 days)</CardTitle>
            <Button variant="ghost" size="sm" render={<Link href="/clinic/pharmacy/inventory?status=near_expiry" />}>
              View
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {!alerts ? (
              <Skeleton className="h-20 w-full" />
            ) : alerts.nearExpiry.length === 0 ? (
              <p className="text-sm text-muted-foreground">No near-expiry items.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {alerts.nearExpiry.slice(0, 8).map((i) => (
                  <div key={i.inventoryId} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{i.name}</p>
                      <p className="text-xs text-muted-foreground">Exp {i.expiryDate ? new Date(i.expiryDate).toLocaleDateString() : "—"}</p>
                    </div>
                    <Badge variant="secondary">expiring</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
