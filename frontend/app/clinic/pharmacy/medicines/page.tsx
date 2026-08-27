"use client"

import * as React from "react"
import { useRequireRole } from "@/hooks/use-clinic-session"
import {
  listMedicines,
  getMedicine,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  bulkMedicines,
  listSuppliers,
  type PharmacyMedicine,
  type PharmacySupplier,
} from "@/lib/clinic-api"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
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

const str = (v: string) => (v.trim() === "" ? null : v.trim())
const num = (v: string) => (v.trim() === "" ? 0 : Number(v))

export default function PharmacyMedicinesPage() {
  const session = useRequireRole("billing_staff")
  const clinicId = session?.clinicId ?? ""

  const [medicines, setMedicines] = React.useState<PharmacyMedicine[]>([])
  const [suppliers, setSuppliers] = React.useState<PharmacySupplier[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [category, setCategory] = React.useState("")
  const [status, setStatus] = React.useState("all")
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = React.useState("activate")

  const [formOpen, setFormOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [form, setForm] = React.useState<FormState>(emptyForm)
  const [saving, setSaving] = React.useState(false)

  const [deleteTarget, setDeleteTarget] = React.useState<PharmacyMedicine | null>(null)
  const [bulkOpen, setBulkOpen] = React.useState(false)

  const load = React.useCallback(
    (q?: { search?: string; category?: string; status?: string }) => {
      if (!clinicId) return
      setLoading(true)
      const effStatus = q?.status ?? status
      Promise.all([
        listMedicines(clinicId, {
          search: q?.search ?? search,
          category: q?.category ?? category,
          status: effStatus && effStatus !== "all" ? effStatus : undefined,
          limit: 200,
        }),
        listSuppliers(clinicId, { limit: 500 }),
      ])
        .then(([m, s]) => {
          setMedicines(m.items)
          setSuppliers(s.items)
        })
        .catch((e: unknown) => {
          toast.error(e instanceof Error ? e.message : "Failed to load medicines")
        })
        .finally(() => setLoading(false))
    },
    [clinicId, search, category, status]
  )

  React.useEffect(() => {
    if (!clinicId) return
    const t = setTimeout(() => load(), 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId, search, category, status])

  if (!session) return null

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  const openEdit = async (row: PharmacyMedicine) => {
    setEditingId(row.medicineId)
    try {
      const full = await getMedicine(clinicId, row.medicineId)
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
      setFormOpen(true)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load medicine")
    }
  }

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
      if (editingId) {
        await updateMedicine(clinicId, editingId, payload)
        toast.success("Medicine updated")
      } else {
        await createMedicine(clinicId, payload)
        toast.success("Medicine created")
      }
      setFormOpen(false)
      load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMedicine(clinicId, deleteTarget.medicineId)
      toast.success("Medicine deleted")
      setSelected((s) => {
        const n = new Set(s)
        n.delete(deleteTarget.medicineId)
        return n
      })
      setDeleteTarget(null)
      load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Delete failed")
    }
  }

  const applyBulk = async () => {
    if (selected.size === 0) {
      toast.error("Select at least one medicine")
      return
    }
    try {
      const res = await bulkMedicines(clinicId, {
        ids: Array.from(selected),
        action: bulkAction as "activate" | "deactivate" | "delete",
      })
      toast.success(`Updated ${res.modified} medicine(s)`)
      setSelected(new Set())
      setBulkOpen(false)
      load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Bulk action failed")
    }
  }

  const allSelected = medicines.length > 0 && medicines.every((m) => selected.has(m.medicineId))
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(medicines.map((m) => m.medicineId)))
  const toggleOne = (id: string) =>
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Medicines</h1>
          <p className="text-sm text-muted-foreground">Manage the pharmacy medicine master</p>
        </div>
        <Button onClick={openAdd}>Add Medicine</Button>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 pt-5">
          <Input
            placeholder="Search medicines…"
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
          <Select value={status} onValueChange={(v) => setStatus(v ?? "all")}>
            <SelectTrigger className="h-9 w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <div className="ml-auto flex items-center gap-2">
            <Checkbox
              checked={selected.size > 0}
              onCheckedChange={() => setBulkOpen(true)}
              aria-label="Bulk actions"
            />
            <span className="text-sm text-muted-foreground">{selected.size} selected</span>
            <Select value={bulkAction} onValueChange={(v) => setBulkAction(v ?? "activate")}>
              <SelectTrigger className="h-9 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="activate">Activate</SelectItem>
                <SelectItem value="deactivate">Deactivate</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" disabled={selected.size === 0} onClick={applyBulk}>
              Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Generic</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Strength</TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Reorder</TableHead>
                <TableHead>Selling</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 11 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : medicines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-10 text-center text-muted-foreground">
                    No medicines found.
                  </TableCell>
                </TableRow>
              ) : (
                medicines.map((m) => (
                  <TableRow key={m.medicineId} data-selected={selected.has(m.medicineId)}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(m.medicineId)}
                        onCheckedChange={() => toggleOne(m.medicineId)}
                        aria-label={`Select ${m.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell>{m.genericName ?? "—"}</TableCell>
                    <TableCell>{m.category ?? "—"}</TableCell>
                    <TableCell>{m.strength ?? "—"}</TableCell>
                    <TableCell>{m.manufacturer ?? "—"}</TableCell>
                    <TableCell>{m.batchNumber ?? "—"}</TableCell>
                    <TableCell className="tabular-nums">{m.reorderLevel}</TableCell>
                    <TableCell className="tabular-nums">{fmtMoney(m.sellingPrice)}</TableCell>
                    <TableCell>
                      <Badge variant={m.status === "active" ? "default" : "secondary"}>
                        {m.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(m)}>
                          Edit
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(m)}>
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Medicine" : "Add Medicine"}</DialogTitle>
            <DialogDescription>
              Medicine master details. Fields marked * are required.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="grid max-h-[70vh] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
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

            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : editingId ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Medicine</DialogTitle>
            <DialogDescription>
              Delete <span className="font-medium">{deleteTarget?.name}</span>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Action</DialogTitle>
            <DialogDescription>
              {selected.size} medicine(s) selected. Apply the chosen action to all of them.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>
              Cancel
            </Button>
            <Button onClick={applyBulk} disabled={selected.size === 0}>
              Apply {bulkAction}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
