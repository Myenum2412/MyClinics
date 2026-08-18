"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  type Bill,
  type BillItem,
  type Patient,
  createBill,
  listBills,
  listPatients,
  updateBill,
  voidBill,
} from "@/lib/clinic-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { sessionCan } from "@/hooks/use-clinic-session";
import StatsBilling from "@/components/stats-billing";
import {
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  Search,
  Columns,
  Plus,
  Download,
  ChevronLeft,
  ChevronRight,
  Trash,
} from "lucide-react";

const STATUS_CLASS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  issued: "bg-blue-50 text-blue-700 border-blue-200",
  paid: "bg-green-50 text-green-700 border-green-200",
  void: "bg-red-50 text-red-700 border-red-200",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const COLUMN_LABELS: Record<string, string> = {
  select: "Select",
  billNumber: "Bill No.",
  patient: "Patient",
  createdAt: "Date",
  itemsCount: "Items",
  total: "Total",
  status: "Status",
};

export default function BillingPage() {
  const session = useRequireRole("staff");
  const clinicId = session?.clinicId ?? "";

  // Core States
  const [items, setItems] = useState<Bill[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientLookup, setPatientLookup] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Table options (sorting, filtering, selection, visibility, pagination)
  const [sortField, setSortField] = useState<"createdAt" | null>("createdAt");
  const [sortDesc, setSortDesc] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    select: true,
    billNumber: true,
    patient: true,
    createdAt: true,
    itemsCount: true,
    total: true,
    status: true,
  });

  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 10;

  const load = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      const [billsRes, patientsRes] = await Promise.all([
        listBills(clinicId, { limit: 500 }),
        listPatients(clinicId, { limit: 500 }),
      ]);

      const map: Record<string, string> = {};
      patientsRes.items.forEach((p) => {
        map[p.patientId] = p.fullName;
      });

      setPatientLookup(map);
      setPatients(patientsRes.items);
      setItems(billsRes.items);
      setSelectedIds(new Set());
      setPageIndex(0);
    } catch {
      toast.error("Failed to load bills");
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

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

  // Row Selection logic
  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(paginatedItems.map((b) => b.billId));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelectRow = (billId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(billId);
      } else {
        next.delete(billId);
      }
      return next;
    });
  };

  // Bulk actions
  const handleBulkExport = () => {
    const selectedRows = items.filter((b) => selectedIds.has(b.billId));
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selectedRows, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `bills_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success(`Exported ${selectedIds.size} bills.`);
  };

  // Filtering & Search
  const filteredItems = useMemo(() => {
    return items.filter((b) => {
      const patientName = patientLookup[b.patientId]?.toLowerCase() ?? "";
      const billNumber = b.billNumber.toLowerCase();
      const term = searchTerm.toLowerCase();

      // Apply statusFilter if not 'all'
      if (statusFilter !== "all" && b.status !== statusFilter) return false;

      return (
        patientName.includes(term) ||
        billNumber.includes(term) ||
        b.total.toString().includes(term)
      );
    });
  }, [items, searchTerm, statusFilter, patientLookup]);

  // Sorting
  const sortedItems = useMemo(() => {
    if (!sortField) return filteredItems;

    return [...filteredItems].sort((a, b) => {
      let valA: string = a[sortField] || "";
      let valB: string = b[sortField] || "";

      if (sortField === "createdAt") {
        valA = a.createdAt;
        valB = b.createdAt;
      }

      if (sortDesc) {
        return valB.localeCompare(valA);
      }
      return valA.localeCompare(valB);
    });
  }, [filteredItems, sortField, sortDesc]);

  // Pagination
  const paginatedItems = useMemo(() => {
    const start = pageIndex * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, pageIndex]);

  const pageCount = Math.ceil(sortedItems.length / pageSize);
  const canManage = sessionCan(session, "clinic_admin");

  const toggleSort = (field: "createdAt") => {
    if (sortField === field) {
      setSortDesc(!sortDesc);
    } else {
      setSortField(field);
      setSortDesc(true);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Metrics Section */}
      {!loading && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <StatsBilling
            bills={items}
            action={
              <Dialog open={creating} onOpenChange={setCreating}>
                <DialogTrigger render={
                  <Button className="flex items-center gap-1.5 shadow-sm">
                    <Plus className="size-4" />
                    New Bill
                  </Button>
                } />
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
                  <DialogHeader>
                    <DialogTitle>New Bill</DialogTitle>
                    <DialogDescription>
                      Create a bill with line items; totals are computed by the server.
                    </DialogDescription>
                  </DialogHeader>
                  <BillForm clinicId={clinicId} saving={saving} onSave={handleCreate} />
                </DialogContent>
              </Dialog>
            }
          />
        </div>
      )}

      {/* Bulk actions bar if selected */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 shadow-sm transition-all animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-primary tabular-nums">
              {selectedIds.size} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-muted-foreground hover:text-foreground"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear selection
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1"
              onClick={handleBulkExport}
            >
              <Download className="size-3.5" />
              Export JSON
            </Button>
          </div>
        </div>
      )}

      {/* Main card containing listing */}
      <Card className="border-border shadow-sm">
        <CardHeader className="border-b border-border bg-muted/20 px-6 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-semibold text-foreground">
                Bills Listing
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                View and manage invoices, status changes, and outstanding payments.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search bills..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPageIndex(0);
                  }}
                  className="pl-9 h-9"
                />
              </div>

              {/* Status Filter */}
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v ?? "all");
                  setPageIndex(0);
                }}
              >
                <SelectTrigger className="h-9 w-36">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="issued">Issued</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="void">Void</SelectItem>
                </SelectContent>
              </Select>

              {/* Columns Visibility Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger render={
                  <Button variant="outline" size="sm" className="h-9 gap-1.5">
                    <Columns className="size-4" />
                    Columns
                  </Button>
                } />
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {Object.keys(COLUMN_LABELS).map((colKey) => (
                    <DropdownMenuCheckboxItem
                      key={colKey}
                      checked={visibleColumns[colKey]}
                      onCheckedChange={(checked) =>
                        setVisibleColumns((prev) => ({ ...prev, [colKey]: !!checked }))
                      }
                    >
                      {COLUMN_LABELS[colKey]}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No bills found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleColumns.select && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          paginatedItems.length > 0 &&
                          paginatedItems.every((b) => selectedIds.has(b.billId))
                        }
                        onCheckedChange={(checked) => handleToggleSelectAll(!!checked)}
                      />
                    </TableHead>
                  )}
                  {visibleColumns.billNumber && (
                    <TableHead>Bill No.</TableHead>
                  )}
                  {visibleColumns.patient && (
                    <TableHead>Patient</TableHead>
                  )}
                  {visibleColumns.createdAt && (
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("createdAt")}>
                      <div className="flex items-center gap-1">
                        Date
                        {sortField === "createdAt" ? (
                          sortDesc ? <ArrowDown className="size-3.5" /> : <ArrowUp className="size-3.5" />
                        ) : (
                          <ChevronsUpDown className="size-3.5 text-muted-foreground" />
                        )}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.itemsCount && (
                    <TableHead>Items</TableHead>
                  )}
                  {visibleColumns.total && (
                    <TableHead>Total</TableHead>
                  )}
                  {visibleColumns.status && (
                    <TableHead>Status</TableHead>
                  )}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((b) => (
                  <TableRow key={b.billId} className={selectedIds.has(b.billId) ? "bg-muted/30" : ""}>
                    {visibleColumns.select && (
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(b.billId)}
                          onCheckedChange={(checked) => handleToggleSelectRow(b.billId, !!checked)}
                        />
                      </TableCell>
                    )}
                    {visibleColumns.billNumber && (
                      <TableCell className="font-medium text-foreground">{b.billNumber}</TableCell>
                    )}
                    {visibleColumns.patient && (
                      <TableCell className="text-muted-foreground font-medium">
                        {patientLookup[b.patientId] || b.patientId}
                      </TableCell>
                    )}
                    {visibleColumns.createdAt && (
                      <TableCell className="text-muted-foreground">{formatDate(b.createdAt)}</TableCell>
                    )}
                    {visibleColumns.itemsCount && (
                      <TableCell className="text-muted-foreground font-medium">{b.items.length}</TableCell>
                    )}
                    {visibleColumns.total && (
                      <TableCell className="font-semibold text-foreground">
                        ₹{b.total.toLocaleString("en-IN")}
                      </TableCell>
                    )}
                    {visibleColumns.status && (
                      <TableCell>
                        {b.status === "void" ? (
                          <Badge variant="outline" className={STATUS_CLASS.void}>void</Badge>
                        ) : (
                          <Select value={b.status} onValueChange={(v) => handleStatus(b, v)}>
                            <SelectTrigger className="h-7 w-28 text-xs font-semibold">
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
                    )}
                    <TableCell className="text-right">
                      {b.status !== "void" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleVoid(b)}
                        >
                          Void
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination Footer */}
          {!loading && pageCount > 1 && (
            <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-muted/10">
              <div>
                <p className="text-sm text-muted-foreground">
                  Showing <span className="font-medium">{filteredItems.length > 0 ? pageIndex * pageSize + 1 : 0}</span> to{" "}
                  <span className="font-medium">
                    {Math.min((pageIndex + 1) * pageSize, filteredItems.length)}
                  </span>{" "}
                  of <span className="font-medium">{filteredItems.length}</span> results
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                  disabled={pageIndex === 0}
                >
                  <ChevronLeft className="size-4 mr-1" />
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {pageIndex + 1} of {pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))}
                  disabled={pageIndex >= pageCount - 1}
                >
                  Next
                  <ChevronRight className="size-4 ml-1" />
                </Button>
              </div>
            </div>
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