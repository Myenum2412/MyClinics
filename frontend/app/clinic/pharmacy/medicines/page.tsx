"use client"

import * as React from "react"
import { useRequireRole } from "@/hooks/use-clinic-session"
import Link from "next/link"
import {
  listMedicines,
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
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts"
import { ChartContainer } from "@/components/ui/chart"
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
      <div>
          <h1 className="text-2xl font-semibold tracking-tight">Medicines</h1>
          <p className="text-sm text-muted-foreground">Manage the pharmacy medicine master</p>
        </div>


      {(() => {
        const total = medicines.length
        const active = medicines.filter((m) => m.status === "active").length
        const inactive = total - active
        const lowReorder = medicines.filter((m) => (m.reorderLevel ?? 0) > 0 && (m.reorderLevel ?? 0) >= 10).length
        const s = [
          { name: "Total", percentage: Math.min(100, total), current: total, allowed: 100, allowedLabel: "medicines", fill: "var(--chart-1)" },
          { name: "Active", percentage: total ? Math.round((active/total)*100) : 0, current: active, allowed: total, allowedLabel: "total", fill: "var(--chart-2)" },
          { name: "Inactive", percentage: total ? Math.round((inactive/total)*100) : 0, current: inactive, allowed: total, allowedLabel: "total", fill: "var(--chart-3)" },
          { name: "Reorder Set", percentage: total ? Math.round((lowReorder/total)*100) : 0, current: lowReorder, allowed: total, allowedLabel: "items", fill: "var(--chart-4)" },
        ]
        return (
          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h2 className="font-semibold text-sm">Medicines Overview</h2>
              <Button render={<Link href="/clinic/pharmacy/medicines/new" />}>Add Medicine</Button>
            </div>
            <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {s.map((item) => (
                <Card className="p-4 shadow-sm bg-card" key={item.name}>
                  <CardContent className="flex items-center space-x-4 p-0">
                    <div className="relative flex items-center justify-center">
                      <ChartContainer className="h-[80px] w-[80px]" config={{ capacity: { label: item.name, color: item.fill } }}>
                        <RadialBarChart barSize={6} data={[{ name: item.name, capacity: item.percentage }]} endAngle={-270} innerRadius={30} outerRadius={60} startAngle={90}>
                          <PolarAngleAxis angleAxisId={0} axisLine={false} domain={[0,100]} tick={false} type="number" />
                          <RadialBar angleAxisId={0} background cornerRadius={10} dataKey="capacity" fill={item.fill} />
                        </RadialBarChart>
                      </ChartContainer>
                      <div className="absolute inset-0 flex items-center justify-center"><span className="font-semibold text-xs">{item.percentage}%</span></div>
                    </div>
                    <div><dt className="font-semibold text-sm leading-none mb-1">{item.name}</dt><dd className="text-muted-foreground text-xs">{String(item.current)} of {String(item.allowed)} {item.allowedLabel}</dd></div>
                  </CardContent>
                </Card>
              ))}
            </dl>
          </Card>
        )
      })()}

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
        <CardContent className="pt-5 overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
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
                <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
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
                        <Button
                          variant="ghost"
                          size="sm"
                          render={<Link href={`/clinic/pharmacy/medicines/${m.medicineId}/edit`} />}
                        >
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
