"use client"

import * as React from "react"
import { useRequireRole } from "@/hooks/use-clinic-session"
import Link from "next/link"
import { listSuppliers, deleteSupplier, type PharmacySupplier } from "@/lib/clinic-api"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PharmacyStats } from "@/components/pharmacy-stats"
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

export default function PharmacySuppliersPage() {
  const session = useRequireRole("billing_staff")
  const clinicId = session?.clinicId ?? ""
  const [suppliers, setSuppliers] = React.useState<PharmacySupplier[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<"all" | SupplierStatus>("all")

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
        <Button render={<Link href="/clinic/pharmacy/suppliers/new" />}>Add Supplier</Button>
      </div>

      {(() => {const total=suppliers.length;const active=suppliers.filter(s=>s.status==="active").length;const s=[{name:"Total Suppliers",percentage:Math.min(100,total*10),current:total,allowed:10,allowedLabel:"suppliers",fill:"var(--chart-1)"},{name:"Active",percentage:total?Math.round(active/total*100):0,current:active,allowed:total,allowedLabel:"total",fill:"var(--chart-2)"},{name:"Inactive",percentage:total?Math.round((total-active)/total*100):0,current:total-active,allowed:total,allowedLabel:"total",fill:"var(--chart-3)"},{name:"With GST",percentage:total?Math.round(suppliers.filter(s=>s.gstNumber).length/total*100):0,current:suppliers.filter(s=>s.gstNumber).length,allowed:total,allowedLabel:"total",fill:"var(--chart-4)"}];return (<PharmacyStats title="Suppliers Overview" items={s} />)})()}

      <Card className="rounded-xl border border-border bg-card shadow-sm">
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
                        <Button
                          variant="ghost"
                          size="sm"
                          render={<Link href={`/clinic/pharmacy/suppliers/${s.supplierId}/edit`} />}
                        >
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
