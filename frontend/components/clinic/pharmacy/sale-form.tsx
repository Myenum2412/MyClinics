"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  createSale,
  listMedicines,
  type PharmacyMedicine,
} from "@/lib/clinic-api"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SectionCard } from "@/components/clinic/form-kit"

const fmtMoney = (n: number) =>
  `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n || 0)}`

interface SaleItemDraft {
  medicineId: string
  quantity: number
  discount: number
}

export function SaleForm({
  clinicId,
  onError,
}: {
  clinicId: string
  onError?: (msg: string | null) => void
}) {
  const router = useRouter()
  const [medicines, setMedicines] = React.useState<PharmacyMedicine[]>([])
  const [saleDate, setSaleDate] = React.useState(() => new Date().toISOString().slice(0, 10))
  const [patientId, setPatientId] = React.useState("")
  const [paymentMethod, setPaymentMethod] = React.useState("cash")
  const [notes, setNotes] = React.useState("")
  const [items, setItems] = React.useState<SaleItemDraft[]>([])
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    listMedicines(clinicId, { limit: 2000 })
      .then((m) => setMedicines(m.items))
      .catch((e: unknown) => {
        toast.error(e instanceof Error ? e.message : "Failed to load medicines")
      })
  }, [clinicId])

  const medicineById = React.useMemo(() => {
    const map = new Map<string, PharmacyMedicine>()
    for (const m of medicines) map.set(m.medicineId, m)
    return map
  }, [medicines])

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

  const addItem = () => setItems((prev) => [...prev, { medicineId: "", quantity: 1, discount: 0 }])
  const updateItem = (idx: number, patch: Partial<SaleItemDraft>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx))

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (items.length === 0) {
      toast.error("Add at least one item")
      return
    }
    if (items.some((it) => !it.medicineId || (it.quantity || 0) <= 0)) {
      toast.error("Each item needs a medicine and a positive quantity")
      return
    }
    setSubmitting(true)
    onError?.(null)
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
      router.push("/clinic/pharmacy/sales")
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create sale"
      onError?.(msg)
      toast.error(msg)
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <SectionCard title="Sale Details" description="Date, patient and payment method for this sale.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="saleDate">Sale Date</Label>
            <Input id="saleDate" type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="patientId">Patient ID (optional)</Label>
            <Input id="patientId" placeholder="Walk-in if blank" value={patientId} onChange={(e) => setPatientId(e.target.value)} />
          </div>
          <div className="space-y-2">
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
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Items" description="Medicines dispensed in this sale.">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Line items</p>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              Add Item
            </Button>
          </div>

          {items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
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
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it, idx) => {
                    const med = medicineById.get(it.medicineId)
                    const line = med ? med.sellingPrice * (it.quantity || 0) - (it.discount || 0) : 0
                    return (
                      <TableRow key={idx}>
                        <TableCell>
                          <Select value={it.medicineId} onValueChange={(v) => updateItem(idx, { medicineId: v ?? "" })}>
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
                          <Input type="number" min={1} value={it.quantity} onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })} className="h-8 w-20" />
                        </TableCell>
                        <TableCell>
                          <Input type="number" min={0} value={it.discount} onChange={(e) => updateItem(idx, { discount: Number(e.target.value) })} className="h-8 w-24" />
                        </TableCell>
                        <TableCell className="tabular-nums">{fmtMoney(line)}</TableCell>
                        <TableCell>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(idx)} aria-label="Remove item">
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

          {items.length > 0 && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span className="tabular-nums">{fmtMoney(computed.subtotal)}</span></div>
              <div className="flex justify-between"><span>Discount</span><span className="tabular-nums">{fmtMoney(computed.discount)}</span></div>
              <div className="flex justify-between"><span>Tax</span><span className="tabular-nums">{fmtMoney(computed.tax)}</span></div>
              <div className="flex justify-between font-medium"><span>Total (approx)</span><span className="tabular-nums">{fmtMoney(computed.total)}</span></div>
            </div>
          )}
        </div>
      </SectionCard>

      <div className="flex gap-3 border-t border-border pt-8">
        <Button type="button" variant="outline" onClick={() => router.push("/clinic/pharmacy/sales")} disabled={submitting} className="border-primary/30 text-primary hover:bg-accent">
          Cancel
        </Button>
        <div className="flex-1" />
        <Button type="submit" disabled={submitting} size="lg">
          {submitting ? "Saving…" : "Record Sale"}
        </Button>
      </div>
    </form>
  )
}
