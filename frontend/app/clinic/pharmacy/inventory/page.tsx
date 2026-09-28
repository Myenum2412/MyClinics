"use client"

import * as React from "react"
import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useRequireRole } from "@/hooks/use-clinic-session"
import Link from "next/link"
import {
  listInventory,
  listSuppliers,
  type PharmacyInventory,
  type PharmacySupplier,
} from "@/lib/clinic-api"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PharmacyStats } from "@/components/pharmacy-stats"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const fmtMoney = (n: number) =>
  `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n || 0)}`

const STATUS_OPTIONS = [
  { value: "", label: "All status" },
  { value: "in_stock", label: "In Stock" },
  { value: "low_stock", label: "Low Stock" },
  { value: "out_of_stock", label: "Out of Stock" },
  { value: "near_expiry", label: "Near Expiry" },
  { value: "expired", label: "Expired" },
]

function statusVariant(status: PharmacyInventory["status"]): "default" | "secondary" | "destructive" {
  if (status === "in_stock") return "default"
  if (status === "out_of_stock" || status === "expired") return "destructive"
  return "secondary"
}

function fmtDate(v: string | null): string {
  if (!v) return "—"
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return d.toLocaleDateString()
}

function InventoryInner({ clinicId }: { clinicId: string }) {
  const router = useRouter()
  const params = useSearchParams()
  const initialStatus = params.get("status") ?? ""

  const [rows, setRows] = React.useState<PharmacyInventory[]>([])
  const [suppliers, setSuppliers] = React.useState<PharmacySupplier[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [status, setStatus] = React.useState(initialStatus)
  const [category, setCategory] = React.useState("")

  const [detail, setDetail] = React.useState<PharmacyInventory | null>(null)

  const supplierName = React.useCallback(
    (id: string | null) => {
      if (!id) return "—"
      return suppliers.find((s) => s.supplierId === id)?.name ?? "—"
    },
    [suppliers]
  )

  const fetchInventory = React.useCallback(() => {
    if (!clinicId) return
    setLoading(true)
    listInventory(clinicId, {
      search: search || undefined,
      status: status || undefined,
      category: category || undefined,
      limit: 500,
    })
      .then((res) => setRows((res as any)?.items ?? []))
      .catch((e: unknown) => {
        toast.error(e instanceof Error ? e.message : "Failed to load inventory")
      })
      .finally(() => setLoading(false))
  }, [clinicId, search, status, category])

  React.useEffect(() => {
    if (!clinicId) return
    let active = true
    listSuppliers(clinicId, { limit: 500 })
      .then((s) => {
        if (!active) return
        setSuppliers((s as any)?.items ?? [])
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [clinicId])

  React.useEffect(() => {
    fetchInventory()
  }, [fetchInventory])

  const onStatusChange = (v: string) => {
    setStatus(v)
    const url = v ? `/clinic/pharmacy/inventory?status=${v}` : "/clinic/pharmacy/inventory"
    router.replace(url, { scroll: false })
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {!loading && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
          {(() => {const total=rows.length;const inStock=rows.filter(r=>r.status==="in_stock").length;const lowStock=rows.filter(r=>r.status==="low_stock").length;const outStock=rows.filter(r=>r.status==="out_of_stock").length;const s=[{name:"Total Stock",percentage:Math.min(100,total),current:total,allowed:100,allowedLabel:"items",fill:"var(--chart-1)"},{name:"In Stock",percentage:total?Math.round(inStock/total*100):0,current:inStock,allowed:total,allowedLabel:"total",fill:"var(--chart-2)"},{name:"Low Stock",percentage:total?Math.round(lowStock/total*100):0,current:lowStock,allowed:total,allowedLabel:"total",fill:"var(--chart-3)"},{name:"Out of Stock",percentage:total?Math.round(outStock/total*100):0,current:outStock,allowed:total,allowedLabel:"total",fill:"var(--chart-4)"}];return (<PharmacyStats title="Inventory Analytics" subtitle="Stock levels, expiries and reorder insights." searchTerm={search} onSearchChange={setSearch} searchPlaceholder="Search medicine..." action={<div className="flex flex-col gap-2 sm:flex-row sm:items-center"><Button variant="outline" size="sm" className="h-9 w-full justify-center sm:w-auto" onClick={()=>router.push("/clinic/pharmacy/stock-history")}>Stock History</Button><Button size="sm" className="h-9 w-full justify-center shadow-sm sm:w-auto" render={<Link href="/clinic/pharmacy/inventory/opening-stock" />}>Add Opening Stock</Button></div>} items={s} />)})()}
        </div>
      )}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-border p-3 sm:p-4">
            <Input placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 min-w-[140px] flex-1 sm:flex-none sm:w-44" />
            <Select value={status} onValueChange={(v) => onStatusChange(v ?? "")}>
              <SelectTrigger className="h-9 min-w-[140px] flex-1 sm:flex-none sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>{STATUS_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}</SelectContent>
            </Select>
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">{rows.length} items</span>
          </div>
          {/* Desktop table — hidden on mobile */}
          <div className="hidden overflow-x-auto md:block">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                <TableHead>Medicine</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">Reserved</TableHead>
                <TableHead className="text-right">Damaged</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Reorder</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9}><div className="space-y-2 p-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div></TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={9}><div className="py-16 text-center"><p className="text-sm text-muted-foreground">No inventory found.</p></div></TableCell></TableRow>
              ) : (
                rows.map((inv) => (
                  <TableRow
                    key={inv.inventoryId}
                    onClick={() => setDetail(inv)}
                    className="cursor-pointer hover:bg-muted/30 border-b border-border last:border-0"
                  >
                    <TableCell>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{inv.name}</p>
                        {inv.genericName && (
                          <p className="truncate text-xs text-muted-foreground">{inv.genericName}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums">{inv.batchNumber}</TableCell>
                    <TableCell>{inv.supplierName ?? supplierName(inv.supplierId)}</TableCell>
                    <TableCell className="text-right tabular-nums">{inv.quantityAvailable}</TableCell>
                    <TableCell className="text-right tabular-nums">{inv.quantityReserved}</TableCell>
                    <TableCell className="text-right tabular-nums">{inv.quantityDamaged}</TableCell>
                    <TableCell className="tabular-nums">{fmtDate(inv.expiryDate)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(inv.status)}>{inv.status.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{inv.reorderLevel}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
          {/* Mobile card list — visible only on small screens */}
          <div className="space-y-2.5 bg-muted/40 p-3 md:hidden">
            {loading ? (
              <div className="space-y-2 p-1"><Skeleton className="h-20 w-full rounded-xl" /><Skeleton className="h-20 w-full rounded-xl" /><Skeleton className="h-20 w-full rounded-xl" /></div>
            ) : rows.length === 0 ? (
              <p className="rounded-xl border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">No inventory found.</p>
            ) : (
              rows.map((inv) => (
                <button
                  key={inv.inventoryId}
                  type="button"
                  onClick={() => setDetail(inv)}
                  className="w-full rounded-2xl border border-border bg-card p-3 text-left shadow-2xs transition active:scale-[0.99]"
                >
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-foreground">{inv.name}</p>
                      {inv.genericName ? (
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{inv.genericName}</p>
                      ) : null}
                    </div>
                    <Badge variant={statusVariant(inv.status)} className="shrink-0 text-[10px] capitalize">{inv.status.replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="mt-1 truncate text-[11px] text-muted-foreground tabular-nums">
                    {inv.batchNumber}
                    {(inv.supplierName ?? supplierName(inv.supplierId)) !== "—" ? ` · ${inv.supplierName ?? supplierName(inv.supplierId)}` : ""}
                    {` · Exp ${fmtDate(inv.expiryDate)}`}
                  </p>
                  <div className="mt-2 grid grid-cols-4 gap-1.5 text-center">
                    <div className="rounded-lg bg-muted/50 px-1 py-1.5"><p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Avail</p><p className="text-xs font-bold tabular-nums">{inv.quantityAvailable}</p></div>
                    <div className="rounded-lg bg-muted/50 px-1 py-1.5"><p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Resvd</p><p className="text-xs font-bold tabular-nums">{inv.quantityReserved}</p></div>
                    <div className="rounded-lg bg-muted/50 px-1 py-1.5"><p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Dmgd</p><p className="text-xs font-bold tabular-nums">{inv.quantityDamaged}</p></div>
                    <div className="rounded-lg bg-muted/50 px-1 py-1.5"><p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Reord</p><p className="text-xs font-bold tabular-nums">{inv.reorderLevel}</p></div>
                  </div>
                </button>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detail?.name}</DialogTitle>
            <DialogDescription>{detail?.genericName ?? "Inventory detail"}</DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-sm sm:gap-x-4 sm:gap-y-3">
              <Field label="Batch" value={detail.batchNumber} />
              <Field label="Supplier" value={detail.supplierName ?? supplierName(detail.supplierId)} />
              <Field label="Available" value={String(detail.quantityAvailable)} />
              <Field label="Reserved" value={String(detail.quantityReserved)} />
              <Field label="Damaged" value={String(detail.quantityDamaged)} />
              <Field label="Reorder Level" value={String(detail.reorderLevel)} />
              <Field label="Purchase Price" value={fmtMoney(detail.purchasePrice)} />
              <Field label="Selling Price" value={fmtMoney(detail.sellingPrice)} />
              <Field label="Expiry" value={fmtDate(detail.expiryDate)} />
              <Field label="Manufacturing" value={fmtDate(detail.manufacturingDate)} />
              <Field label="Storage Location" value={detail.storageLocation ?? "—"} />
              <Field
                label="Status"
                value={<Badge variant={statusVariant(detail.status)}>{detail.status.replace(/_/g, " ")}</Badge>}
              />
              <Field label="Category" value={detail.category ?? "—"} />
              <Field label="Barcode" value={detail.barcode ?? "—"} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetail(null)}>
              Close
            </Button>
            {detail && (
              <Button
                variant="destructive"
                render={<Link href={`/clinic/pharmacy/inventory/${detail.inventoryId}/write-off`} />}
              >
                Write Off
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-0.5">{value}</div>
    </div>
  )
}

export default function PharmacyInventoryPage() {
  const session = useRequireRole("billing_staff")
  const clinicId = session?.clinicId ?? ""
  if (!session) return null
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <InventoryInner clinicId={clinicId} />
    </Suspense>
  )
}
