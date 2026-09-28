"use client"

import * as React from "react"
import { useRequireRole } from "@/hooks/use-clinic-session"
import Link from "next/link"
import {
  listSales,
  getSale,
  listMedicines,
  type PharmacySale,
  type PharmacyMedicine,
  type PharmacySaleItem,
} from "@/lib/clinic-api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { PharmacyStats } from "@/components/pharmacy-stats"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Pagination } from "@/components/ui/pagination"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const fmtMoney = (n: number) =>
  `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n || 0)}`

type SaleStatus = "completed" | "cancelled" | "refunded"

function statusBadge(status: SaleStatus) {
  switch (status) {
    case "completed":
      return <Badge variant="secondary">Completed</Badge>
    case "cancelled":
      return <Badge variant="destructive">Cancelled</Badge>
    case "refunded":
      return <Badge variant="outline">Refunded</Badge>
  }
}

export default function PharmacySalesPage() {
  const session = useRequireRole("billing_staff")
  const clinicId = session?.clinicId ?? ""
  const [sales, setSales] = React.useState<PharmacySale[]>([])
  const [total, setTotal] = React.useState(0)
  const [page, setPage] = React.useState(1)
  const pageSize = 20
  const [medicines, setMedicines] = React.useState<PharmacyMedicine[]>([])
  const [loading, setLoading] = React.useState(true)
  const [initialLoading, setInitialLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<"" | SaleStatus>("")
  const [detail, setDetail] = React.useState<PharmacySale | null>(null)

  // The medicine catalog is a bounded lookup table (used to show line-item names in a sale's
  // detail view) — unrelated to the sales list's own pagination.
  React.useEffect(() => {
    if (!clinicId) return
    listMedicines(clinicId, { limit: 2000 }).then((m) => setMedicines(m.items ?? [])).catch(() => {})
  }, [clinicId])

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250)
    return () => clearTimeout(t)
  }, [search])

  const reload = React.useCallback(async () => {
    if (!clinicId) return
    setLoading(true)
    try {
      const s = await listSales(clinicId, {
        status: statusFilter || undefined,
        q: debouncedSearch || undefined,
        page,
        limit: pageSize,
      })
      setSales((s as any)?.items ?? [])
      setTotal((s as any)?.total ?? 0)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load sales")
    } finally {
      setLoading(false)
      setInitialLoading(false)
    }
  }, [clinicId, statusFilter, debouncedSearch, page])

  React.useEffect(() => {
    if (!clinicId) return
    void reload()
  }, [clinicId, reload])

  // Clinic-wide "today" count for the stat card — independent of the table's page/filters.
  const [todaySalesCount, setTodaySalesCount] = React.useState<number | null>(null)
  React.useEffect(() => {
    if (!clinicId) return
    const todayStr = new Date().toISOString().slice(0, 10)
    listSales(clinicId, { from: todayStr, to: todayStr, limit: 1 })
      .then((r) => setTodaySalesCount((r as any)?.total ?? 0))
      .catch(() => {})
  }, [clinicId])

  const medicineById = React.useMemo(() => {
    const map = new Map<string, PharmacyMedicine>()
    for (const m of medicines) map.set(m.medicineId, m)
    return map
  }, [medicines])

  if (!session) return null

  const filtered = sales

  async function openDetail(s: PharmacySale) {
    try {
      const full = await getSale(clinicId, s.saleId)
      setDetail(full)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load sale")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {!initialLoading && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      {(() => {
        // "Completed" and "Revenue" are computed from this page's own rows (a sample), so their
        // percentage is relative to that sample size, not the clinic-wide `total`.
        const sampleTotal = sales.length;
        const completed = sales.filter((s) => s.status === "completed").length;
        const totalVal = sales.reduce((s, x) => s + x.total, 0);
        const todayCount = todaySalesCount ?? 0;
        const stats = [
          { name: "Total Sales", percentage: Math.min(100, total), current: total, allowed: 100, allowedLabel: "sales", fill: "var(--chart-1)" },
          { name: "Completed", percentage: sampleTotal ? Math.round((completed / sampleTotal) * 100) : 0, current: completed, allowed: sampleTotal, allowedLabel: "this page", fill: "var(--chart-2)" },
          { name: "Today", percentage: Math.min(100, todayCount * 10), current: todayCount, allowed: 10, allowedLabel: "target", fill: "var(--chart-3)" },
          { name: "Revenue (this page)", percentage: Math.min(100, Math.round((totalVal / 50000) * 100)), current: `₹${totalVal.toLocaleString("en-IN")}`, allowed: "₹50K", allowedLabel: "target", fill: "var(--chart-4)" },
        ];
        return (<PharmacyStats title="Sales Analytics" subtitle="Dispensing records and new sales." searchTerm={search} onSearchChange={(v)=>{setSearch(v);setPage(1)}} searchPlaceholder="Search invoice # or patient..." action={<Button size="sm" className="h-9 shadow-sm" render={<Link href="/clinic/pharmacy/sales/new" />}>New Sale</Button>} items={stats} />);
      })()}
        </div>
      )}

      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-2 p-4 border-b border-border">
            <span className="text-sm font-medium">Sales <span className="text-muted-foreground">({total})</span></span>
            <Select value={statusFilter || "__all__"} onValueChange={(v) => { setStatusFilter((v === "__all__" ? "" : v) as "" | SaleStatus); setPage(1) }}>
              <SelectTrigger className="h-9 w-40 ml-auto"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent><SelectItem value="__all__">All statuses</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem><SelectItem value="refunded">Refunded</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Subtotal</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Tax</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={10}><div className="space-y-2 p-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10}><div className="py-16 text-center"><p className="text-sm text-muted-foreground">{search || statusFilter ? "No sales match your search or filters." : "No sales yet — record your first one to get started."}</p></div></TableCell></TableRow>
              ) : (
                filtered.map((s) => (
                  <TableRow key={s.saleId} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => openDetail(s)}>
                    <TableCell className="font-medium">{s.invoiceNumber}</TableCell>
                    <TableCell>{new Date(s.saleDate).toLocaleDateString()}</TableCell>
                    <TableCell>{s.patientId ? (s.patientName ?? s.patientId) : "Walk-in"}</TableCell>
                    <TableCell>{(s.items ?? []).length}</TableCell>
                    <TableCell className="tabular-nums">{fmtMoney(s.subtotal)}</TableCell>
                    <TableCell className="tabular-nums">{fmtMoney(s.discount)}</TableCell>
                    <TableCell className="tabular-nums">{fmtMoney(s.taxAmount)}</TableCell>
                    <TableCell className="tabular-nums font-medium">{fmtMoney(s.total)}</TableCell>
                    <TableCell className="capitalize">{s.paymentMethod}</TableCell>
                    <TableCell>{statusBadge(s.status)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
          {!loading && total > 0 && (
            <Pagination page={page} pageSize={pageSize} totalItems={total} onPageChange={setPage} itemLabel="sales" />
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sale {detail?.invoiceNumber}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Date:</span> {new Date(detail.saleDate).toLocaleString()}</div>
                <div><span className="text-muted-foreground">Patient:</span> {detail.patientId ? (detail.patientName ?? detail.patientId) : "Walk-in"}</div>
                <div><span className="text-muted-foreground">Payment:</span> <span className="capitalize">{detail.paymentMethod}</span></div>
                <div><span className="text-muted-foreground">Status:</span> {statusBadge(detail.status)}</div>
              </div>
              {detail.notes && (
                <div><span className="text-muted-foreground">Notes:</span> {detail.notes}</div>
              )}
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicine</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Disc</TableHead>
                      <TableHead>Tax%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.items.map((it: PharmacySaleItem, i) => (
                      <TableRow key={i}>
                        <TableCell>{medicineById.get(it.medicineId)?.name ?? it.medicineId}</TableCell>
                        <TableCell>{it.batchNumber ?? "—"}</TableCell>
                        <TableCell className="tabular-nums">{it.quantity}</TableCell>
                        <TableCell className="tabular-nums">{fmtMoney(it.unitPrice)}</TableCell>
                        <TableCell className="tabular-nums">{fmtMoney(it.discount)}</TableCell>
                        <TableCell className="tabular-nums">{it.taxPercent}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span className="tabular-nums">{fmtMoney(detail.subtotal)}</span></div>
                <div className="flex justify-between"><span>Discount</span><span className="tabular-nums">{fmtMoney(detail.discount)}</span></div>
                <div className="flex justify-between"><span>Tax</span><span className="tabular-nums">{fmtMoney(detail.taxAmount)}</span></div>
                <div className="flex justify-between font-medium"><span>Total</span><span className="tabular-nums">{fmtMoney(detail.total)}</span></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetail(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
