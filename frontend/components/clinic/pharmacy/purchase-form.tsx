"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  createPurchase,
  listMedicines,
  listSuppliers,
  type PharmacySupplier,
  type PharmacyMedicine,
  type PharmacyPurchaseItem,
} from "@/lib/clinic-api"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
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

export function PurchaseForm({ clinicId }: { clinicId: string }) {
  const router = useRouter()
  const [suppliers, setSuppliers] = React.useState<PharmacySupplier[]>([])
  const [medicines, setMedicines] = React.useState<PharmacyMedicine[]>([])
  const [form, setForm] = React.useState({
    supplierId: "",
    purchaseDate: new Date().toISOString().slice(0, 10),
    notes: "",
    items: [emptyItem()],
  })
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    Promise.all([listSuppliers(clinicId, { limit: 500 }), listMedicines(clinicId, { limit: 500 })])
      .then(([s, m]) => {
        setSuppliers(s.items)
        setMedicines(m.items)
      })
      .catch((e: unknown) => {
        toast.error(e instanceof Error ? e.message : "Failed to load reference data")
      })
  }, [clinicId])

  const updateItem = (idx: number, patch: Partial<NewItem>) =>
    setForm((f) => ({ ...f, items: f.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) }))
  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, emptyItem()] }))
  const removeItem = (idx: number) =>
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault()
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
      router.push("/clinic/pharmacy/purchases")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create purchase")
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="supplier">Supplier</Label>
              <Select value={form.supplierId} onValueChange={(v) => setForm((f) => ({ ...f, supplierId: v ?? "" }))}>
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
              <Input id="pdate" type="date" value={form.purchaseDate} onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pnotes">Notes</Label>
            <Textarea id="pnotes" placeholder="Optional notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
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
                        <Select value={it.medicineId} onValueChange={(v) => updateItem(idx, { medicineId: v ?? "" })}>
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
                        <Input value={it.batchNumber} onChange={(e) => updateItem(idx, { batchNumber: e.target.value })} placeholder="Batch" />
                      </TableCell>
                      <TableCell className="w-20">
                        <Input type="number" min={1} value={it.quantity} onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })} />
                      </TableCell>
                      <TableCell className="w-24">
                        <Input type="number" min={0} step="0.01" value={it.unitPrice} onChange={(e) => updateItem(idx, { unitPrice: Number(e.target.value) })} />
                      </TableCell>
                      <TableCell className="w-36">
                        <Input type="date" value={it.expiryDate ?? ""} onChange={(e) => updateItem(idx, { expiryDate: e.target.value || null })} />
                      </TableCell>
                      <TableCell className="w-36">
                        <Input type="date" value={it.manufacturingDate ?? ""} onChange={(e) => updateItem(idx, { manufacturingDate: e.target.value || null })} />
                      </TableCell>
                      <TableCell className="min-w-[150px]">
                        <Select value={it.supplierId ?? ""} onValueChange={(v) => updateItem(idx, { supplierId: v || null })}>
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
                        <Input value={it.storageLocation ?? ""} onChange={(e) => updateItem(idx, { storageLocation: e.target.value })} placeholder="Shelf" />
                      </TableCell>
                      <TableCell className="w-10">
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(idx)} disabled={form.items.length === 1}>
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => router.push("/clinic/pharmacy/purchases")}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Create Purchase"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
