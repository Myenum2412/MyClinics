"use client"

import * as React from "react"
import { useRequireRole } from "@/hooks/use-clinic-session"
import {
  listSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  type PharmacySupplier,
} from "@/lib/clinic-api"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

type SupplierStatus = "active" | "inactive"

interface SupplierForm {
  name: string
  contactPerson: string
  phone: string
  email: string
  address: string
  gstNumber: string
  drugLicenseNumber: string
  paymentTerms: string
  notes: string
  status: SupplierStatus
}

const EMPTY_FORM: SupplierForm = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  gstNumber: "",
  drugLicenseNumber: "",
  paymentTerms: "",
  notes: "",
  status: "active",
}

function emptyToNull(v: string): string | null {
  return v.trim() === "" ? null : v.trim()
}

export default function PharmacySuppliersPage() {
  const session = useRequireRole("billing_staff")
  const clinicId = session?.clinicId ?? ""
  const [suppliers, setSuppliers] = React.useState<PharmacySupplier[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<"all" | SupplierStatus>("all")

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<PharmacySupplier | null>(null)
  const [form, setForm] = React.useState<SupplierForm>(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)

  const [deleteTarget, setDeleteTarget] = React.useState<PharmacySupplier | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  const load = React.useCallback(() => {
    if (!clinicId) return
    let active = true
    setLoading(true)
    listSuppliers(clinicId, { limit: 1000 })
      .then((res) => {
        if (!active) return
        setSuppliers(res.items)
      })
      .catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : "Failed to load suppliers")
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [clinicId])

  React.useEffect(() => {
    return load()
  }, [load])

  if (!session) return null

  const filtered = suppliers.filter((s) => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      const hay = [s.name, s.contactPerson, s.phone, s.email, s.gstNumber, s.drugLicenseNumber]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  function openAdd() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  function openEdit(s: PharmacySupplier) {
    setEditing(s)
    setForm({
      name: s.name,
      contactPerson: s.contactPerson ?? "",
      phone: s.phone ?? "",
      email: s.email ?? "",
      address: s.address ?? "",
      gstNumber: s.gstNumber ?? "",
      drugLicenseNumber: s.drugLicenseNumber ?? "",
      paymentTerms: s.paymentTerms ?? "",
      notes: s.notes ?? "",
      status: s.status,
    })
    setFormOpen(true)
  }

  async function submitForm() {
    if (!clinicId) return
    if (!form.name.trim()) {
      toast.error("Supplier name is required")
      return
    }
    setSaving(true)
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      contactPerson: emptyToNull(form.contactPerson),
      phone: emptyToNull(form.phone),
      email: emptyToNull(form.email),
      address: emptyToNull(form.address),
      gstNumber: emptyToNull(form.gstNumber),
      drugLicenseNumber: emptyToNull(form.drugLicenseNumber),
      paymentTerms: emptyToNull(form.paymentTerms),
      notes: emptyToNull(form.notes),
      status: form.status,
    }
    try {
      if (editing) {
        await updateSupplier(clinicId, editing.supplierId, payload)
        toast.success("Supplier updated")
      } else {
        await createSupplier(clinicId, payload)
        toast.success("Supplier created")
      }
      setFormOpen(false)
      await load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save supplier")
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!clinicId || !deleteTarget) return
    setDeleting(true)
    try {
      await deleteSupplier(clinicId, deleteTarget.supplierId)
      toast.success("Supplier deleted")
      setDeleteTarget(null)
      await load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete supplier")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pharmacy Suppliers</h1>
          <p className="text-sm text-muted-foreground">Manage medicine and drug suppliers</p>
        </div>
        <Button onClick={openAdd}>Add Supplier</Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Suppliers</CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search suppliers…"
              className="sm:w-64"
            />
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter((v as "all" | SupplierStatus) ?? "all")}>
              <SelectTrigger className="sm:w-40">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No suppliers found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>GST</TableHead>
                  <TableHead>Drug License</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.supplierId}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.contactPerson ?? "—"}</TableCell>
                    <TableCell>{s.phone ?? "—"}</TableCell>
                    <TableCell>{s.email ?? "—"}</TableCell>
                    <TableCell>{s.gstNumber ?? "—"}</TableCell>
                    <TableCell>{s.drugLicenseNumber ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={s.status === "active" ? "secondary" : "outline"}>
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>
                          Edit
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(s)}>
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update the supplier details below." : "Fill in the supplier details below."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[70vh] gap-3 overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Supplier name"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input
                  id="contactPerson"
                  value={form.contactPerson}
                  onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                  placeholder="Contact person"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Phone number"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="Email address"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: (v as SupplierStatus) ?? "active" })}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Address"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="gstNumber">GST Number</Label>
                <Input
                  id="gstNumber"
                  value={form.gstNumber}
                  onChange={(e) => setForm({ ...form, gstNumber: e.target.value })}
                  placeholder="GST number"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="drugLicenseNumber">Drug License Number</Label>
                <Input
                  id="drugLicenseNumber"
                  value={form.drugLicenseNumber}
                  onChange={(e) => setForm({ ...form, drugLicenseNumber: e.target.value })}
                  placeholder="Drug license number"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <Input
                id="paymentTerms"
                value={form.paymentTerms}
                onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                placeholder="e.g. Net 30"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submitForm} disabled={saving}>
              {saving ? "Saving…" : editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Supplier</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">{deleteTarget?.name}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
