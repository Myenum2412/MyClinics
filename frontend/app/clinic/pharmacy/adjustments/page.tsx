"use client"

import * as React from "react"
import { useRequireRole } from "@/hooks/use-clinic-session"
import {
  listAdjustments,
  createAdjustment,
  reviewAdjustment,
  listMedicines,
  type PharmacyAdjustment,
  type PharmacyMedicine,
} from "@/lib/clinic-api"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
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
import { toast } from "sonner"

type StatusFilter = "" | "pending" | "approved" | "rejected"

const statusVariant: Record<
  PharmacyAdjustment["status"],
  React.ComponentProps<typeof Badge>["variant"]
> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
}

export default function PharmacyAdjustmentsPage() {
  const session = useRequireRole("billing_staff")
  const clinicId = session?.clinicId ?? ""
  if (!session) return null

  const [adjustments, setAdjustments] = React.useState<PharmacyAdjustment[]>([])
  const [medicines, setMedicines] = React.useState<PharmacyMedicine[]>([])
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("")
  const [loading, setLoading] = React.useState(true)
  const [dialogOpen, setDialogOpen] = React.useState(false)

  const [medicineId, setMedicineId] = React.useState("")
  const [batchNumber, setBatchNumber] = React.useState("")
  const [currentQuantity, setCurrentQuantity] = React.useState("")
  const [newQuantity, setNewQuantity] = React.useState("")
  const [reason, setReason] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  const load = React.useCallback(async () => {
    if (!clinicId) return
    setLoading(true)
    try {
      const [adj, med] = await Promise.all([
        listAdjustments(clinicId, { limit: 500 }),
        listMedicines(clinicId, { limit: 500 }),
      ])
      setAdjustments(adj.items)
      setMedicines(med.items)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load adjustments")
    } finally {
      setLoading(false)
    }
  }, [clinicId])

  React.useEffect(() => {
    void load()
  }, [load])

  const medicineName = React.useCallback(
    (id: string) => medicines.find((m) => m.medicineId === id)?.name ?? id,
    [medicines]
  )

  const filtered = React.useMemo(
    () =>
      statusFilter
        ? adjustments.filter((a) => a.status === statusFilter)
        : adjustments,
    [adjustments, statusFilter]
  )

  const resetForm = () => {
    setMedicineId("")
    setBatchNumber("")
    setCurrentQuantity("")
    setNewQuantity("")
    setReason("")
  }

  const handleCreate = async () => {
    if (!medicineId) {
      toast.error("Select a medicine")
      return
    }
    if (!batchNumber.trim()) {
      toast.error("Batch number is required")
      return
    }
    const cur = Number(currentQuantity)
    const nw = Number(newQuantity)
    if (!Number.isFinite(cur) || !Number.isFinite(nw)) {
      toast.error("Enter valid quantities")
      return
    }
    setSubmitting(true)
    try {
      await createAdjustment(clinicId, {
        medicineId,
        batchNumber: batchNumber.trim(),
        currentQuantity: cur,
        newQuantity: nw,
        reason: reason.trim(),
      })
      toast.success("Adjustment requested")
      setDialogOpen(false)
      resetForm()
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create adjustment")
    } finally {
      setSubmitting(false)
    }
  }

  const handleReview = async (
    adjustmentId: string,
    decision: "approved" | "rejected"
  ) => {
    try {
      await reviewAdjustment(clinicId, adjustmentId, decision, undefined)
      toast.success(`Adjustment ${decision}`)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to review adjustment")
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stock Adjustments</h1>
          <p className="text-sm text-muted-foreground">
            Request inventory quantity corrections for approval
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter((v ?? "") as StatusFilter)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <Button onClick={() => setDialogOpen(true)}>New Adjustment</Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Stock Adjustment</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="medicine">Medicine</Label>
                  <Select value={medicineId} onValueChange={(v) => setMedicineId(v ?? "")}>
                    <SelectTrigger id="medicine" className="w-full">
                      <SelectValue placeholder="Select medicine" />
                    </SelectTrigger>
                    <SelectContent>
                      {medicines.map((m) => (
                        <SelectItem key={m.medicineId} value={m.medicineId}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="batch">Batch Number</Label>
                  <Input
                    id="batch"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    placeholder="e.g. B-2026-001"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="current">Current Qty</Label>
                    <Input
                      id="current"
                      type="number"
                      value={currentQuantity}
                      onChange={(e) => setCurrentQuantity(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="new">New Qty</Label>
                    <Input
                      id="new"
                      type="number"
                      value={newQuantity}
                      onChange={(e) => setNewQuantity(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason for adjustment"
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                <Button onClick={handleCreate} disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="pt-5">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No adjustments found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Current Qty</TableHead>
                  <TableHead>New Qty</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a.adjustmentId}>
                    <TableCell className="font-medium">
                      {medicineName(a.medicineId)}
                    </TableCell>
                    <TableCell>{a.batchNumber}</TableCell>
                    <TableCell className="tabular-nums">{a.currentQuantity}</TableCell>
                    <TableCell className="tabular-nums">{a.newQuantity}</TableCell>
                    <TableCell className="max-w-48 truncate">{a.reason}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[a.status]}>{a.status}</Badge>
                    </TableCell>
                    <TableCell>{a.requestedBy ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {a.status === "pending" ? (
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => handleReview(a.adjustmentId, "approved")}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReview(a.adjustmentId, "rejected")}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
