"use client"

import * as React from "react"
import { useRequireRole } from "@/hooks/use-clinic-session"
import {
  downloadPharmacyReport,
  listMedicines,
  listSuppliers,
  type PharmacyMedicine,
  type PharmacySupplier,
} from "@/lib/clinic-api"
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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

const REPORT_TYPES = [
  { value: "current_stock", label: "Current Stock" },
  { value: "batch_wise", label: "Batch-wise Stock" },
  { value: "low_stock", label: "Low Stock" },
  { value: "expiry", label: "Expiry" },
  { value: "expired", label: "Expired Stock" },
  { value: "valuation", label: "Inventory Valuation" },
  { value: "reconciliation", label: "Stock Reconciliation" },
  { value: "stock_movement", label: "Stock Movement" },
  { value: "wastage", label: "Wastage" },
  { value: "purchase", label: "Purchases" },
  { value: "sales", label: "Sales" },
  { value: "supplier", label: "Suppliers" },
] as const

const DATE_RANGE_TYPES = new Set(["purchase", "sales"])
const SUPPLIER_TYPES = new Set(["purchase", "supplier"])

export default function PharmacyReportsPage() {
  const session = useRequireRole("billing_staff")
  const clinicId = session?.clinicId ?? ""
  const [type, setType] = React.useState<string>("current_stock")
  const [from, setFrom] = React.useState("")
  const [to, setTo] = React.useState("")
  const [category, setCategory] = React.useState("")
  const [supplierId, setSupplierId] = React.useState("")
  const [format, setFormat] = React.useState<string>("csv")
  const [medicines, setMedicines] = React.useState<PharmacyMedicine[]>([])
  const [suppliers, setSuppliers] = React.useState<PharmacySupplier[]>([])
  const [downloading, setDownloading] = React.useState(false)

  React.useEffect(() => {
    if (!clinicId) return
    let active = true
    Promise.all([
      listMedicines(clinicId, { limit: 1000 }),
      listSuppliers(clinicId, { limit: 1000 }),
    ])
      .then(([m, s]) => {
        if (!active) return
        setMedicines(m.items)
        setSuppliers(s.items)
      })
      .catch(() => {
        /* ignore — selects remain empty */
      })
    return () => {
      active = false
    }
  }, [clinicId])

  if (!session) return null

  const categories = Array.from(
    new Set(medicines.map((m) => m.category).filter((c): c is string => !!c))
  ).sort()

  const showDates = DATE_RANGE_TYPES.has(type)
  const showSupplier = SUPPLIER_TYPES.has(type)

  async function handleDownload() {
    if (!clinicId) return
    setDownloading(true)
    try {
      await downloadPharmacyReport(clinicId, {
        type,
        from: showDates ? from || undefined : undefined,
        to: showDates ? to || undefined : undefined,
        category: category || undefined,
        supplierId: showSupplier ? (supplierId || undefined) : undefined,
        format,
      })
      toast.success("Report downloaded")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to download report")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pharmacy Reports</h1>
        <p className="text-sm text-muted-foreground">
          Export pharmacy data for compliance, analysis, and sharing.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report Parameters</CardTitle>
          <CardDescription>
            The report is generated server-side in CSV or PDF format with full
            multi-tenant isolation — only data for this clinic is included.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="report-type">Report Type</Label>
            <Select value={type} onValueChange={(v) => v && setType(v)}>
              <SelectTrigger id="report-type" className="w-full">
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_TYPES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="report-format">Format</Label>
            <Select value={format} onValueChange={(v) => v && setFormat(v)}>
              <SelectTrigger id="report-format" className="w-full">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showDates && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="report-from">From</Label>
                <Input
                  id="report-from"
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="report-to">To</Label>
                <Input
                  id="report-to"
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="report-category">Category (optional)</Label>
            <Select value={category} onValueChange={(v) => setCategory(v ?? "")}>
              <SelectTrigger id="report-category" className="w-full">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showSupplier && (
            <div className="space-y-1.5">
              <Label htmlFor="report-supplier">Supplier (optional)</Label>
              <Select value={supplierId} onValueChange={(v) => setSupplierId(v ?? "")}>
                <SelectTrigger id="report-supplier" className="w-full">
                  <SelectValue placeholder="All suppliers" />
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
          )}

          <div className="sm:col-span-2">
            <Button onClick={handleDownload} disabled={downloading}>
              {downloading ? "Generating…" : "Download Report"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
