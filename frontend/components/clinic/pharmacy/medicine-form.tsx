"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  getMedicine,
  createMedicine,
  updateMedicine,
  listSuppliers,
  type PharmacySupplier,
} from "@/lib/clinic-api"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const str = (v: string) => (v.trim() === "" ? null : v.trim())
const num = (v: string) => (v.trim() === "" ? 0 : Number(v))

type FormState = {
  name: string
  genericName: string
  brand: string
  category: string
  dosageForm: string
  strength: string
  unit: string
  manufacturer: string
  hsnCode: string
  barcode: string
  batchNumber: string
  prescriptionRequired: boolean
  reorderLevel: string
  minStockLevel: string
  maxStockLevel: string
  purchasePrice: string
  sellingPrice: string
  taxPercent: string
  discount: string
  supplierId: string
  manufacturingDate: string
  expiryDate: string
  storageConditions: string
  status: "active" | "inactive"
}

const emptyForm: FormState = {
  name: "",
  genericName: "",
  brand: "",
  category: "",
  dosageForm: "",
  strength: "",
  unit: "",
  manufacturer: "",
  hsnCode: "",
  barcode: "",
  batchNumber: "",
  prescriptionRequired: false,
  reorderLevel: "",
  minStockLevel: "",
  maxStockLevel: "",
  purchasePrice: "",
  sellingPrice: "",
  taxPercent: "",
  discount: "",
  supplierId: "",
  manufacturingDate: "",
  expiryDate: "",
  storageConditions: "",
  status: "active",
}

export function MedicineForm({ clinicId, id }: { clinicId: string; id?: string }) {
  const router = useRouter()
  const [suppliers, setSuppliers] = React.useState<PharmacySupplier[]>([])
  const [form, setForm] = React.useState<FormState>(emptyForm)
  const [saving, setSaving] = React.useState(false)
  const [loading, setLoading] = React.useState(Boolean(id))

  React.useEffect(() => {
    listSuppliers(clinicId, { limit: 500 })
      .then((s) => setSuppliers(s.items))
      .catch(() => {})
    if (id) {
      setLoading(true)
      getMedicine(clinicId, id)
        .then((full) => {
          setForm({
            name: full.name,
            genericName: full.genericName ?? "",
            brand: full.brand ?? "",
            category: full.category ?? "",
            dosageForm: full.dosageForm ?? "",
            strength: full.strength ?? "",
            unit: full.unit ?? "",
            manufacturer: full.manufacturer ?? "",
            hsnCode: full.hsnCode ?? "",
            barcode: full.barcode ?? "",
            batchNumber: full.batchNumber ?? "",
            prescriptionRequired: full.prescriptionRequired,
            reorderLevel: String(full.reorderLevel),
            minStockLevel: String(full.minStockLevel),
            maxStockLevel: full.maxStockLevel == null ? "" : String(full.maxStockLevel),
            purchasePrice: String(full.purchasePrice),
            sellingPrice: String(full.sellingPrice),
            taxPercent: String(full.taxPercent),
            discount: String(full.discount),
            supplierId: full.supplierId ?? "",
            manufacturingDate: full.manufacturingDate ? full.manufacturingDate.slice(0, 10) : "",
            expiryDate: full.expiryDate ? full.expiryDate.slice(0, 10) : "",
            storageConditions: full.storageConditions ?? "",
            status: full.status,
          })
          setLoading(false)
        })
        .catch((e: unknown) => {
          toast.error(e instanceof Error ? e.message : "Failed to load medicine")
          setLoading(false)
        })
    }
  }, [clinicId, id])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!form.name.trim()) {
      toast.error("Name is required")
      return
    }
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      genericName: str(form.genericName),
      brand: str(form.brand),
      category: str(form.category),
      dosageForm: str(form.dosageForm),
      strength: str(form.strength),
      unit: str(form.unit),
      manufacturer: str(form.manufacturer),
      hsnCode: str(form.hsnCode),
      barcode: str(form.barcode),
      batchNumber: str(form.batchNumber),
      prescriptionRequired: form.prescriptionRequired,
      reorderLevel: num(form.reorderLevel),
      minStockLevel: num(form.minStockLevel),
      maxStockLevel: form.maxStockLevel.trim() === "" ? null : num(form.maxStockLevel),
      purchasePrice: num(form.purchasePrice),
      sellingPrice: num(form.sellingPrice),
      taxPercent: num(form.taxPercent),
      discount: num(form.discount),
      supplierId: form.supplierId.trim() === "" ? null : form.supplierId,
      manufacturingDate: form.manufacturingDate.trim() === "" ? null : form.manufacturingDate,
      expiryDate: form.expiryDate.trim() === "" ? null : form.expiryDate,
      storageConditions: str(form.storageConditions),
      status: form.status,
    }
    setSaving(true)
    try {
      if (id) {
        await updateMedicine(clinicId, id, payload)
        toast.success("Medicine updated")
      } else {
        await createMedicine(clinicId, payload)
        toast.success("Medicine created")
      }
      router.push("/clinic/pharmacy/medicines")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">Loading…</CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="genericName">Generic Name</Label>
            <Input id="genericName" value={form.genericName} onChange={(e) => set("genericName", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="brand">Brand</Label>
            <Input id="brand" value={form.brand} onChange={(e) => set("brand", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <Input id="category" value={form.category} onChange={(e) => set("category", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="dosageForm">Dosage Form</Label>
            <Input id="dosageForm" value={form.dosageForm} onChange={(e) => set("dosageForm", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="strength">Strength</Label>
            <Input id="strength" value={form.strength} onChange={(e) => set("strength", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="unit">Unit</Label>
            <Input id="unit" value={form.unit} onChange={(e) => set("unit", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="manufacturer">Manufacturer</Label>
            <Input id="manufacturer" value={form.manufacturer} onChange={(e) => set("manufacturer", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="hsnCode">HSN Code</Label>
            <Input id="hsnCode" value={form.hsnCode} onChange={(e) => set("hsnCode", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="barcode">Barcode</Label>
            <Input id="barcode" value={form.barcode} onChange={(e) => set("barcode", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="batchNumber">Batch Number</Label>
            <Input id="batchNumber" value={form.batchNumber} onChange={(e) => set("batchNumber", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="reorderLevel">Reorder Level *</Label>
            <Input id="reorderLevel" type="number" value={form.reorderLevel} onChange={(e) => set("reorderLevel", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="minStockLevel">Min Stock Level</Label>
            <Input id="minStockLevel" type="number" value={form.minStockLevel} onChange={(e) => set("minStockLevel", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="maxStockLevel">Max Stock Level</Label>
            <Input id="maxStockLevel" type="number" value={form.maxStockLevel} onChange={(e) => set("maxStockLevel", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="purchasePrice">Purchase Price</Label>
            <Input id="purchasePrice" type="number" step="0.01" value={form.purchasePrice} onChange={(e) => set("purchasePrice", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="sellingPrice">Selling Price</Label>
            <Input id="sellingPrice" type="number" step="0.01" value={form.sellingPrice} onChange={(e) => set("sellingPrice", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="taxPercent">Tax %</Label>
            <Input id="taxPercent" type="number" step="0.01" value={form.taxPercent} onChange={(e) => set("taxPercent", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="discount">Discount</Label>
            <Input id="discount" type="number" step="0.01" value={form.discount} onChange={(e) => set("discount", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="supplierId">Supplier</Label>
            <Select value={form.supplierId} onValueChange={(v) => set("supplierId", v ?? "")}>
              <SelectTrigger id="supplierId">
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.supplierId} value={s.supplierId}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="manufacturingDate">Manufacturing Date</Label>
            <Input id="manufacturingDate" type="date" value={form.manufacturingDate} onChange={(e) => set("manufacturingDate", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="expiryDate">Expiry Date</Label>
            <Input id="expiryDate" type="date" value={form.expiryDate} onChange={(e) => set("expiryDate", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", (v as "active" | "inactive") ?? "active")}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Checkbox
              checked={form.prescriptionRequired}
              onCheckedChange={(v) => set("prescriptionRequired", v === true)}
              id="prescriptionRequired"
            />
            <Label htmlFor="prescriptionRequired">Prescription Required</Label>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="storageConditions">Storage Conditions</Label>
            <Input id="storageConditions" value={form.storageConditions} onChange={(e) => set("storageConditions", e.target.value)} />
          </div>

          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => router.push("/clinic/pharmacy/medicines")}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : id ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
