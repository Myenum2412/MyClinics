"use client"

import * as React from "react"
import { toast } from "sonner"
import { useRequireRole } from "@/hooks/use-clinic-session"
import {
  listReturns,
  createReturn,
  listMedicines,
  type PharmacyReturn,
  type PharmacyMedicine,
} from "@/lib/clinic-api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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

type ReturnTypeFilter = "" | "supplier_return" | "customer_return"

interface ReturnItemForm {
  medicineId: string
  batchNumber: string
  quantity: string
  reason: string
}

function emptyItem(): ReturnItemForm {
  return { medicineId: "", batchNumber: "", quantity: "", reason: "" }
}

function ReturnTypeBadge({ type }: { type: PharmacyReturn["type"] }) {
  if (type === "supplier_return") {
    return <Badge variant="secondary">Supplier</Badge>
  }
  return <Badge variant="default">Customer</Badge>
}

export default function PharmacyReturnsPage() {
  const session = useRequireRole("billing_staff")
  const clinicId = session?.clinicId ?? ""
  const [returns, setReturns] = React.useState<PharmacyReturn[]>([])
  const [medicines, setMedicines] = React.useState<PharmacyMedicine[]>([])
  const [typeFilter, setTypeFilter] = React.useState<ReturnTypeFilter>("")
  const [loading, setLoading] = React.useState(true)

  const [open, setOpen] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [formType, setFormType] = React.useState<"supplier_return" | "customer_return">("supplier_return")
  const [referenceId, setReferenceId] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [items, setItems] = React.useState<ReturnItemForm[]>([emptyItem()])

  const fetchAll = React.useCallback(async () => {
    if (!clinicId) return
    try {
      const [r, m] = await Promise.all([
        listReturns(clinicId, { limit: 500 }),
        listMedicines(clinicId, { limit: 500 }),
      ])
      setReturns(r.items)
      setMedicines(m.items)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load returns")
    } finally {
      setLoading(false)
    }
  }, [clinicId])

  React.useEffect(() => {
    fetchAll()
  }, [fetchAll])

  if (!session) return null

  const filtered = typeFilter
    ? returns.filter((r) => r.type === typeFilter)
    : returns

  function updateItem(index: number, patch: Partial<ReturnItemForm>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)))
  }

  function resetForm() {
    setFormType("supplier_return")
    setReferenceId("")
    setNotes("")
    setItems([emptyItem()])
  }

  async function handleSubmit() {
    if (!clinicId) return
    const cleaned = items
      .filter((it) => it.medicineId && Number(it.quantity) > 0)
      .map((it) => ({
        medicineId: it.medicineId,
        batchNumber: it.batchNumber,
        quantity: Number(it.quantity),
        reason: it.reason || null,
      }))
    if (cleaned.length === 0) {
      toast.error("Add at least one item with a medicine and quantity")
      return
    }
    setSubmitting(true)
    try {
      await createReturn(clinicId, {
        type: formType,
        referenceId: referenceId || null,
        notes: notes || null,
        items: cleaned,
      })
      toast.success("Return recorded")
      setOpen(false)
      resetForm()
      await fetchAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create return")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pharmacy Returns</h1>
          <p className="text-sm text-muted-foreground">Supplier and customer medicine returns</p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o)
            if (!o) resetForm()
          }}
        >
          <DialogTrigger render={<Button>New Return</Button>} />
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>New Return</DialogTitle>
              <DialogDescription>
                Record a supplier or customer return and its line items.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="returnType">Type</Label>
                  <Select
                    value={formType}
                    onValueChange={(v) =>
                      setFormType((v as "supplier_return" | "customer_return") ?? "supplier_return")
                    }
                  >
                    <SelectTrigger id="returnType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="supplier_return">Supplier Return</SelectItem>
                      <SelectItem value="customer_return">Customer Return</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="referenceId">Reference ID</Label>
                  <Input
                    id="referenceId"
                    value={referenceId}
                    onChange={(e) => setReferenceId(e.target.value)}
                    placeholder="e.g. INV-1024 / Bill #"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional reason / context"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label>Items</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setItems((prev) => [...prev, emptyItem()])}
                  >
                    Add Item
                  </Button>
                </div>
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Medicine</TableHead>
                        <TableHead>Batch</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((it, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Select
                              value={it.medicineId}
                              onValueChange={(v) => updateItem(idx, { medicineId: v ?? "" })}
                            >
                              <SelectTrigger className="w-44">
                                <SelectValue placeholder="Medicine" />
                              </SelectTrigger>
                              <SelectContent>
                                {medicines.map((m) => (
                                  <SelectItem key={m.medicineId} value={m.medicineId}>
                                    {m.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              value={it.batchNumber}
                              onChange={(e) => updateItem(idx, { batchNumber: e.target.value })}
                              placeholder="Batch"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={1}
                              className="w-20"
                              value={it.quantity}
                              onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                              placeholder="0"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={it.reason}
                              onChange={(e) => updateItem(idx, { reason: e.target.value })}
                              placeholder="Reason"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              disabled={items.length === 1}
                              onClick={() =>
                                setItems((prev) => prev.filter((_, i) => i !== idx))
                              }
                              aria-label="Remove item"
                            >
                              ✕
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Saving…" : "Save Return"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Returns</CardTitle>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter((v as ReturnTypeFilter) ?? "")}>
            <SelectTrigger className="w-44" size="sm">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All types</SelectItem>
              <SelectItem value="supplier_return">Supplier Return</SelectItem>
              <SelectItem value="customer_return">Customer Return</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No returns found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Processed By</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.returnId}>
                      <TableCell>
                        <ReturnTypeBadge type={r.type} />
                      </TableCell>
                      <TableCell className="font-medium">
                        {r.referenceId ?? "—"}
                      </TableCell>
                      <TableCell>{r.items.length}</TableCell>
                      <TableCell>{r.processedBy ?? "—"}</TableCell>
                      <TableCell>
                        {new Date(r.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
