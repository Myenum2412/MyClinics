"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { getInventory, writeOffStock, type PharmacyInventory } from "@/lib/clinic-api"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
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

const WRITE_OFF_REASONS = [
  { value: "damaged", label: "Damaged" },
  { value: "wastage", label: "Wastage" },
  { value: "expired", label: "Expired" },
]

export function WriteOffForm({ clinicId, inventoryId }: { clinicId: string; inventoryId: string }) {
  const router = useRouter()
  const [detail, setDetail] = React.useState<PharmacyInventory | null>(null)
  const [quantity, setQuantity] = React.useState("")
  const [reason, setReason] = React.useState<"damaged" | "wastage" | "expired">("damaged")
  const [notes, setNotes] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    getInventory(clinicId, inventoryId)
      .then(setDetail)
      .catch((e: unknown) => {
        toast.error(e instanceof Error ? e.message : "Failed to load batch")
      })
  }, [clinicId, inventoryId])

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (Number(quantity) <= 0) {
      toast.error("Enter a quantity greater than zero")
      return
    }
    setSaving(true)
    writeOffStock(clinicId, {
      inventoryId,
      quantity: Number(quantity),
      reason,
      notes: notes || null,
    })
      .then(() => {
        toast.success("Stock written off")
        router.push("/clinic/pharmacy/inventory")
      })
      .catch((e: unknown) => {
        toast.error(e instanceof Error ? e.message : "Failed to write off stock")
        setSaving(false)
      })
  }

  return (
    <Card>
      <CardContent className="pt-5">
        {detail && (
          <div className="mb-4 rounded-lg bg-muted/50 p-3 text-sm">
            <p className="font-medium">{detail.name}</p>
            <p className="text-muted-foreground">
              Batch {detail.batchNumber} · Available {detail.quantityAvailable}
            </p>
          </div>
        )}
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label>Quantity</Label>
            <Input type="number" min={0} value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-1">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={(v) => setReason((v as typeof reason) ?? "damaged")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WRITE_OFF_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => router.push("/clinic/pharmacy/inventory")}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={saving}>
              {saving ? "Saving…" : "Write Off"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
