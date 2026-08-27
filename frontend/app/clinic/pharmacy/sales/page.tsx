"use client"

import * as React from "react"
import { useRequireRole } from "@/hooks/use-clinic-session"
import {
  listSales,
  getSale,
  createSale,
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"

const fmtMoney = (n: number) =>
  `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n || 0)}`

type SaleStatus = "completed" | "cancelled" | "refunded"

interface SaleItemDraft {
  medicineId: string
  quantity: number
  discount: number
}

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

  const [newOpen, setNewOpen] = React.useState(false)
  const [detail, setDetail] = React.useState<PharmacySale | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const [saleDate, setSaleDate] = React.useState(() => new Date().toISOString().slice(0, 10))
  const [patientId, setPatientId] = React.useState("")
  const [paymentMethod, setPaymentMethod] = React.useState("cash")
  const [notes, setNotes] = React.useState("")
  const [items, setItems] = React.useState<SaleItemDraft[]>([])

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

  if (!session) return null

  const medicineById = React.useMemo(() => {
    const map = new Map<string, PharmacyMedicine>()
    for (const m of medicines) map.set(m.medicineId, m)
    return map
  }, [medicines])

  const filtered = sales.filter((s) => {
    if (statusFilter && s.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const hay = `${s.invoiceNumber} ${s.patientId ?? ""}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  const computed = React.useMemo(() => {
    let subtotal = 0
    let discount = 0
    let tax = 0
    for (const it of items) {
      const med = medicineById.get(it.medicineId)
      if (!med) continue
      const line = med.sellingPrice * (it.quantity || 0)
      const d = it.discount || 0
      subtotal += line
      discount += d
      tax += ((line - d) * med.taxPercent) / 100
    }
    const total = subtotal - discount + tax
    return { subtotal, discount, tax, total }
  }, [items, medicineById])

  function resetForm() {
    setSaleDate(new Date().toISOString().slice(0, 10))
    setPatientId("")
    setPaymentMethod("cash")
    setNotes("")
    setItems([])
  }

  function addItem() {
    setItems((prev) => [...prev, { medicineId: "", quantity: 1, discount: 0 }])
  }

  function updateItem(idx: number, patch: Partial<SaleItemDraft>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  async function submitSale() {
    if (!clinicId) return
    if (items.length === 0) {
      toast.error("Add at least one item")
      return
    }
    if (items.some((it) => !it.medicineId || (it.quantity || 0) <= 0)) {
      toast.error("Each item needs a medicine and a positive quantity")
      return
    }
    setSubmitting(true)
    try {
      await createSale(clinicId, {
        saleDate,
        patientId: patientId || null,
        paymentMethod,
        notes: notes || null,
        items: items.map((it) => ({
          medicineId: it.medicineId,
          quantity: Number(it.quantity),
          discount: Number(it.discount) || 0,
        })),
      })
      toast.success("Sale recorded")
      setNewOpen(false)
      resetForm()
      await reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create sale")
    } finally {
      setSubmitting(false)
    }
  }

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
        <Button onClick={() => { resetForm(); setNewOpen(true) }}>New Sale</Button>
      </div>

      <Card>
        <CardHeader className="flex-row items-center gap-3">
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
        <CardContent>
          <Table>
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

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>New Sale</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="saleDate">Sale Date</Label>
                <Input id="saleDate" type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="patientId">Patient ID (optional)</Label>
                <Input
                  id="patientId"
                  placeholder="Walk-in if blank"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v ?? "cash")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="credit">Credit</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  Add Item
                </Button>
              </div>

              {items.length === 0 ? (
                <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                  No items added yet.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Medicine</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Disc (₹)</TableHead>
                        <TableHead>Line</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((it, idx) => {
                        const med = medicineById.get(it.medicineId)
                        const line = med ? med.sellingPrice * (it.quantity || 0) - (it.discount || 0) : 0
                        return (
                          <TableRow key={idx}>
                            <TableCell>
                              <Select
                                value={it.medicineId}
                                onValueChange={(v) => updateItem(idx, { medicineId: v ?? "" })}
                              >
                                <SelectTrigger className="h-8 w-56">
                                  <SelectValue placeholder="Select medicine" />
                                </SelectTrigger>
                                <SelectContent>
                                  {medicines.map((m) => (
                                    <SelectItem key={m.medicineId} value={m.medicineId}>
                                      {m.name}
                                      {m.strength ? ` ${m.strength}` : ""}
                                      {m.brand ? ` · ${m.brand}` : ""}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {med && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {fmtMoney(med.sellingPrice)} · tax {med.taxPercent}%
                                </p>
                              )}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={1}
                                value={it.quantity}
                                onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                                className="h-8 w-20"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                value={it.discount}
                                onChange={(e) => updateItem(idx, { discount: Number(e.target.value) })}
                                className="h-8 w-24"
                              />
                            </TableCell>
                            <TableCell className="tabular-nums">{fmtMoney(line)}</TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => removeItem(idx)}
                                aria-label="Remove item"
                              >
                                ✕
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span className="tabular-nums">{fmtMoney(computed.subtotal)}</span></div>
                <div className="flex justify-between"><span>Discount</span><span className="tabular-nums">{fmtMoney(computed.discount)}</span></div>
                <div className="flex justify-between"><span>Tax</span><span className="tabular-nums">{fmtMoney(computed.tax)}</span></div>
                <div className="flex justify-between font-medium"><span>Total (approx)</span><span className="tabular-nums">{fmtMoney(computed.total)}</span></div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button onClick={submitSale} disabled={submitting}>
              {submitting ? "Saving…" : "Record Sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
