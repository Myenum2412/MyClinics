"use client"

import * as React from "react"
import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useRequireRole } from "@/hooks/use-clinic-session"
import {
  listInventory,
  addOpeningStock,
  writeOffStock,
  listMedicines,
  listSuppliers,
  type PharmacyInventory,
  type PharmacyMedicine,
  type PharmacySupplier,
  type PharmacyPurchaseItem,
} from "@/lib/clinic-api"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

const WRITE_OFF_REASONS = [
  { value: "damaged", label: "Damaged" },
  { value: "wastage", label: "Wastage" },
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

type StockItem = {
  medicineId: string
  batchNumber: string
  quantity: string
  unitPrice: string
  expiryDate: string
  manufacturingDate: string
  supplierId: string
  storageLocation: string
}

function emptyStockItem(): StockItem {
  return {
    medicineId: "",
    batchNumber: "",
    quantity: "",
    unitPrice: "",
    expiryDate: "",
    manufacturingDate: "",
    supplierId: "",
    storageLocation: "",
  }
}

function InventoryInner({
  clinicId,
}: {
  clinicId: string
}) {
  const router = useRouter()
  const params = useSearchParams()
  const initialStatus = params.get("status") ?? ""

  const [rows, setRows] = React.useState<PharmacyInventory[]>([])
  const [medicines, setMedicines] = React.useState<PharmacyMedicine[]>([])
  const [suppliers, setSuppliers] = React.useState<PharmacySupplier[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [status, setStatus] = React.useState(initialStatus)
  const [category, setCategory] = React.useState("")

  const [detail, setDetail] = React.useState<PharmacyInventory | null>(null)
  const [openingOpen, setOpeningOpen] = React.useState(false)
  const [writeOffOpen, setWriteOffOpen] = React.useState(false)
  const [stockItems, setStockItems] = React.useState<StockItem[]>([emptyStockItem()])
  const [openingNotes, setOpeningNotes] = React.useState("")
  const [openingSaving, setOpeningSaving] = React.useState(false)
  const [writeOff, setWriteOff] = React.useState({
    inventoryId: "",
    quantity: "",
    reason: "damaged" as "damaged" | "wastage" | "expired",
    notes: "",
  })
  const [writeOffSaving, setWriteOffSaving] = React.useState(false)

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
      .then((res) => setRows(res.items))
      .catch((e: unknown) => {
        toast.error(e instanceof Error ? e.message : "Failed to load inventory")
      })
      .finally(() => setLoading(false))
  }, [clinicId, search, status, category])

  React.useEffect(() => {
    if (!clinicId) return
    let active = true
    Promise.all([
      listMedicines(clinicId, { limit: 500 }),
      listSuppliers(clinicId, { limit: 500 }),
    ])
      .then(([m, s]) => {
        if (!active) return
        setMedicines(m.items)
        setSuppliers(s.items)
      })
      .catch((e: unknown) => {
        toast.error(e instanceof Error ? e.message : "Failed to load reference data")
      })
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

  const openDetail = (inv: PharmacyInventory) => {
    setDetail(inv)
  }

  const quickWriteOff = (inv: PharmacyInventory) => {
    setDetail(null)
    setWriteOff({
      inventoryId: inv.inventoryId,
      quantity: "",
      reason: "damaged",
      notes: "",
    })
    setWriteOffOpen(true)
  }

  const updateStockItem = (idx: number, patch: Partial<StockItem>) => {
    setStockItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, ...patch } : it))
    )
  }

  const submitOpening = () => {
    if (!clinicId) return
    const valid = stockItems.filter((it) => it.medicineId && it.batchNumber && Number(it.quantity) > 0)
    if (valid.length === 0) {
      toast.error("Add at least one item with a medicine, batch and quantity")
      return
    }
    const items: PharmacyPurchaseItem[] = valid.map((it) => ({
      medicineId: it.medicineId,
      batchNumber: it.batchNumber,
      quantity: Number(it.quantity),
      unitPrice: Number(it.unitPrice) || 0,
      expiryDate: it.expiryDate ? it.expiryDate : null,
      manufacturingDate: it.manufacturingDate ? it.manufacturingDate : null,
      supplierId: it.supplierId ? it.supplierId : null,
      storageLocation: it.storageLocation ? it.storageLocation : null,
    }))
    setOpeningSaving(true)
    addOpeningStock(clinicId, items, openingNotes || null)
      .then((res) => {
        toast.success(`Added ${res.created} stock line(s)`)
        setOpeningOpen(false)
        setStockItems([emptyStockItem()])
        setOpeningNotes("")
        fetchInventory()
      })
      .catch((e: unknown) => {
        toast.error(e instanceof Error ? e.message : "Failed to add opening stock")
      })
      .finally(() => setOpeningSaving(false))
  }

  const submitWriteOff = () => {
    if (!clinicId) return
    if (!writeOff.inventoryId) {
      toast.error("Select an inventory batch")
      return
    }
    if (Number(writeOff.quantity) <= 0) {
      toast.error("Enter a quantity greater than zero")
      return
    }
    setWriteOffSaving(true)
    writeOffStock(clinicId, {
      inventoryId: writeOff.inventoryId,
      quantity: Number(writeOff.quantity),
      reason: writeOff.reason,
      notes: writeOff.notes || null,
    })
      .then(() => {
        toast.success("Stock written off")
        setWriteOffOpen(false)
        setWriteOff({ inventoryId: "", quantity: "", reason: "damaged", notes: "" })
        fetchInventory()
      })
      .catch((e: unknown) => {
        toast.error(e instanceof Error ? e.message : "Failed to write off stock")
      })
      .finally(() => setWriteOffSaving(false))
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
          <p className="text-sm text-muted-foreground">Track stock batches, levels and expiries</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setWriteOffOpen(true)}>
            Write Off
          </Button>
          <Button onClick={() => setOpeningOpen(true)}>Add Opening Stock</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="gap-3">
          <CardTitle className="text-base">Stock</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Search medicine"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 min-w-48 flex-1"
            />
            <Input
              placeholder="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-9 w-44"
            />
            <Select value={status} onValueChange={(v) => onStatusChange(v ?? "")}>
              <SelectTrigger className="h-9 w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
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
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={9}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    No inventory found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((inv) => (
                  <TableRow
                    key={inv.inventoryId}
                    onClick={() => openDetail(inv)}
                    className="cursor-pointer"
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
        </CardContent>
      </Card>

      {/* Add Opening Stock */}
      <Dialog open={openingOpen} onOpenChange={setOpeningOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Opening Stock</DialogTitle>
            <DialogDescription>Record new stock batches received into inventory.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {stockItems.map((it, idx) => (
              <div key={idx} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Item {idx + 1}</p>
                  {stockItems.length > 1 && (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setStockItems((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Medicine</Label>
                    <Select
                      value={it.medicineId}
                      onValueChange={(v) => updateStockItem(idx, { medicineId: v ?? "" })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select medicine" />
                      </SelectTrigger>
                      <SelectContent>
                        {medicines.map((m) => (
                          <SelectItem key={m.medicineId} value={m.medicineId}>
                            {m.name}
                            {m.genericName ? ` (${m.genericName})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Batch</Label>
                    <Input
                      value={it.batchNumber}
                      onChange={(e) => updateStockItem(idx, { batchNumber: e.target.value })}
                      placeholder="Batch no."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min={0}
                      value={it.quantity}
                      onChange={(e) => updateStockItem(idx, { quantity: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Unit Price</Label>
                    <Input
                      type="number"
                      min={0}
                      value={it.unitPrice}
                      onChange={(e) => updateStockItem(idx, { unitPrice: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Expiry Date</Label>
                    <Input
                      type="date"
                      value={it.expiryDate}
                      onChange={(e) => updateStockItem(idx, { expiryDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Manufacturing Date</Label>
                    <Input
                      type="date"
                      value={it.manufacturingDate}
                      onChange={(e) => updateStockItem(idx, { manufacturingDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Supplier</Label>
                    <Select
                      value={it.supplierId}
                      onValueChange={(v) => updateStockItem(idx, { supplierId: v ?? "" })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((s) => (
                          <SelectItem key={s.supplierId} value={s.supplierId}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Storage Location</Label>
                    <Input
                      value={it.storageLocation}
                      onChange={(e) => updateStockItem(idx, { storageLocation: e.target.value })}
                      placeholder="e.g. Shelf A"
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setStockItems((prev) => [...prev, emptyStockItem()])}>
              + Add row
            </Button>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Input value={openingNotes} onChange={(e) => setOpeningNotes(e.target.value)} placeholder="Optional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpeningOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitOpening} disabled={openingSaving}>
              {openingSaving ? "Saving…" : "Save Stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Write Off */}
      <Dialog open={writeOffOpen} onOpenChange={setWriteOffOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Write Off Stock</DialogTitle>
            <DialogDescription>Reduce damaged, wasted or expired stock.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Inventory Batch</Label>
              <Select
                value={writeOff.inventoryId}
                onValueChange={(v) => setWriteOff((p) => ({ ...p, inventoryId: v ?? "" }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  {rows.map((inv) => (
                    <SelectItem key={inv.inventoryId} value={inv.inventoryId}>
                      {inv.name} · {inv.batchNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Quantity</Label>
              <Input
                type="number"
                min={0}
                value={writeOff.quantity}
                onChange={(e) => setWriteOff((p) => ({ ...p, quantity: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div className="space-y-1">
              <Label>Reason</Label>
              <Select
                value={writeOff.reason}
                onValueChange={(v) => setWriteOff((p) => ({ ...p, reason: (v as typeof writeOff.reason) ?? "damaged" }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WRITE_OFF_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Input
                value={writeOff.notes}
                onChange={(e) => setWriteOff((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Optional notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWriteOffOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={submitWriteOff} disabled={writeOffSaving}>
              {writeOffSaving ? "Saving…" : "Write Off"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detail?.name}</DialogTitle>
            <DialogDescription>{detail?.genericName ?? "Inventory detail"}</DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
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
              <Button variant="destructive" onClick={() => quickWriteOff(detail)}>
                Write Off
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
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
