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
import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts"
import { ChartContainer } from "@/components/ui/chart"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { EyeIcon, CheckIcon } from "@heroicons/react/24/outline"

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
  const [suppliers, setSuppliers] = React.useState<PharmacySupplier[]>([])
  const [medicines, setMedicines] = React.useState<PharmacyMedicine[]>([])
  const [loading, setLoading] = React.useState(true)
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("")
  const [search, setSearch] = React.useState("")
  const [detail, setDetail] = React.useState<PharmacyPurchase | null>(null)

  const supplierName = React.useCallback(
    (id: string | null) => suppliers.find((s) => s.supplierId === id)?.name ?? "—",
    [suppliers]
  )

  const fetchAll = React.useCallback(async () => {
    if (!clinicId) return
    setLoading(true)
    try {
      const [p, s, m] = await Promise.all([
        listPurchases(clinicId, { limit: 500 }),
        listSuppliers(clinicId, { limit: 500 }),
        listMedicines(clinicId, { limit: 500 }),
      ])
      setPurchases(p.items)
      setSuppliers(s.items)
      setMedicines(m.items)
    } catch {
      toast.error("Failed to load purchases")
    } finally {
      setLoading(false)
    }
  }, [clinicId])

  React.useEffect(() => {
    fetchAll()
  }, [fetchAll])

  if (!session) return null

  const filtered = purchases.filter((p) => {
    if (statusFilter && p.status !== statusFilter) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      const hay = `${p.invoiceNumber} ${supplierName(p.supplierId)}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

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
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Purchases</h1>
          <p className="text-sm text-muted-foreground">Goods receipts and supplier purchase orders</p>
        </div>
      {(() => {
        const total=purchases.length;const rec=purchases.filter(x=>x.status==="received").length;const draft=purchases.filter(x=>x.status==="draft").length;const canc=purchases.filter(x=>x.status==="cancelled").length;
        const s=[{name:"Total",percentage:Math.min(100,total),current:total,allowed:100,allowedLabel:"orders",fill:"var(--chart-1)"},{name:"Received",percentage:total?Math.round(rec/total*100):0,current:rec,allowed:total,allowedLabel:"total",fill:"var(--chart-2)"},{name:"Draft",percentage:total?Math.round(draft/total*100):0,current:draft,allowed:total,allowedLabel:"total",fill:"var(--chart-3)"},{name:"Cancelled",percentage:total?Math.round(canc/total*100):0,current:canc,allowed:total,allowedLabel:"total",fill:"var(--chart-4)"}];
        return (<Card className="p-4"><div className="flex flex-wrap items-center justify-between gap-2 mb-4"><h2 className="font-semibold text-sm">Purchases Overview</h2><Button render={<Link href="/clinic/pharmacy/purchases/new" />}>New Purchase</Button></div><dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">{s.map(item=>(<Card className="p-4 shadow-sm bg-card" key={item.name}><CardContent className="flex items-center space-x-4 p-0"><div className="relative flex items-center justify-center"><ChartContainer className="h-[80px] w-[80px]" config={{capacity:{label:item.name,color:item.fill}}}><RadialBarChart barSize={6} data={[{name:item.name,capacity:item.percentage}]} endAngle={-270} innerRadius={30} outerRadius={60} startAngle={90}><PolarAngleAxis angleAxisId={0} axisLine={false} domain={[0,100]} tick={false} type="number" /><RadialBar angleAxisId={0} background cornerRadius={10} dataKey="capacity" fill={item.fill} /></RadialBarChart></ChartContainer><div className="absolute inset-0 flex items-center justify-center"><span className="font-semibold text-xs">{item.percentage}%</span></div></div><div><dt className="font-semibold text-sm leading-none mb-1">{item.name}</dt><dd className="text-muted-foreground text-xs">{String(item.current)} of {String(item.allowed)} {item.allowedLabel}</dd></div></CardContent></Card>))}</dl></Card>)
      })()}
        <Button render={<Link href="/clinic/pharmacy/purchases/new" />}>
          New Purchase
        </Button>
      </div>

      <Card className="rounded-xl border border-border bg-card shadow-sm">
        <CardHeader className="flex-row flex-wrap items-center gap-3">
          <CardTitle className="text-base">Purchase Orders</CardTitle>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice / supplier"
              className="h-8 w-44"
            />
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter((v as StatusFilter) ?? "")}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
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
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No purchases found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p) => (
                    <TableRow key={p.purchaseId}>
                      <TableCell className="font-medium">{p.invoiceNumber}</TableCell>
                      <TableCell>{supplierName(p.supplierId)}</TableCell>
                      <TableCell>
                        {p.purchaseDate ? new Date(p.purchaseDate).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>{p.items.length}</TableCell>
                      <TableCell className="tabular-nums">{fmtMoney(p.total)}</TableCell>
                      <TableCell>
                        <StatusBadge status={p.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button variant="ghost" size="sm" onClick={() => openDetail(p)}>
                            <EyeIcon />
                            View
                          </Button>
                          {p.status === "draft" && (
                            <Button variant="outline" size="sm" onClick={() => handleReceive(p)}>
                              <CheckIcon />
                              Receive
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{detail?.invoiceNumber}</DialogTitle>
            <DialogDescription>
              {detail ? supplierName(detail.supplierId) : ""}
              {detail?.purchaseDate ? ` · ${new Date(detail.purchaseDate).toLocaleDateString()}` : ""}
            </DialogDescription>
          </DialogHeader>

          {detail && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <StatusBadge status={detail.status} />
                <span className="text-muted-foreground">Items: {detail.items.length}</span>
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
