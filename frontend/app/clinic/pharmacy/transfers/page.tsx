"use client"

import * as React from "react"
import { useRequireRole } from "@/hooks/use-clinic-session"
import {
  listTransfers,
  createTransfer,
  reviewTransfer,
  listMedicines,
  type PharmacyTransfer,
  type PharmacyMedicine,
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
  DialogTrigger,
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

interface TransferItemDraft {
  medicineId: string
  batchNumber: string
  quantity: number
}

const STATUS_OPTIONS = ["", "pending", "approved", "rejected", "completed"] as const

function statusBadge(status: PharmacyTransfer["status"]) {
  switch (status) {
    case "pending":
      return <Badge variant="secondary">pending</Badge>
    case "approved":
      return <Badge variant="outline">approved</Badge>
    case "rejected":
      return <Badge variant="destructive">rejected</Badge>
    case "completed":
      return <Badge variant="default">completed</Badge>
  }
}

export default function PharmacyTransfersPage() {
  const session = useRequireRole("billing_staff")
  const clinicId = session?.clinicId ?? ""
  const [transfers, setTransfers] = React.useState<PharmacyTransfer[]>([])
  const [medicines, setMedicines] = React.useState<PharmacyMedicine[]>([])
  const [status, setStatus] = React.useState<string>("")
  const [loading, setLoading] = React.useState(true)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)

  const [fromLocation, setFromLocation] = React.useState("")
  const [toLocation, setToLocation] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [items, setItems] = React.useState<TransferItemDraft[]>([
    { medicineId: "", batchNumber: "", quantity: 1 },
  ])

  const fetchAll = React.useCallback(async () => {
    if (!clinicId) return
    setLoading(true)
    try {
      const [t, m] = await Promise.all([
        listTransfers(clinicId, { limit: 500 }),
        listMedicines(clinicId, { limit: 500 }),
      ])
      setTransfers(t.items)
      setMedicines(m.items)
    } catch (err) {
      toast.error("Failed to load transfers")
    } finally {
      setLoading(false)
    }
  }, [clinicId])

  React.useEffect(() => {
    if (!clinicId) return
    fetchAll()
  }, [clinicId, fetchAll])

  if (!session) return null

  const filtered = status
    ? transfers.filter((t) => t.status === status)
    : transfers

  const resetForm = () => {
    setFromLocation("")
    setToLocation("")
    setNotes("")
    setItems([{ medicineId: "", batchNumber: "", quantity: 1 }])
  }

  const updateItem = (idx: number, patch: Partial<TransferItemDraft>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  const addItem = () =>
    setItems((prev) => [...prev, { medicineId: "", batchNumber: "", quantity: 1 }])

  const removeItem = (idx: number) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev))

  const handleCreate = async () => {
    if (!fromLocation.trim() || !toLocation.trim()) {
      toast.error("From and To locations are required")
      return
    }
    const cleanItems = items
      .filter((it) => it.medicineId && it.batchNumber.trim() && it.quantity > 0)
      .map((it) => ({
        medicineId: it.medicineId,
        batchNumber: it.batchNumber.trim(),
        quantity: Number(it.quantity),
      }))
    if (cleanItems.length === 0) {
      toast.error("Add at least one valid item")
      return
    }
    setSubmitting(true)
    try {
      await createTransfer(clinicId, {
        fromLocation: fromLocation.trim(),
        toLocation: toLocation.trim(),
        notes: notes.trim() || null,
        items: cleanItems,
      })
      toast.success("Transfer created")
      setDialogOpen(false)
      resetForm()
      fetchAll()
    } catch (err) {
      toast.error("Failed to create transfer")
    } finally {
      setSubmitting(false)
    }
  }

  const handleReview = async (
    transferId: string,
    decision: "approved" | "rejected" | "completed"
  ) => {
    try {
      await reviewTransfer(clinicId, transferId, decision, null)
      toast.success(`Transfer ${decision}`)
      fetchAll()
    } catch (err) {
      toast.error(`Failed to ${decision} transfer`)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stock Transfers</h1>
          <p className="text-sm text-muted-foreground">
            Move inventory between clinic locations
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button>New Transfer</Button>} />
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>New Stock Transfer</DialogTitle>
              <DialogDescription>
                Request stock movement from one location to another.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="from">From Location</Label>
                  <Input
                    id="from"
                    value={fromLocation}
                    onChange={(e) => setFromLocation(e.target.value)}
                    placeholder="e.g. Main Store"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="to">To Location</Label>
                  <Input
                    id="to"
                    value={toLocation}
                    onChange={(e) => setToLocation(e.target.value)}
                    placeholder="e.g. OP Pharmacy"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reason or instructions (optional)"
                  rows={2}
                />
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Items</Label>
                  <Button variant="outline" size="sm" onClick={addItem}>
                    Add Item
                  </Button>
                </div>
                <div className="space-y-2">
                  {items.map((it, idx) => (
                    <div
                      key={idx}
                      className="flex flex-wrap items-end gap-2 rounded-lg border p-2"
                    >
                      <div className="grid min-w-40 flex-1 gap-1">
                        <Label className="text-xs">Medicine</Label>
                        <Select
                          value={it.medicineId || null}
                          onValueChange={(v) =>
                            updateItem(idx, { medicineId: v ?? "" })
                          }
                        >
                          <SelectTrigger className="w-full">
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
                      <div className="grid w-32 gap-1">
                        <Label className="text-xs">Batch</Label>
                        <Input
                          value={it.batchNumber}
                          onChange={(e) =>
                            updateItem(idx, { batchNumber: e.target.value })
                          }
                          placeholder="Batch #"
                        />
                      </div>
                      <div className="grid w-24 gap-1">
                        <Label className="text-xs">Qty</Label>
                        <Input
                          type="number"
                          min={1}
                          value={it.quantity}
                          onChange={(e) =>
                            updateItem(idx, {
                              quantity: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeItem(idx)}
                        disabled={items.length === 1}
                        aria-label="Remove item"
                      >
                        ✕
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting ? "Creating…" : "Create Transfer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Transfers</CardTitle>
          <Select
            value={status || null}
            onValueChange={(v) => setStatus(v ?? "")}
          >
            <SelectTrigger size="sm" className="w-40">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              {STATUS_OPTIONS.slice(1).map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No transfers found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((t) => (
                  <TableRow key={t.transferId}>
                    <TableCell>{t.fromLocation}</TableCell>
                    <TableCell>{t.toLocation}</TableCell>
                    <TableCell>{t.items.length}</TableCell>
                    <TableCell>{statusBadge(t.status)}</TableCell>
                    <TableCell>{t.requestedBy ?? "—"}</TableCell>
                    <TableCell className="max-w-48 truncate">
                      {t.notes ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {t.status === "pending" && (
                          <>
                            <Button
                              size="xs"
                              onClick={() => handleReview(t.transferId, "approved")}
                            >
                              Approve
                            </Button>
                            <Button
                              size="xs"
                              variant="destructive"
                              onClick={() => handleReview(t.transferId, "rejected")}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {t.status === "approved" && (
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => handleReview(t.transferId, "completed")}
                          >
                            Complete
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
