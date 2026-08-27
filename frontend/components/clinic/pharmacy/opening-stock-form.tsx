"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  addOpeningStock,
  listMedicines,
  listSuppliers,
  type PharmacyMedicine,
  type PharmacySupplier,
  type PharmacyPurchaseItem,
} from "@/lib/clinic-api"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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

export function OpeningStockForm({ clinicId }: { clinicId: string }) {
  const router = useRouter()
  const [medicines, setMedicines] = React.useState<PharmacyMedicine[]>([])
  const [suppliers, setSuppliers] = React.useState<PharmacySupplier[]>([])
  const [items, setItems] = React.useState<StockItem[]>([emptyStockItem()])
  const [notes, setNotes] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    Promise.all([listMedicines(clinicId, { limit: 500 }), listSuppliers(clinicId, { limit: 500 })])
      .then(([m, s]) => {
        setMedicines(m.items)
        setSuppliers(s.items)
      })
      .catch((e: unknown) => {
        toast.error(e instanceof Error ? e.message : "Failed to load reference data")
      })
  }, [clinicId])

  const updateItem = (idx: number, patch: Partial<StockItem>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    const valid = items.filter((it) => it.medicineId && it.batchNumber && Number(it.quantity) > 0)
    if (valid.length === 0) {
      toast.error("Add at least one item with a medicine, batch and quantity")
      return
    }
    const payload: PharmacyPurchaseItem[] = valid.map((it) => ({
      medicineId: it.medicineId,
      batchNumber: it.batchNumber,
      quantity: Number(it.quantity),
      unitPrice: Number(it.unitPrice) || 0,
      expiryDate: it.expiryDate ? it.expiryDate : null,
      manufacturingDate: it.manufacturingDate ? it.manufacturingDate : null,
      supplierId: it.supplierId ? it.supplierId : null,
      storageLocation: it.storageLocation ? it.storageLocation : null,
    }))
    setSaving(true)
    addOpeningStock(clinicId, payload, notes || null)
      .then((res) => {
        toast.success(`Added ${res.created} stock line(s)`)
        router.push("/clinic/pharmacy/inventory")
      })
      .catch((e: unknown) => {
        toast.error(e instanceof Error ? e.message : "Failed to add opening stock")
        setSaving(false)
      })
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <form onSubmit={submit} className="space-y-3">
          {items.map((it, idx) => (
            <div key={idx} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Item {idx + 1}</p>
                {items.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}>
                    Remove
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Medicine</Label>
                  <Select value={it.medicineId} onValueChange={(v) => updateItem(idx, { medicineId: v ?? "" })}>
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
                  <Input value={it.batchNumber} onChange={(e) => updateItem(idx, { batchNumber: e.target.value })} placeholder="Batch no." />
                </div>
                <div className="space-y-1">
                  <Label>Quantity</Label>
                  <Input type="number" min={0} value={it.quantity} onChange={(e) => updateItem(idx, { quantity: e.target.value })} placeholder="0" />
                </div>
                <div className="space-y-1">
                  <Label>Unit Price</Label>
                  <Input type="number" min={0} step="0.01" value={it.unitPrice} onChange={(e) => updateItem(idx, { unitPrice: e.target.value })} placeholder="0.00" />
                </div>
                <div className="space-y-1">
                  <Label>Expiry Date</Label>
                  <Input type="date" value={it.expiryDate} onChange={(e) => updateItem(idx, { expiryDate: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Manufacturing Date</Label>
                  <Input type="date" value={it.manufacturingDate} onChange={(e) => updateItem(idx, { manufacturingDate: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Supplier</Label>
                  <Select value={it.supplierId} onValueChange={(v) => updateItem(idx, { supplierId: v ?? "" })}>
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
                  <Input value={it.storageLocation} onChange={(e) => updateItem(idx, { storageLocation: e.target.value })} placeholder="e.g. Shelf A" />
                </div>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setItems((prev) => [...prev, emptyStockItem()])}>
            + Add row
          </Button>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => router.push("/clinic/pharmacy/inventory")}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save Stock"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
