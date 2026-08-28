"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  getSupplier,
  createSupplier,
  updateSupplier,
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
import { Card, CardContent } from "@/components/ui/card"
import { SectionCard } from "@/components/clinic/form-kit"

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

export function SupplierForm({
  clinicId,
  id,
  onError,
}: {
  clinicId: string
  id?: string
  onError?: (msg: string | null) => void
}) {
  const router = useRouter()
  const [form, setForm] = React.useState<SupplierForm>(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)
  const [loading, setLoading] = React.useState(Boolean(id))

  React.useEffect(() => {
    if (id) {
      setLoading(true)
      getSupplier(clinicId, id)
        .then((s) => {
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
          setLoading(false)
        })
        .catch((e: unknown) => {
          toast.error(e instanceof Error ? e.message : "Failed to load supplier")
          setLoading(false)
        })
    }
  }, [clinicId, id])

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!form.name.trim()) {
      toast.error("Supplier name is required")
      return
    }
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
    setSaving(true)
    onError?.(null)
    try {
      if (id) {
        await updateSupplier(clinicId, id, payload)
        toast.success("Supplier updated")
      } else {
        await createSupplier(clinicId, payload)
        toast.success("Supplier created")
      }
      router.push("/clinic/pharmacy/suppliers")
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save supplier"
      onError?.(msg)
      toast.error(msg)
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
    <form onSubmit={submit} className="space-y-6">
      <SectionCard title="Primary Details" description="Legal name and point of contact for this supplier.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Supplier name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactPerson">Contact Person</Label>
            <Input id="contactPerson" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} placeholder="Contact person" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone number" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email address" />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Address">
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Textarea id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" />
        </div>
      </SectionCard>

      <SectionCard title="Compliance & Terms" description="Regulatory identifiers and payment agreement.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="gstNumber">GST Number</Label>
            <Input id="gstNumber" value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} placeholder="GST number" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="drugLicenseNumber">Drug License Number</Label>
            <Input id="drugLicenseNumber" value={form.drugLicenseNumber} onChange={(e) => setForm({ ...form, drugLicenseNumber: e.target.value })} placeholder="Drug license number" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentTerms">Payment Terms</Label>
            <Input id="paymentTerms" value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} placeholder="e.g. Net 30" />
          </div>
          <div className="space-y-2">
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
      </SectionCard>

      <SectionCard title="Notes">
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" />
        </div>
      </SectionCard>

      <div className="flex gap-3 border-t border-border pt-8">
        <Button type="button" variant="outline" onClick={() => router.push("/clinic/pharmacy/suppliers")} disabled={saving} className="border-primary/30 text-primary hover:bg-accent">
          Cancel
        </Button>
        <div className="flex-1" />
        <Button type="submit" disabled={saving} size="lg">
          {saving ? "Saving…" : id ? "Update Supplier" : "Create Supplier"}
        </Button>
      </div>
    </form>
  )
}
