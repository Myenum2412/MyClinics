"use client"

import * as React from "react"
import { useRequireRole } from "@/hooks/use-clinic-session"
import {
  listMovements,
  listMedicines,
  type PharmacyMovement,
  type PharmacyMedicine,
} from "@/lib/clinic-api"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

type MovementType =
  | ""
  | "purchase"
  | "sale"
  | "return"
  | "adjustment"
  | "transfer"
  | "write_off"
  | "opening_stock"
  | "reserve"
  | "release"

const MOVEMENT_TYPES: { value: MovementType; label: string }[] = [
  { value: "", label: "All types" },
  { value: "purchase", label: "Purchase" },
  { value: "sale", label: "Sale" },
  { value: "return", label: "Return" },
  { value: "adjustment", label: "Adjustment" },
  { value: "transfer", label: "Transfer" },
  { value: "write_off", label: "Write Off" },
  { value: "opening_stock", label: "Opening Stock" },
  { value: "reserve", label: "Reserve" },
  { value: "release", label: "Release" },
]

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "ghost" | "link"

const TYPE_BADGE: Record<string, BadgeVariant> = {
  purchase: "default",
  sale: "secondary",
  return: "outline",
  adjustment: "outline",
  transfer: "secondary",
  write_off: "destructive",
  opening_stock: "ghost",
  reserve: "outline",
  release: "outline",
}

const PAGE_SIZE = 25

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function PharmacyStockHistoryPage() {
  const session = useRequireRole("billing_staff")
  const clinicId = session?.clinicId ?? ""
  const [movements, setMovements] = React.useState<PharmacyMovement[]>([])
  const [medicines, setMedicines] = React.useState<PharmacyMedicine[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [type, setType] = React.useState<MovementType>("")
  const [from, setFrom] = React.useState("")
  const [to, setTo] = React.useState("")
  const [page, setPage] = React.useState(0)

  React.useEffect(() => {
    if (!clinicId) return
    let active = true
    setLoading(true)
    Promise.all([
      listMovements(clinicId, { limit: 500 }),
      listMedicines(clinicId, { limit: 500 }),
    ])
      .then(([m, meds]) => {
        if (!active) return
        setMovements(m.items)
        setMedicines(meds.items)
      })
      .catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : "Failed to load stock history")
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [clinicId])

  const medName = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const med of medicines) map.set(med.medicineId, med.name)
    return map
  }, [medicines])

  const fromTs = from ? new Date(from).setHours(0, 0, 0, 0) : null
  const toTs = to ? new Date(to).setHours(23, 59, 59, 999) : null

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return movements.filter((mv) => {
      if (type && mv.movementType !== type) return false
      const name = mv.medicineName ?? medName.get(mv.medicineId) ?? ""
      if (q && !name.toLowerCase().includes(q)) return false
      const ts = new Date(mv.createdAt).getTime()
      if (fromTs != null && ts < fromTs) return false
      if (toTs != null && ts > toTs) return false
      return true
    })
  }, [movements, medName, type, search, fromTs, toTs])

  const capped = filtered.length > 500
  const view = capped ? filtered.slice(0, 500) : filtered
  const pageCount = Math.max(1, Math.ceil(view.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = view.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  const resetFilters = () => {
    setSearch("")
    setType("")
    setFrom("")
    setTo("")
    setPage(0)
  }

  if (!session) return null

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stock History</h1>
          <p className="text-sm text-muted-foreground">
            Audit trail of every pharmacy stock movement
          </p>
        </div>
        <Button variant="outline" onClick={resetFilters}>
          Reset Filters
        </Button>
      </div>

      <Card className="rounded-xl border border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="search">Medicine</Label>
              <Input
                id="search"
                placeholder="Search medicine name"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(0)
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="type">Movement Type</Label>
              <Select
                value={type}
                onValueChange={(v) => {
                  setType((v as MovementType) ?? "")
                  setPage(0)
                }}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  {MOVEMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="from">From</Label>
              <Input
                id="from"
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value)
                  setPage(0)
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="to">To</Label>
              <Input
                id="to"
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value)
                  setPage(0)
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border border-border bg-card shadow-sm">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">
            Movements {!loading && <span className="text-muted-foreground">({filtered.length})</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : view.length === 0 ? (
            <p className="text-sm text-muted-foreground">No movements match the filters.</p>
          ) : (
            <>
              {capped && (
                <p className="mb-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
                  Showing first 500 of {filtered.length} results. Refine filters to narrow down.
                </p>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Medicine</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Qty Before</TableHead>
                    <TableHead className="text-right">Changed</TableHead>
                    <TableHead className="text-right">After</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead>Performed By</TableHead>
                    <TableHead>Reason / Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((mv) => {
                    const name = mv.medicineName ?? medName.get(mv.medicineId) ?? mv.medicineId
                    const changed = mv.quantityChanged
                    const changedColor =
                      changed > 0 ? "text-emerald-600" : changed < 0 ? "text-red-600" : "text-muted-foreground"
                    return (
                      <TableRow key={mv.movementId}>
                        <TableCell className="tabular-nums">{fmtDate(mv.createdAt)}</TableCell>
                        <TableCell className="font-medium">{name}</TableCell>
                        <TableCell>{mv.batchNumber || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={TYPE_BADGE[mv.movementType] ?? "secondary"}>
                            {mv.movementType.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{mv.quantityBefore}</TableCell>
                        <TableCell className={`text-right font-medium tabular-nums ${changedColor}`}>
                          {changed >= 0 ? "+" : ""}
                          {changed}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{mv.quantityAfter}</TableCell>
                        <TableCell>{mv.referenceInvoice || "—"}</TableCell>
                        <TableCell>{mv.party || "—"}</TableCell>
                        <TableCell>{mv.performedBy || "—"}</TableCell>
                        <TableCell className="max-w-[16rem] truncate">
                          {mv.reason || mv.notes || "—"}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {pageCount > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Page {safePage + 1} of {pageCount}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={safePage === 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={safePage >= pageCount - 1}
                      onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
