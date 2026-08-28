"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { getInventory, writeOffStock, type PharmacyInventory } from "@/lib/clinic-api"
import { toast } from "sonner"
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
import { SectionCard } from "@/components/clinic/form-kit"

const WRITE_OFF_REASONS = [
  { value: "damaged", label: "Damaged" },
  { value: "wastage", label: "Wastage" },
  { value: "expired", label: "Expired" },
]

export function WriteOffForm({
  clinicId,
  inventoryId,
  onError,
}: {
  clinicId: string
  inventoryId: string
  onError?: (msg: string | null) => void
}) {
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
    onError?.(null)
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
        const msg = e instanceof Error ? e.message : "Failed to write off stock"
        onError?.(msg)
        toast.error(msg)
        setSaving(false)
      })
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {detail && (
        <SectionCard title="Batch Details">
          <p className="text-sm font-medium text-foreground">{detail.name}</p>
          <p className="text-sm text-muted-foreground">
            Batch {detail.batchNumber} · Available {detail.quantityAvailable}
          </p>
        </SectionCard>
      )}

      <SectionCard title="Write-Off Details" description="Quantity and reason for removing this stock.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input id="quantity" type="number" min={0} value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-2">
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
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
          </div>
        </div>
      </SectionCard>

      <div className="flex gap-3 border-t border-border pt-8">
        <Button type="button" variant="outline" onClick={() => router.push("/clinic/pharmacy/inventory")} disabled={saving} className="border-primary/30 text-primary hover:bg-accent">
          Cancel
        </Button>
        <div className="flex-1" />
        <Button type="submit" variant="destructive" disabled={saving} size="lg">
          {saving ? "Saving…" : "Write Off"}
        </Button>
      </div>
    </form>
  )
}
