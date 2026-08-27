"use client"

import * as React from "react"
import { useRequireRole } from "@/hooks/use-clinic-session"
import {
  listPurchases,
  getPurchase,
  createPurchase,
  receivePurchase,
  listSuppliers,
  listMedicines,
  type PharmacyPurchase,
  type PharmacySupplier,
  type PharmacyMedicine,
  type PharmacyPurchaseItem,
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
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { PlusIcon, EyeIcon, CheckIcon, TrashIcon } from "@heroicons/react/24/outline"

const fmtMoney = (n: number) =>
  `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n || 0)}`

type StatusFilter = "" | "draft" | "received" | "cancelled"

interface NewItem extends PharmacyPurchaseItem {}

function emptyItem(): NewItem {
  return {
    medicineId: "",
    batchNumber: "",
    quantity: 1,
    unitPrice: 0,
    expiryDate: null,
    manufacturingDate: null,
    supplierId: null,
    storageLocation: "",
  }
}

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

  const [newOpen, setNewOpen] = React.useState(false)
  const [detail, setDetail] = React.useState<PharmacyPurchase | null>(null)

  const [form, setForm] = React.useState({
    supplierId: "",
    purchaseDate: new Date().toISOString().slice(0, 10),
    notes: "",
    items: [emptyItem()],
  })
  const [submitting, setSubmitting] = React.useState(false)

  const supplierName = React.useCallback(
    (id: string | null) =>
      suppliers.find((s) => s.supplierId === id)?.name ?? "—",
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
    } catch (e) {
      toast.error("Failed to load purchases")
    } finally {
      setLoading(false)
    }
  }, [clinicId])

  React.useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const filtered = purchases.filter((p) => {
    if (statusFilter && p.status !== statusFilter) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      const hay = `${p.invoiceNumber} ${supplierName(p.supplierId)}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  function updateItem(idx: number, patch: Partial<NewItem>) {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    }))
  }

  function addItem() {
    setForm((f) => ({ ...f, items: [...f.items, emptyItem()] }))
  }

  function removeItem(idx: number) {
    setForm((f) => ({
      ...f,
      items: f.items.filter((_, i) => i !== idx),
    }))
  }

  function resetForm() {
    setForm({
      supplierId: "",
      purchaseDate: new Date().toISOString().slice(0, 10),
      notes: "",
      items: [emptyItem()],
    })
  }

  async function submitNew() {
    if (!form.supplierId) {
      toast.error("Select a supplier")
      return
    }
    if (form.items.some((i) => !i.medicineId || i.quantity <= 0)) {
      toast.error("Each item needs a medicine and a positive quantity")
      return
    }
    setSubmitting(true)
    try {
      const items = form.items.map((i) => ({
        medicineId: i.medicineId,
        batchNumber: i.batchNumber,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        expiryDate: i.expiryDate || null,
        manufacturingDate: i.manufacturingDate || null,
        supplierId: i.supplierId || null,
        storageLocation: i.storageLocation || null,
      }))
      await createPurchase(clinicId, {
        supplierId: form.supplierId,
        purchaseDate: form.purchaseDate,
        notes: form.notes || null,
        items,
      })
      toast.success("Purchase created")
      setNewOpen(false)
      resetForm()
      fetchAll()
    } catch (e) {
      toast.error("Failed to create purchase")
    } finally {
      setSubmitting(false)
    }
  }

  async function openDetail(p: PharmacyPurchase) {
    try {
      const full = await getPurchase(clinicId, p.purchaseId)
      setDetail(full)
    } catch (e) {
      toast.error("Failed to load details")
    }
  }

  async function handleReceive(p: PharmacyPurchase) {
    try {
      await receivePurchase(clinicId, p.purchaseId, p.notes)
      toast.success("Purchase received")
      setDetail(null)
      fetchAll()
    } catch (e) {
      toast.error("Failed to receive purchase")
    }
  }

  if (!session) return null

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Purchases</h1>
          <p className="text-sm text-muted-foreground">
            Goods receipts and supplier purchase orders
          </p>
        </div>
        <Dialog open={newOpen} onOpenChange={setNewOpen}>
          <DialogTrigger
            render={
              <Button>
                <PlusIcon />
                New Purchase
              </Button>
            }
          />
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>New Purchase</DialogTitle>
              <DialogDescription>
                Record a supplier purchase and its line items.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="supplier">Supplier</Label>
                  <Select
                    value={form.supplierId}
                    onValueChange={(v) => setForm((f) => ({ ...f, supplierId: v ?? "" }))}
                  >
                    <SelectTrigger id="supplier">
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
                <div className="space-y-1.5">
                  <Label htmlFor="pdate">Purchase Date</Label>
                  <Input
                    id="pdate"
                    type="date"
                    value={form.purchaseDate}
                    onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pnotes">Notes</Label>
                <Textarea
                  id="pnotes"
                  placeholder="Optional notes"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Items</Label>
                  <Button variant="outline" size="sm" onClick={addItem}>
                    <PlusIcon />
                    Add Row
                  </Button>
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
                        <TableHead>Mfg</TableHead>
                        <TableHead>Line Supplier</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {form.items.map((it, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="min-w-[180px]">
                            <Select
                              value={it.medicineId}
                              onValueChange={(v) => updateItem(idx, { medicineId: v ?? "" })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Medicine" />
                              </SelectTrigger>
                              <SelectContent>
                                {medicines.map((m) => (
                                  <SelectItem key={m.medicineId} value={m.medicineId}>
                                    {m.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              value={it.batchNumber}
                              onChange={(e) => updateItem(idx, { batchNumber: e.target.value })}
                              placeholder="Batch"
                            />
                          </TableCell>
                          <TableCell className="w-20">
                            <Input
                              type="number"
                              min={1}
                              value={it.quantity}
                              onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                            />
                          </TableCell>
                          <TableCell className="w-24">
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              value={it.unitPrice}
                              onChange={(e) => updateItem(idx, { unitPrice: Number(e.target.value) })}
                            />
                          </TableCell>
                          <TableCell className="w-36">
                            <Input
                              type="date"
                              value={it.expiryDate ?? ""}
                              onChange={(e) => updateItem(idx, { expiryDate: e.target.value || null })}
                            />
                          </TableCell>
                          <TableCell className="w-36">
                            <Input
                              type="date"
                              value={it.manufacturingDate ?? ""}
                              onChange={(e) => updateItem(idx, { manufacturingDate: e.target.value || null })}
                            />
                          </TableCell>
                          <TableCell className="min-w-[150px]">
                            <Select
                              value={it.supplierId ?? ""}
                              onValueChange={(v) => updateItem(idx, { supplierId: v || null })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Optional" />
                              </SelectTrigger>
                              <SelectContent>
                                {suppliers.map((s) => (
                                  <SelectItem key={s.supplierId} value={s.supplierId}>
                                    {s.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="w-32">
                              <Input
                                value={it.storageLocation ?? ""}
                                onChange={(e) => updateItem(idx, { storageLocation: e.target.value })}
                                placeholder="Shelf"
                              />
                          </TableCell>
                          <TableCell className="w-10">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => removeItem(idx)}
                              disabled={form.items.length === 1}
                            >
                              <TrashIcon />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setNewOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitNew} disabled={submitting}>
                {submitting ? "Saving..." : "Create Purchase"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center gap-3">
          <CardTitle className="text-base">Purchase Orders</CardTitle>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice / supplier"
              className="h-8 w-44"
            />
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter((v as StatusFilter) ?? "")}
            >
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDetail(p)}
                          >
                            <EyeIcon />
                            View
                          </Button>
                          {p.status === "draft" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReceive(p)}
                            >
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
              {detail?.purchaseDate
                ? ` · ${new Date(detail.purchaseDate).toLocaleDateString()}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {detail && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <StatusBadge status={detail.status} />
                <span className="text-muted-foreground">
                  Items: {detail.items.length}
                </span>
                <span className="ml-auto font-medium tabular-nums">
                  {fmtMoney(detail.total)}
                </span>
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
                          {medicines.find((m) => m.medicineId === it.medicineId)?.name ??
                            it.medicineId}
                        </TableCell>
                        <TableCell>{it.batchNumber}</TableCell>
                        <TableCell className="tabular-nums">{it.quantity}</TableCell>
                        <TableCell className="tabular-nums">{fmtMoney(it.unitPrice)}</TableCell>
                        <TableCell>
                          {it.expiryDate
                            ? new Date(it.expiryDate).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell>{it.storageLocation ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {detail.notes && (
                <p className="text-sm text-muted-foreground">
                  Notes: {detail.notes}
                </p>
              )}
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
