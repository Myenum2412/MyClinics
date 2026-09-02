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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
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
  const [medicines, setMedicines] = React.useState<PharmacyMedicine[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<"" | SaleStatus>("")
  const [detail, setDetail] = React.useState<PharmacySale | null>(null)

  const reload = React.useCallback(async () => {
    if (!clinicId) return
    setLoading(true)
    try {
      const [s, m] = await Promise.all([
        listSales(clinicId, { limit: 500 }),
        listMedicines(clinicId, { limit: 2000 }),
      ])
      setSales(s.items)
      setMedicines(m.items)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load sales")
    } finally {
      setLoading(false)
    }
  }, [clinicId])

  React.useEffect(() => {
    if (!clinicId) return
    void reload()
  }, [clinicId, reload])

  const medicineById = React.useMemo(() => {
    const map = new Map<string, PharmacyMedicine>()
    for (const m of medicines) map.set(m.medicineId, m)
    return map
  }, [medicines])

  if (!session) return null

  const filtered = sales.filter((s) => {
    if (statusFilter && s.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const hay = `${s.invoiceNumber} ${s.patientId ?? ""}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  async function openDetail(s: PharmacySale) {
    try {
      const full = await getSale(clinicId, s.saleId)
      setDetail(full)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load sale")
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pharmacy Sales</h1>
          <p className="text-sm text-muted-foreground">Dispensing records and new sales</p>
        </div>
        <Button render={<Link href="/clinic/pharmacy/sales/new" />}>New Sale</Button>
      </div>

      <Card className="rounded-xl border border-border bg-card shadow-sm">
        <CardHeader className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search invoice # or patient"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 min-w-48 flex-1"
          />
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter((v as "" | SaleStatus) ?? "")}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
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
                <TableRow>
                  <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                    Loading sales…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                    No sales found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => (
                  <TableRow
                    key={s.saleId}
                    className="cursor-pointer"
                    onClick={() => openDetail(s)}
                  >
                    <TableCell className="font-medium">{s.invoiceNumber}</TableCell>
                    <TableCell>{new Date(s.saleDate).toLocaleDateString()}</TableCell>
                    <TableCell>{s.patientId ?? "Walk-in"}</TableCell>
                    <TableCell>{s.items.length}</TableCell>
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
                <div><span className="text-muted-foreground">Patient:</span> {detail.patientId ?? "Walk-in"}</div>
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
