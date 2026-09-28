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
import { Pencil, Trash2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Pagination } from "@/components/ui/pagination"

type SupplierStatus = "active" | "inactive"

export default function PharmacySuppliersPage() {
  const session = useRequireRole("billing_staff")
  const clinicId = session?.clinicId ?? ""
  const [suppliers, setSuppliers] = React.useState<PharmacySupplier[]>([])
  const [total, setTotal] = React.useState(0)
  const [page, setPage] = React.useState(1)
  const pageSize = 20
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<"all" | SupplierStatus>("all")

  const [initialLoading, setInitialLoading] = React.useState(true)
  const [deleteTarget, setDeleteTarget] = React.useState<PharmacySupplier | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  const load = React.useCallback(() => {
    if (!clinicId) return
    let active = true
    setLoading(true)
    listSuppliers(clinicId, {
      search: search.trim() || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      page,
      limit: pageSize,
    })
      .then((res) => {
        if (!active) return
        setSuppliers(res.items ?? [])
        setTotal(res.total ?? 0)
      })
      .catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : "Failed to load suppliers")
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
        setInitialLoading(false)
      })
    return () => {
      active = false
    }
  }, [clinicId, search, statusFilter, page])

  // Debounced so every keystroke doesn't fire a request.
  React.useEffect(() => {
    const t = setTimeout(() => load(), 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId, search, statusFilter, page])

  // Bounded, unfiltered sample purely for the stat cards (active/inactive/with-GST ratios).
  const [statsSuppliers, setStatsSuppliers] = React.useState<PharmacySupplier[]>([])
  React.useEffect(() => {
    if (!clinicId) return
    listSuppliers(clinicId, { limit: 200 }).then((res) => setStatsSuppliers(res.items ?? [])).catch(() => {})
  }, [clinicId])

  if (!session) return null

  const filtered = suppliers

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
    <div className="flex flex-col gap-4 sm:gap-6">
      {!initialLoading && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
      {(() => {const sampleTotal=statsSuppliers.length;const active=statsSuppliers.filter(s=>s.status==="active").length;const s=[{name:"Total Suppliers",percentage:Math.min(100,total*10),current:total,allowed:10,allowedLabel:"suppliers",fill:"var(--chart-1)"},{name:"Active",percentage:sampleTotal?Math.round(active/sampleTotal*100):0,current:active,allowed:sampleTotal,allowedLabel:"recent",fill:"var(--chart-2)"},{name:"Inactive",percentage:sampleTotal?Math.round((sampleTotal-active)/sampleTotal*100):0,current:sampleTotal-active,allowed:sampleTotal,allowedLabel:"recent",fill:"var(--chart-3)"},{name:"With GST",percentage:sampleTotal?Math.round(statsSuppliers.filter(s=>s.gstNumber).length/sampleTotal*100):0,current:statsSuppliers.filter(s=>s.gstNumber).length,allowed:sampleTotal,allowedLabel:"recent",fill:"var(--chart-4)"}];return (<PharmacyStats title="Suppliers Analytics" subtitle="Manage medicine and drug suppliers." searchTerm={search} onSearchChange={(v)=>{setSearch(v);setPage(1)}} searchPlaceholder="Search suppliers..." action={<Button size="sm" className="h-9 w-full justify-center shadow-sm sm:w-auto" render={<Link href="/clinic/pharmacy/suppliers/new" />}>Add Supplier</Button>} items={s} />)})()}
        </div>
      )}

      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-border p-3 sm:p-4">
            <span className="text-sm font-medium">Suppliers <span className="text-muted-foreground">({total})</span></span>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter((v as "all" | SupplierStatus) ?? "all"); setPage(1) }}>
              <SelectTrigger className="h-9 min-w-[140px] flex-1 sm:ml-auto sm:flex-none sm:w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
            </Select>
          </div>
          {loading ? (
            <div className="space-y-2 p-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-muted-foreground">
                {search || statusFilter !== "all" ? "No suppliers match your search or filters." : "No suppliers yet — add your first one to get started."}
              </p>
            </div>
          ) : (
            <>
            {/* Desktop table — hidden on mobile */}
            <div className="hidden overflow-x-auto md:block"><Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
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
                  <TableRow key={s.supplierId} className="hover:bg-muted/30 transition-colors">
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
                          size="icon-sm"
                          aria-label="Edit" title="Edit"
                          render={<Link href={`/clinic/pharmacy/suppliers/${s.supplierId}/edit`} />}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" aria-label="Delete" title="Delete" onClick={() => setDeleteTarget(s)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
            {/* Mobile card list — visible only on small screens */}
            <div className="space-y-2.5 bg-muted/40 p-3 md:hidden">
              {filtered.map((s) => (
                <div key={s.supplierId} className="rounded-2xl border border-border bg-card p-3 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">{s.name}</p>
                    <Badge variant={s.status === "active" ? "secondary" : "outline"} className="shrink-0 text-[11px] capitalize">
                      {s.status}
                    </Badge>
                  </div>
                  {s.contactPerson ? (
                    <p className="mt-1 truncate text-xs text-foreground">{s.contactPerson}</p>
                  ) : null}
                  {(s.phone || s.email) ? (
                    <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                      {[s.phone, s.email].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                  {(s.gstNumber || s.drugLicenseNumber) ? (
                    <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                      {[s.gstNumber && `GST: ${s.gstNumber}`, s.drugLicenseNumber && `DL: ${s.drugLicenseNumber}`].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                  <div className="mt-2 flex items-center justify-end gap-1.5 border-t border-border/60 pt-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-9 rounded-xl border-primary/20 bg-primary/5 text-primary"
                      aria-label="Edit" title="Edit"
                      render={<Link href={`/clinic/pharmacy/suppliers/${s.supplierId}/edit`} />}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-9 rounded-xl border-destructive/20 bg-destructive/5 text-destructive"
                      aria-label="Delete" title="Delete"
                      onClick={() => setDeleteTarget(s)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            </>
          )}
          {!loading && total > 0 && (
            <Pagination page={page} pageSize={pageSize} totalItems={total} onPageChange={setPage} itemLabel="suppliers" />
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
