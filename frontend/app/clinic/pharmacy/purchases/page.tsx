"use client"

import * as React from "react"
import { useRequireRole } from "@/hooks/use-clinic-session"
import Link from "next/link"
import {
  listPurchases,
  getPurchase,
  receivePurchase,
  listSuppliers,
  listMedicines,
  type PharmacyPurchase,
  type PharmacySupplier,
  type PharmacyMedicine,
} from "@/lib/clinic-api"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PharmacyStats } from "@/components/pharmacy-stats"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { CheckIcon } from "@heroicons/react/24/outline"
import { RowActions } from "@/components/ui/row-actions"
import { Pagination } from "@/components/ui/pagination"
import { Skeleton } from "@/components/ui/skeleton"

const fmtMoney = (n: number) =>
  `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n || 0)}`

type StatusFilter = "" | "draft" | "received" | "cancelled"

function StatusBadge({ status }: { status: PharmacyPurchase["status"] }) {
  const variant =
    status === "received"
      ? "default"
      : status === "cancelled"
        ? "destructive"
        : "secondary"
  return <Badge variant={variant}>{status}</Badge>
}

export default function PharmacyPurchasesPage() {
  const session = useRequireRole("billing_staff")
  const clinicId = session?.clinicId ?? ""

  const [purchases, setPurchases] = React.useState<PharmacyPurchase[]>([])
  const [total, setTotal] = React.useState(0)
  const [page, setPage] = React.useState(1)
  const pageSize = 20
  const [suppliers, setSuppliers] = React.useState<PharmacySupplier[]>([])
  const [medicines, setMedicines] = React.useState<PharmacyMedicine[]>([])
  const [loading, setLoading] = React.useState(true)
  const [initialLoading, setInitialLoading] = React.useState(true)
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("")
  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [detail, setDetail] = React.useState<PharmacyPurchase | null>(null)

  const supplierName = React.useCallback(
    (p: PharmacyPurchase) => p.supplierName ?? suppliers.find((s) => s.supplierId === p.supplierId)?.name ?? "—",
    [suppliers]
  )

  // Suppliers/medicines are small lookup tables (name resolution + the "new purchase" form), so a
  // single generous fetch is fine — they're not the collection that grows without bound.
  const fetchLookups = React.useCallback(async () => {
    if (!clinicId) return
    try {
      const [s, m] = await Promise.all([
        listSuppliers(clinicId, { limit: 500 }),
        listMedicines(clinicId, { limit: 500 }),
      ])
      setSuppliers(s.items ?? [])
      setMedicines(m.items ?? [])
    } catch {
      toast.error("Failed to load suppliers/medicines")
    }
  }, [clinicId])

  React.useEffect(() => {
    fetchLookups()
  }, [fetchLookups])

  // Debounced so every keystroke doesn't fire a request.
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250)
    return () => clearTimeout(t)
  }, [search])

  const fetchAll = React.useCallback(async () => {
    if (!clinicId) return
    setLoading(true)
    try {
      const p = await listPurchases(clinicId, {
        status: statusFilter || undefined,
        q: debouncedSearch || undefined,
        page,
        limit: pageSize,
      })
      setPurchases((p as any)?.items ?? [])
      setTotal((p as any)?.total ?? 0)
    } catch {
      toast.error("Failed to load purchases")
    } finally {
      setLoading(false)
      setInitialLoading(false)
    }
  }, [clinicId, statusFilter, debouncedSearch, page])

  React.useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // Clinic-wide status counts for the stat cards — independent of the table's current page/filters.
  const [statusCounts, setStatusCounts] = React.useState<{ received: number; draft: number; cancelled: number } | null>(null)
  React.useEffect(() => {
    if (!clinicId) return
    Promise.allSettled([
      listPurchases(clinicId, { status: "received", limit: 1 }),
      listPurchases(clinicId, { status: "draft", limit: 1 }),
      listPurchases(clinicId, { status: "cancelled", limit: 1 }),
    ]).then(([r, d, c]) => {
      const count = (x: PromiseSettledResult<any>) => (x.status === "fulfilled" ? x.value?.total ?? 0 : 0)
      setStatusCounts({ received: count(r), draft: count(d), cancelled: count(c) })
    })
  }, [clinicId])

  if (!session) return null

  const filtered = purchases

  async function openDetail(p: PharmacyPurchase) {
    try {
      const full = await getPurchase(clinicId, p.purchaseId)
      setDetail(full)
    } catch {
      toast.error("Failed to load details")
    }
  }

  async function handleReceive(p: PharmacyPurchase) {
    try {
      await receivePurchase(clinicId, p.purchaseId, p.notes)
      toast.success("Purchase received")
      setDetail(null)
      fetchAll()
    } catch {
      toast.error("Failed to receive purchase")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {!initialLoading && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      {(() => {
        const rec=statusCounts?.received ?? 0;const draft=statusCounts?.draft ?? 0;const canc=statusCounts?.cancelled ?? 0;
        const s=[{name:"Total",percentage:Math.min(100,total),current:total,allowed:100,allowedLabel:"orders",fill:"var(--chart-1)"},{name:"Received",percentage:total?Math.round(rec/total*100):0,current:rec,allowed:total,allowedLabel:"total",fill:"var(--chart-2)"},{name:"Draft",percentage:total?Math.round(draft/total*100):0,current:draft,allowed:total,allowedLabel:"total",fill:"var(--chart-3)"},{name:"Cancelled",percentage:total?Math.round(canc/total*100):0,current:canc,allowed:total,allowedLabel:"total",fill:"var(--chart-4)"}];
        return (<PharmacyStats title="Purchases Analytics" subtitle="Goods receipts and supplier purchase orders." searchTerm={search} onSearchChange={(v)=>{setSearch(v);setPage(1)}} searchPlaceholder="Search invoice / supplier..." action={<Button size="sm" className="h-9 shadow-sm" render={<Link href="/clinic/pharmacy/purchases/new" />}>New Purchase</Button>} items={s} />)
      })()}
        </div>
      )}

      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-2 p-4 border-b border-border">
            <span className="text-sm font-medium">Purchase Orders <span className="text-muted-foreground">({total})</span></span>
            <div className="ml-auto flex items-center gap-2">
            <Select value={statusFilter || "__all__"} onValueChange={(v) => { setStatusFilter((v === "__all__" ? "" : v) as StatusFilter); setPage(1) }}>
              <SelectTrigger className="h-9 w-32"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent><SelectItem value="__all__">All</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="received">Received</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent>
            </Select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7}><div className="space-y-2 p-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7}><div className="py-16 text-center"><p className="text-sm text-muted-foreground">{search || statusFilter ? "No purchases match your search or filters." : "No purchase orders yet — create your first one to get started."}</p></div></TableCell></TableRow>
                ) : (
                  filtered.map((p) => (
                    <TableRow key={p.purchaseId} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">{p.invoiceNumber}</TableCell>
                      <TableCell>{supplierName(p)}</TableCell>
                      <TableCell>
                        {p.purchaseDate ? new Date(p.purchaseDate).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>{(p.items ?? []).length}</TableCell>
                      <TableCell className="tabular-nums">{fmtMoney(p.total)}</TableCell>
                      <TableCell>
                        <StatusBadge status={p.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end">
                          <RowActions
                            onView={() => openDetail(p)}
                            extraBefore={
                              p.status === "draft"
                                ? [
                                    {
                                      label: "Receive",
                                      icon: <CheckIcon className="mr-2 size-3.5 text-muted-foreground" />,
                                      onSelect: () => handleReceive(p),
                                    },
                                  ]
                                : []
                            }
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {!loading && total > 0 && (
            <Pagination page={page} pageSize={pageSize} totalItems={total} onPageChange={setPage} itemLabel="purchases" />
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{detail?.invoiceNumber}</DialogTitle>
            <DialogDescription>
              {detail ? supplierName(detail) : ""}
              {detail?.purchaseDate ? ` · ${new Date(detail.purchaseDate).toLocaleDateString()}` : ""}
            </DialogDescription>
          </DialogHeader>

          {detail && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <StatusBadge status={detail.status} />
                <span className="text-muted-foreground">Items: {(detail.items ?? []).length}</span>
                <span className="ml-auto font-medium tabular-nums">{fmtMoney(detail.total)}</span>
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicine</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit ₹</TableHead>
                      <TableHead>Exp</TableHead>
                      <TableHead>Location</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.items.map((it, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          {medicines.find((m) => m.medicineId === it.medicineId)?.name ?? it.medicineId}
                        </TableCell>
                        <TableCell>{it.batchNumber}</TableCell>
                        <TableCell className="tabular-nums">{it.quantity}</TableCell>
                        <TableCell className="tabular-nums">{fmtMoney(it.unitPrice)}</TableCell>
                        <TableCell>{it.expiryDate ? new Date(it.expiryDate).toLocaleDateString() : "—"}</TableCell>
                        <TableCell>{it.storageLocation ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {detail.notes && <p className="text-sm text-muted-foreground">Notes: {detail.notes}</p>}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetail(null)}>
              Close
            </Button>
            {detail?.status === "draft" && (
              <Button onClick={() => detail && handleReceive(detail)}>
                <CheckIcon />
                Receive Goods
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
