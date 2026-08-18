"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  type Bill,
  type BillItem,
  createBill,
  listBills,
  updateBill,
  voidBill,
} from "@/lib/clinic-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PatientSelect } from "@/components/clinic/pickers";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_CLASS: Record<string, string> = {
  draft: "bg-slate-200 text-slate-600",
  issued: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  void: "bg-red-100 text-red-700",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function BillingPage() {
  const session = useRequireRole("staff");
  const clinicId = session?.clinicId ?? "";
  const [items, setItems] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!clinicId) return;
    setLoading(true);
    listBills(clinicId, {
      status: statusFilter === "all" ? undefined : statusFilter,
      limit: 100,
    })
      .then((res) => setItems(res.items))
      .catch(() => toast.error("Failed to load bills"))
      .finally(() => setLoading(false));
  }, [clinicId, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(form: {
    patientId: string;
    doctorId: string | null;
    items: BillItem[];
    discount: number;
    taxPercent: number;
    notes: string;
    status: string;
  }) {
    setSaving(true);
    try {
      await createBill(clinicId, {
        patientId: form.patientId,
        doctorId: form.doctorId ?? undefined,
        items: form.items.filter((i) => i.description.trim()),
        discount: form.discount,
        taxPercent: form.taxPercent,
        notes: form.notes || null,
        status: form.status,
      });
      toast.success("Bill created");
      setCreating(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create bill");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(bill: Bill, status: string | null) {
    try {
      await updateBill(clinicId, bill.billId, { status: status ?? "draft" });
      toast.success("Bill updated");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update bill");
    }
  }

  async function handleVoid(bill: Bill) {
    if (!confirm(`Void bill ${bill.billNumber}?`)) return;
    try {
      await voidBill(clinicId, bill.billId);
      toast.success("Bill voided");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to void bill");
    }
  }

  const totalCollected = items
    .filter((b) => b.status === "paid")
    .reduce((sum, b) => sum + b.total, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">draft</SelectItem>
            <SelectItem value="issued">issued</SelectItem>
            <SelectItem value="paid">paid</SelectItem>
            <SelectItem value="void">void</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger render={<Button>New bill</Button>} />
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New bill</DialogTitle>
              <DialogDescription>
                Create a bill with line items; totals are computed by the server.
              </DialogDescription>
            </DialogHeader>
            <BillForm clinicId={clinicId} saving={saving} onSave={handleCreate} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Bills</CardTitle>
            <span className="text-sm text-muted-foreground">
              Collected: <span className="font-semibold">₹{totalCollected.toLocaleString("en-IN")}</span>
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No bills found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill no.</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((b) => (
                  <TableRow key={b.billId}>
                    <TableCell className="font-medium">{b.billNumber}</TableCell>
                    <TableCell>{b.patientId}</TableCell>
                    <TableCell>{formatDate(b.createdAt)}</TableCell>
                    <TableCell>{b.items.length}</TableCell>
                    <TableCell className="font-medium">
                      ₹{b.total.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell>
                      {b.status === "void" ? (
                        <Badge className={STATUS_CLASS.void}>void</Badge>
                      ) : (
                        <Select value={b.status} onValueChange={(v) => handleStatus(b, v)}>
                          <SelectTrigger className="h-7 w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">draft</SelectItem>
                            <SelectItem value="issued">issued</SelectItem>
                            <SelectItem value="paid">paid</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleVoid(b)}>
                        Void
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface BillItemInput {
  description: string;
  quantity: string;
  unitPrice: string;
}

function BillForm({
  clinicId,
  saving,
  onSave,
}: {
  clinicId: string;
  saving: boolean;
  onSave: (form: {
    patientId: string;
    doctorId: string | null;
    items: BillItem[];
    discount: number;
    taxPercent: number;
    notes: string;
    status: string;
  }) => Promise<void>;
}) {
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [items, setItems] = useState<BillItemInput[]>([
    { description: "", quantity: "1", unitPrice: "" },
  ]);
  const [discount, setDiscount] = useState("0");
  const [taxPercent, setTaxPercent] = useState("0");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("draft");

  function setItem(i: number, patch: Partial<BillItemInput>) {
    setItems((list) => list.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((list) => [...list, { description: "", quantity: "1", unitPrice: "" }]);
  }

  function removeItem(i: number) {
    setItems((list) => (list.length > 1 ? list.filter((_, idx) => idx !== i) : list));
  }

  const subtotal = items.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
    0
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const cleanItems: BillItem[] = items
      .filter((it) => it.description.trim() && Number(it.unitPrice) >= 0)
      .map((it) => ({
        description: it.description.trim(),
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice) || 0,
        lineTotal: (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0),
      }));
    if (!patientId) return;
    await onSave({
      patientId,
      doctorId,
      items: cleanItems,
      discount: Number(discount) || 0,
      taxPercent: Number(taxPercent) || 0,
      notes,
      status,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3">
        <div className="grid gap-2">
          <Label>Patient</Label>
          <PatientSelect clinicId={clinicId} value={patientId} onChange={(v) => setPatientId(v ?? "")} required />
        </div>
        <div className="grid gap-2">
          <Label>Items</Label>
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-[1fr_5rem_6rem_auto] items-end gap-2">
              <Input
                placeholder="Description"
                value={it.description}
                onChange={(e) => setItem(i, { description: e.target.value })}
                required
              />
              <Input
                type="number"
                min="1"
                placeholder="Qty"
                value={it.quantity}
                onChange={(e) => setItem(i, { quantity: e.target.value })}
              />
              <Input
                type="number"
                min="0"
                placeholder="Price"
                value={it.unitPrice}
                onChange={(e) => setItem(i, { unitPrice: e.target.value })}
              />
              <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(i)}>
                Remove
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            Add item
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="grid gap-2">
            <Label>Discount (₹)</Label>
            <Input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Tax %</Label>
            <Input type="number" min="0" max="100" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v ?? "draft")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">draft</SelectItem>
                <SelectItem value="issued">issued</SelectItem>
                <SelectItem value="paid">paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Subtotal: ₹{subtotal.toLocaleString("en-IN")}
        </p>
        <div className="grid gap-2">
          <Label>Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={saving || !patientId}>
          {saving ? "Saving..." : "Create bill"}
        </Button>
      </DialogFooter>
    </form>
  );
}