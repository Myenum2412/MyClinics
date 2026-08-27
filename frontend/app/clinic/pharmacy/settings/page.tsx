"use client"

import * as React from "react"
import { useRequireRole } from "@/hooks/use-clinic-session"
import {
  getPharmacySettings,
  updatePharmacySettings,
  type PharmacySettings,
  type PharmacyOperatingHour,
  type PharmacyDispensingSettings,
  type PharmacyInvoiceConfig,
} from "@/lib/clinic-api"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]

function emptyHours(): PharmacyOperatingHour[] {
  return DAYS.map((day) => ({ day, open: "09:00", close: "18:00", closed: false }))
}

function emptySettings(): PharmacySettings {
  return {
    clinicId: "",
    pharmacyId: "",
    pharmacyName: "",
    registrationNumber: "",
    licenseNumber: "",
    gstNumber: "",
    taxId: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    country: "",
    pincode: "",
    contactPhone: "",
    contactEmail: "",
    pharmacistName: "",
    pharmacistRegistration: "",
    operatingHours: emptyHours(),
    dispensingSettings: {
      allowSubstitution: false,
      requirePrescription: true,
      defaultTaxPercent: 0,
      rounding: "none",
    },
    invoiceConfig: {
      prefix: "INV",
      nextNumber: 1,
      footerNote: "",
    },
    paymentMethods: [],
    supplierInfo: "",
    pharmacyStatus: "active",
    createdAt: "",
    updatedAt: "",
  }
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}

export default function PharmacySettingsPage() {
  const session = useRequireRole("billing_staff")
  const clinicId = session?.clinicId ?? ""
  const [data, setData] = React.useState<PharmacySettings | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!clinicId) return
    let active = true
    setLoading(true)
    getPharmacySettings(clinicId)
      .then((res) => {
        if (!active) return
        setData(res ?? emptySettings())
      })
      .catch(() => {
        if (active) setData(emptySettings())
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [clinicId])

  if (!session) return null

  const set = <K extends keyof PharmacySettings>(key: K, value: PharmacySettings[K]) => {
    setData((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const setDispensing = (patch: Partial<PharmacyDispensingSettings>) => {
    setData((prev) =>
      prev ? { ...prev, dispensingSettings: { ...prev.dispensingSettings, ...patch } } : prev
    )
  }

  const setInvoice = (patch: Partial<PharmacyInvoiceConfig>) => {
    setData((prev) =>
      prev ? { ...prev, invoiceConfig: { ...prev.invoiceConfig, ...patch } } : prev
    )
  }

  const setHour = (index: number, patch: Partial<PharmacyOperatingHour>) => {
    setData((prev) =>
      prev
        ? {
            ...prev,
            operatingHours: prev.operatingHours.map((h, i) =>
              i === index ? { ...h, ...patch } : h
            ),
          }
        : prev
    )
  }

  const handleSave = async () => {
    if (!data) return
    setSaving(true)
    try {
      await updatePharmacySettings(clinicId, {
        pharmacyName: data.pharmacyName,
        registrationNumber: data.registrationNumber,
        licenseNumber: data.licenseNumber,
        gstNumber: data.gstNumber,
        taxId: data.taxId,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city,
        state: data.state,
        country: data.country,
        pincode: data.pincode,
        contactPhone: data.contactPhone,
        contactEmail: data.contactEmail,
        pharmacistName: data.pharmacistName,
        pharmacistRegistration: data.pharmacistRegistration,
        pharmacyStatus: data.pharmacyStatus,
        paymentMethods: data.paymentMethods,
        supplierInfo: data.supplierInfo,
        dispensingSettings: data.dispensingSettings,
        invoiceConfig: data.invoiceConfig,
        operatingHours: data.operatingHours,
      })
      toast.success("Pharmacy settings saved")
      const refreshed = await getPharmacySettings(clinicId)
      if (refreshed) setData(refreshed)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  if (loading || !data) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pharmacy Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage clinic license, contact, pharmacist, and dispensing configuration
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clinic &amp; License</CardTitle>
            <CardDescription>Registration and tax identifiers</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Pharmacy Name" htmlFor="pharmacyName">
              <Input
                id="pharmacyName"
                value={data.pharmacyName ?? ""}
                onChange={(e) => set("pharmacyName", e.target.value)}
              />
            </Field>
            <Field label="Registration Number" htmlFor="registrationNumber">
              <Input
                id="registrationNumber"
                value={data.registrationNumber ?? ""}
                onChange={(e) => set("registrationNumber", e.target.value)}
              />
            </Field>
            <Field label="License Number" htmlFor="licenseNumber">
              <Input
                id="licenseNumber"
                value={data.licenseNumber ?? ""}
                onChange={(e) => set("licenseNumber", e.target.value)}
              />
            </Field>
            <Field label="GST Number" htmlFor="gstNumber">
              <Input
                id="gstNumber"
                value={data.gstNumber ?? ""}
                onChange={(e) => set("gstNumber", e.target.value)}
              />
            </Field>
            <Field label="Tax ID" htmlFor="taxId">
              <Input
                id="taxId"
                value={data.taxId ?? ""}
                onChange={(e) => set("taxId", e.target.value)}
              />
            </Field>
            <Field label="Status" htmlFor="pharmacyStatus">
              <Select
                value={data.pharmacyStatus}
                onValueChange={(v) => set("pharmacyStatus", v as "active" | "inactive")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Address</CardTitle>
            <CardDescription>Physical location of the pharmacy</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Address Line 1" htmlFor="addressLine1">
              <Input
                id="addressLine1"
                value={data.addressLine1 ?? ""}
                onChange={(e) => set("addressLine1", e.target.value)}
              />
            </Field>
            <Field label="Address Line 2" htmlFor="addressLine2">
              <Input
                id="addressLine2"
                value={data.addressLine2 ?? ""}
                onChange={(e) => set("addressLine2", e.target.value)}
              />
            </Field>
            <Field label="City" htmlFor="city">
              <Input
                id="city"
                value={data.city ?? ""}
                onChange={(e) => set("city", e.target.value)}
              />
            </Field>
            <Field label="State" htmlFor="state">
              <Input
                id="state"
                value={data.state ?? ""}
                onChange={(e) => set("state", e.target.value)}
              />
            </Field>
            <Field label="Country" htmlFor="country">
              <Input
                id="country"
                value={data.country ?? ""}
                onChange={(e) => set("country", e.target.value)}
              />
            </Field>
            <Field label="Pincode" htmlFor="pincode">
              <Input
                id="pincode"
                value={data.pincode ?? ""}
                onChange={(e) => set("pincode", e.target.value)}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact</CardTitle>
            <CardDescription>How patients reach the pharmacy</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact Phone" htmlFor="contactPhone">
              <Input
                id="contactPhone"
                value={data.contactPhone ?? ""}
                onChange={(e) => set("contactPhone", e.target.value)}
              />
            </Field>
            <Field label="Contact Email" htmlFor="contactEmail">
              <Input
                id="contactEmail"
                value={data.contactEmail ?? ""}
                onChange={(e) => set("contactEmail", e.target.value)}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pharmacist</CardTitle>
            <CardDescription>Responsible pharmacist details</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Pharmacist Name" htmlFor="pharmacistName">
              <Input
                id="pharmacistName"
                value={data.pharmacistName ?? ""}
                onChange={(e) => set("pharmacistName", e.target.value)}
              />
            </Field>
            <Field label="Registration" htmlFor="pharmacistRegistration">
              <Input
                id="pharmacistRegistration"
                value={data.pharmacistRegistration ?? ""}
                onChange={(e) => set("pharmacistRegistration", e.target.value)}
              />
            </Field>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Dispensing Settings</CardTitle>
            <CardDescription>Substitution, prescription, tax and rounding rules</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={data.dispensingSettings.allowSubstitution}
                onCheckedChange={(c) => setDispensing({ allowSubstitution: c === true })}
              />
              <Label htmlFor="allowSubstitution">Allow generic substitution</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={data.dispensingSettings.requirePrescription}
                onCheckedChange={(c) => setDispensing({ requirePrescription: c === true })}
              />
              <Label htmlFor="requirePrescription">Require prescription</Label>
            </div>
            <Field label="Default Tax %" htmlFor="defaultTaxPercent">
              <Input
                id="defaultTaxPercent"
                type="number"
                value={data.dispensingSettings.defaultTaxPercent}
                onChange={(e) =>
                  setDispensing({ defaultTaxPercent: Number(e.target.value) || 0 })
                }
              />
            </Field>
            <Field label="Rounding" htmlFor="rounding">
              <Select
                value={data.dispensingSettings.rounding}
                onValueChange={(v) =>
                  setDispensing({ rounding: v as "none" | "nearest_rupee" })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select rounding" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No rounding</SelectItem>
                  <SelectItem value="nearest_rupee">Nearest rupee</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Invoice Configuration</CardTitle>
            <CardDescription>Prefix and numbering for generated invoices</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <Field label="Prefix" htmlFor="prefix">
              <Input
                id="prefix"
                value={data.invoiceConfig.prefix}
                onChange={(e) => setInvoice({ prefix: e.target.value })}
              />
            </Field>
            <Field label="Next Number" htmlFor="nextNumber">
              <Input
                id="nextNumber"
                type="number"
                readOnly
                value={data.invoiceConfig.nextNumber}
                className="bg-muted/50"
              />
            </Field>
            <Field label="Footer Note" htmlFor="footerNote">
              <Input
                id="footerNote"
                value={data.invoiceConfig.footerNote ?? ""}
                onChange={(e) => setInvoice({ footerNote: e.target.value })}
              />
            </Field>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Payment Methods</CardTitle>
            <CardDescription>Comma-separated list of accepted methods</CardDescription>
          </CardHeader>
          <CardContent>
            <Field label="Payment Methods" htmlFor="paymentMethods">
              <Input
                id="paymentMethods"
                value={data.paymentMethods.join(", ")}
                onChange={(e) =>
                  set(
                    "paymentMethods",
                    e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter((s) => s.length > 0)
                  )
                }
                placeholder="cash, upi, card"
              />
            </Field>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Supplier Info</CardTitle>
            <CardDescription>Default supplier notes / terms</CardDescription>
          </CardHeader>
          <CardContent>
            <Field label="Supplier Information" htmlFor="supplierInfo">
              <Textarea
                id="supplierInfo"
                value={data.supplierInfo ?? ""}
                onChange={(e) => set("supplierInfo", e.target.value)}
                rows={3}
              />
            </Field>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Operating Hours</CardTitle>
            <CardDescription>Weekly schedule (mark closed days)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.operatingHours.map((h, i) => (
              <div
                key={h.day}
                className="grid grid-cols-1 items-center gap-3 rounded-lg border p-3 sm:grid-cols-[140px_1fr_1fr_1fr]"
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={h.closed}
                    onCheckedChange={(c) => setHour(i, { closed: c === true })}
                  />
                  <Label htmlFor={`closed-${h.day}`}>{h.day}</Label>
                </div>
                <Field label="Open" htmlFor={`open-${h.day}`}>
                  <Input
                    id={`open-${h.day}`}
                    type="time"
                    disabled={h.closed}
                    value={h.open}
                    onChange={(e) => setHour(i, { open: e.target.value })}
                  />
                </Field>
                <Field label="Close" htmlFor={`close-${h.day}`}>
                  <Input
                    id={`close-${h.day}`}
                    type="time"
                    disabled={h.closed}
                    value={h.close}
                    onChange={(e) => setHour(i, { close: e.target.value })}
                  />
                </Field>
                <div className="text-right text-xs text-muted-foreground">
                  {h.closed ? "Closed" : `${h.open} – ${h.close}`}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  )
}
