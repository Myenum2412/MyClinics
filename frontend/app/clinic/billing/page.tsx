"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  type Bill,
  type BillItem,
  type Patient,
  type PaymentStatus,
  type PaymentType,
  createBill,
  downloadBillPdf,
  listBills,
  listPatients,
  updateBill,
  voidBill,
} from "@/lib/clinic-api";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { PersonAvatar } from "@/components/clinic/person-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { sessionCan } from "@/hooks/use-clinic-session";
import dynamic from "next/dynamic";
import { billStatusTone } from "@/lib/status-styles";

const StatsBilling = dynamic(() => import("@/components/stats-billing"), {
  loading: () => <div className="h-[270px]" aria-hidden="true" />,
});
import {
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  Search,
  Plus,
  Download,
  ChevronLeft,
  Trash,
  ReceiptText,
  Paperclip,
  RotateCcw,
  FileText,
  Info,
} from "lucide-react";

const STATUS_CLASS: Record<string, string> = {
  draft: billStatusTone("draft"),
  issued: billStatusTone("issued"),
  paid: billStatusTone("paid"),
  void: billStatusTone("void"),
};

const PAYMENT_TYPE_OPTIONS: { value: PaymentType; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

const COMMON_ITEMS = [
  "Consultation",
  "Follow-up Consultation",
  "Medical Record",
  "Lab Test",
  "Procedure",
  "Medicine",
  "Other Service",
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatINR(value: number): string {
  return `₹${(Number.isFinite(value) ? value : 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function todayISO(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function BillingPage() {
  const session = useRequireRole("patient");
  const clinicId = session?.clinicId ?? "";
  const router = useRouter();

  // Doctors do not have access to billing — redirect them to the dashboard.
  useEffect(() => {
    if (session?.role === "doctor") {
      router.replace("/clinic");
    }
  }, [session?.role, router]);

  if (session?.role === "doctor") return null;

  // Core States
  const [items, setItems] = useState<Bill[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientLookup, setPatientLookup] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Bill | null>(null);
  const [viewing, setViewing] = useState<Bill | null>(null);
  const [voidTarget, setVoidTarget] = useState<Bill | null>(null);
  const [saving, setSaving] = useState(false);

  // Table options (sorting, filtering, selection, visibility, pagination)
  const [sortField, setSortField] = useState<"createdAt" | null>("createdAt");
  const [sortDesc, setSortDesc] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleColumns] = useState<Record<string, boolean>>({
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

  const load = useCallback(() => {
    if (!clinicId) return;
    Promise.all([
      listBills(clinicId, { limit: 50 }),
      listPatients(clinicId, { limit: 50 }),
    ])
      .then(([billsRes, patientsRes]) => {
        const map: Record<string, string> = {};
        patientsRes.items.forEach((p) => {
          map[p.patientId] = p.fullName;
        });

        setPatientLookup(map);
        setPatients(patientsRes.items);
        setItems(billsRes.items);
        setSelectedIds(new Set());
        setPageIndex(0);
      })
      .catch(() => {
        toast.error("Failed to load bills");
      })
      .finally(() => setLoading(false));
  }, [clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(form: {
    patientId: string;
    items: BillItem[];
    invoiceDate: string;
    dueDate: string | null;
    paymentType: PaymentType | null;
    amountPaid: number;
    notes: string | null;
    internalNotes: string | null;
    reference: string | null;
    sendMethod: "whatsapp" | "email" | "none";
  }) {
    setSaving(true);
    try {
      const created = await createBill(clinicId, {
        patientId: form.patientId,
        items: form.items.filter((i) => i.description.trim()),
        invoiceDate: form.invoiceDate,
        dueDate: form.dueDate,
        paymentType: form.paymentType,
        amountPaid: form.amountPaid,
        notes: form.notes,
        internalNotes: form.internalNotes,
        reference: form.reference,
        sendMethod: form.sendMethod,
      });
      toast.success(`Bill ${created.billNumber} created`);
      setCreating(false);
      load();
      setViewing(created);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create bill");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(
    bill: Bill,
    form: {
      patientId: string;
      items: BillItem[];
      invoiceDate: string;
      dueDate: string | null;
      paymentType: PaymentType | null;
      amountPaid: number;
      notes: string | null;
      internalNotes: string | null;
      reference: string | null;
      sendMethod: "whatsapp" | "email" | "none";
    }
  ) {
    setSaving(true);
    try {
      const updated = await updateBill(clinicId, bill.billId, {
        items: form.items.filter((i) => i.description.trim()),
        invoiceDate: form.invoiceDate,
        dueDate: form.dueDate,
        paymentType: form.paymentType,
        amountPaid: form.amountPaid,
        notes: form.notes,
        internalNotes: form.internalNotes,
        reference: form.reference,
        sendMethod: form.sendMethod,
      });
      toast.success(`Bill ${updated.billNumber} updated`);
      setEditing(null);
      load();
      setViewing(updated);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update bill");
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
    await voidBill(clinicId, bill.billId);
    toast.success("Bill voided");
    load();
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

  // Download a single bill as a PDF
  const handleDownloadPdf = async (bill: Bill) => {
    try {
      const filename = `${bill.billNumber.replace(/[^A-Za-z0-9-]+/g, "_")}.pdf`;
      await downloadBillPdf(clinicId, bill.billId, filename);
      toast.success(`Downloaded ${bill.billNumber}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    }
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

  const toggleSort = (field: "createdAt") => {
    if (sortField === field) {
      setSortDesc(!sortDesc);
    } else {
      setSortField(field);
      setSortDesc(true);
    }
  };

  if (creating) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreating(false)}
            className="h-9 gap-1.5"
          >
            <ChevronLeft className="size-4" />
            Back to Bills
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">New Bill</h1>
            <p className="text-sm text-muted-foreground">Create a bill quickly; final totals are computed by the server.</p>
          </div>
        </div>
        <BillForm
          clinicId={clinicId}
          saving={saving}
          onSave={async (form) => {
            await handleCreate(form);
          }}
        />
      </div>
    );
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(null)}
            className="h-9 gap-1.5"
          >
            <ChevronLeft className="size-4" />
            Back to Bills
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Edit Bill</h1>
            <p className="text-sm text-muted-foreground">Update bill details.</p>
          </div>
        </div>
        <BillForm
          clinicId={clinicId}
          initial={editing}
          isEdit
          saving={saving}
          onSave={async (form) => {
            await handleUpdate(editing, form);
          }}
        />
      </div>
    );
  }

  if (viewing) {
    const patientName = patientLookup[viewing.patientId] || viewing.patientId;
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewing(null)}
              className="h-9 gap-1.5"
            >
              <ChevronLeft className="size-4" />
              Back to Bills
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Bill Details</h1>
              <p className="text-sm text-muted-foreground">
                {viewing.billNumber} · {patientName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => handleDownloadPdf(viewing)}
            >
              <Download className="size-4" />
              Download PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => {
                setEditing(viewing);
                setViewing(null);
              }}
            >
              Edit
            </Button>
          </div>
        </div>
        <BillForm
          clinicId={clinicId}
          initial={viewing}
          saving={false}
          readOnly
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Metrics Section */}
      {!loading && (
        <StatsBilling
          bills={items}
          action={
            <Button className="flex items-center gap-1.5 shadow-sm" onClick={() => setCreating(true)}>
              <Plus className="size-4" />
              New Bill
            </Button>
          }
        />
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

      {/* Search Controls - Centered Outside Card */}
      <div className="flex justify-center">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <div className="relative w-full max-w-md sm:w-72">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search bills..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPageIndex(0);
              }}
              className="h-9 w-full pl-9"
            />
          </div>

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
        </div>
      </div>

      {/* Main card containing listing */}
      <Card className="border-border shadow-sm">
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
                <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
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
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <PersonAvatar clinicId={clinicId} ownerType="patient" ownerId={b.patientId} name={patientLookup[b.patientId] || b.patientId} />
                          <span className="text-muted-foreground font-medium">
                            {patientLookup[b.patientId] || b.patientId}
                          </span>
                        </div>
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
                        {formatINR(b.total)}
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={() => handleDownloadPdf(b)}
                      >
                        <Download className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={() => setViewing(b)}
                      >
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={() => setEditing(b)}
                      >
                        Edit
                      </Button>
                      {b.status !== "void" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setVoidTarget(b)}
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
          {!loading && sortedItems.length > 0 && (
            <Pagination
              page={pageIndex + 1}
              pageSize={pageSize}
              totalItems={sortedItems.length}
              onPageChange={(p) => setPageIndex(Math.max(0, Math.min(p - 1, pageCount - 1)))}
              itemLabel="results"
            />
          )}
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        open={voidTarget !== null}
        onOpenChange={(open) => {
          if (!open) setVoidTarget(null);
        }}
        title={`Void bill ${voidTarget?.billNumber ?? ""}?`}
        description="Voiding the bill marks it as cancelled and cannot be undone."
        confirmLabel="Void"
        onConfirm={async () => {
          if (voidTarget) await handleVoid(voidTarget);
        }}
      />
    </div>
  );
}

interface BillFormItem {
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  taxPercent: string;
}

interface BillFormValue {
  patientId: string;
  items: BillItem[];
  invoiceDate: string;
  dueDate: string | null;
  paymentType: PaymentType | null;
  amountPaid: number;
  notes: string | null;
  internalNotes: string | null;
  reference: string | null;
  sendMethod: "whatsapp" | "email" | "none";
}

const emptyItem = (): BillFormItem => ({
  description: "",
  quantity: "1",
  unitPrice: "",
  discount: "0",
  taxPercent: "0",
});

function BillForm({
  clinicId,
  initial,
  saving,
  onSave,
  isEdit,
  readOnly,
}: {
  clinicId: string;
  initial?: Bill;
  saving: boolean;
  onSave?: (form: BillFormValue) => Promise<void>;
  isEdit?: boolean;
  readOnly?: boolean;
}) {
  const [patientId, setPatientId] = useState<string | null>(initial?.patientId ?? null);
  const [invoiceDate, setInvoiceDate] = useState(initial?.invoiceDate?.slice(0, 10) ?? todayISO());
  const [dueDate, setDueDate] = useState(initial?.dueDate?.slice(0, 10) ?? "");
  const [paymentType, setPaymentType] = useState<PaymentType>(initial?.paymentType ?? "cash");
  const [items, setItems] = useState<BillFormItem[]>(
    initial && initial.items.length > 0
      ? initial.items.map((it) => ({
          description: it.description,
          quantity: String(it.quantity),
          unitPrice: String(it.unitPrice),
          discount: String(it.discount ?? 0),
          taxPercent: String(it.taxPercent ?? 0),
        }))
      : [emptyItem()]
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [internalNotes, setInternalNotes] = useState(initial?.internalNotes ?? "");
  const [reference, setReference] = useState(initial?.reference ?? "");
  const [sendMethod, setSendMethod] = useState<"whatsapp" | "email" | "none">(initial?.sendMethod ?? "whatsapp");
  const [amountPaid, setAmountPaid] = useState(initial ? String(initial.amountPaid ?? 0) : "0");
  const [attachName, setAttachName] = useState("");
  const [errors, setErrors] = useState<{ patient?: string; items?: Record<number, string> }>({});

  function setItem(i: number, patch: Partial<BillFormItem>) {
    setItems((list) => list.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  function addItem(description = "") {
    setItems((list) => [...list, { ...emptyItem(), description }]);
  }

  function removeItem(i: number) {
    setItems((list) => (list.length > 1 ? list.filter((_, idx) => idx !== i) : list));
  }

  function setAmountPaidSafe(value: string) {
    const n = Math.max(Number(value) || 0, 0);
    setAmountPaid(String(n));
  }

  // ── Computed totals (client preview; server recomputes on save) ──
  const computed = items.map((it) => {
    const qty = Math.max(Number(it.quantity) || 0, 0);
    const price = Math.max(Number(it.unitPrice) || 0, 0);
    const gross = qty * price;
    const disc = Math.min(Math.max(Number(it.discount) || 0, 0), gross);
    const taxable = gross - disc;
    const taxPct = Math.min(Math.max(Number(it.taxPercent) || 0, 0), 100);
    const tax = taxable * (taxPct / 100);
    return { gross, disc, tax, lineTotal: taxable + tax };
  });

  const subtotal = computed.reduce((s, c) => s + c.gross, 0);
  const discount = computed.reduce((s, c) => s + c.disc, 0);
  const taxAmount = computed.reduce((s, c) => s + c.tax, 0);
  const total = Math.max(subtotal - discount + taxAmount, 0);

  const amountPaidNum = Math.min(Math.max(Number(amountPaid) || 0, 0), total);
  const balanceDue = total - amountPaidNum;
  const derivedStatus: PaymentStatus =
    total <= 0 ? "paid" : amountPaidNum <= 0 ? "unpaid" : amountPaidNum >= total - 0.01 ? "paid" : "partial";

  function selectPaymentStatus(status: PaymentStatus) {
    if (status === "unpaid") setAmountPaid("0");
    else if (status === "paid") setAmountPaid(String(total));
  }

  function resetForm() {
    setPatientId(null);
    setInvoiceDate(todayISO());
    setDueDate("");
    setPaymentType("cash");
    setItems([emptyItem()]);
    setNotes("");
    setInternalNotes("");
    setReference("");
    setSendMethod("none");
    setAmountPaid("0");
    setAttachName("");
    setErrors({});
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: { patient?: string; items?: Record<number, string> } = {};
    if (!patientId) nextErrors.patient = "Please select a patient";

    const itemErrors: Record<number, string> = {};
    items.forEach((it, i) => {
      if (!it.description.trim()) itemErrors[i] = "Required";
      else if (Number(it.quantity) <= 0) itemErrors[i] = "Qty must be ≥ 1";
      else if (Number(it.unitPrice) < 0) itemErrors[i] = "Invalid price";
    });
    if (Object.keys(itemErrors).length) nextErrors.items = itemErrors;

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      toast.error("Please fix the highlighted fields");
      return;
    }
    setErrors({});
    if (!onSave) return;

    const cleanItems: BillItem[] = items.map((it) => ({
      description: it.description.trim(),
      quantity: Number(it.quantity) || 1,
      unitPrice: Math.max(Number(it.unitPrice) || 0, 0),
      discount: Math.max(Number(it.discount) || 0, 0),
      taxPercent: Math.min(Math.max(Number(it.taxPercent) || 0, 0), 100),
      lineTotal: 0,
    }));

    await onSave({
      patientId: patientId!,
      items: cleanItems,
      invoiceDate,
      dueDate: dueDate || null,
      paymentType,
      amountPaid: amountPaidNum,
      notes: notes.trim() || null,
      internalNotes: internalNotes.trim() || null,
      reference: reference.trim() || null,
      sendMethod,
    });
  }

  const sectionTitle = "text-sm font-semibold text-foreground flex items-center gap-2";
  const sectionCard = "rounded-xl border border-border bg-card p-5 shadow-sm";
  const fieldLabel = "text-xs font-medium text-muted-foreground mb-1";

  return (
    <form onSubmit={submit} className="space-y-6">
      <fieldset disabled={readOnly} className="space-y-6 border-0 p-0 m-0">
        {/* ── 1. Bill Information ── */}
        <section className={sectionCard}>
          <header className="mb-4 flex items-center gap-2 border-b border-border pb-3">
            <ReceiptText className="size-4 text-primary" />
            <h2 className={sectionTitle}>Bill Information</h2>
          </header>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-1">
              <Label className={fieldLabel}>Patient *</Label>
              <PatientSelect
                clinicId={clinicId}
                value={patientId}
                onChange={(v) => {
                  setPatientId(v);
                  if (errors.patient) setErrors((prev) => ({ ...prev, patient: undefined }));
                }}
                required
              />
              {errors.patient && (
                <p className="mt-1 text-xs text-destructive">{errors.patient}</p>
              )}
            </div>

            <div>
              <Label className={fieldLabel}>Invoice Date *</Label>
              <Input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                required
              />
            </div>

            <div>
              <Label className={fieldLabel}>
                Due Date <span className="font-normal text-muted-foreground/70">(optional)</span>
              </Label>
              <Input
                type="date"
                value={dueDate}
                min={invoiceDate}
                onChange={(e) => setDueDate(e.target.value)}
                placeholder="Optional"
              />
            </div>

            <div>
              <Label className={fieldLabel}>Bill Number</Label>
              <div className="flex h-9 items-center rounded-md border border-dashed border-border bg-muted/40 px-3 text-sm text-muted-foreground">
                {initial?.billNumber ?? "Auto-generated"}
              </div>
            </div>

            <div>
              <Label className={fieldLabel}>Payment Type *</Label>
              <Select value={paymentType} onValueChange={(v) => setPaymentType((v ?? "cash") as PaymentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className={fieldLabel}>Payment Status</Label>
              <Select
                value={readOnly ? initial?.paymentStatus ?? "unpaid" : derivedStatus}
                onValueChange={(v) => selectPaymentStatus((v ?? "unpaid") as PaymentStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* ── 2. Items ── */}
        <section className={sectionCard}>
          <header className="mb-4 flex items-center gap-2 border-b border-border pb-3">
            <FileText className="size-4 text-primary" />
            <h2 className={sectionTitle}>Items</h2>
          </header>

          <datalist id="bill-item-suggestions">
            {COMMON_ITEMS.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>

          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                  <TableHead className="min-w-44">Description</TableHead>
                  <TableHead className="w-20">Qty</TableHead>
                  <TableHead className="w-24">Unit Price</TableHead>
                  <TableHead className="w-24">Discount</TableHead>
                  <TableHead className="w-20">Tax %</TableHead>
                  <TableHead className="w-28 text-right">Amount</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it, i) => (
                  <TableRow key={i} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <TableCell className="p-1.5 align-middle">
                      <Input
                        className="h-9"
                        placeholder="e.g. Consultation"
                        list="bill-item-suggestions"
                        value={it.description}
                        onChange={(e) => setItem(i, { description: e.target.value })}
                      />
                      {errors.items?.[i] && (
                        <p className="mt-0.5 text-[11px] text-destructive">{errors.items[i]}</p>
                      )}
                    </TableCell>
                    <TableCell className="p-1.5 align-middle">
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        className="h-9"
                        value={it.quantity}
                        onChange={(e) => setItem(i, { quantity: e.target.value })}
                      />
                    </TableCell>
                    <TableCell className="p-1.5 align-middle">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="h-9"
                        placeholder="0.00"
                        value={it.unitPrice}
                        onChange={(e) => setItem(i, { unitPrice: e.target.value })}
                      />
                    </TableCell>
                    <TableCell className="p-1.5 align-middle">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="h-9"
                        placeholder="0"
                        value={it.discount}
                        onChange={(e) => setItem(i, { discount: e.target.value })}
                      />
                    </TableCell>
                    <TableCell className="p-1.5 align-middle">
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          className="h-9 pr-6"
                          placeholder="0"
                          value={it.taxPercent}
                          onChange={(e) => setItem(i, { taxPercent: e.target.value })}
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground">
                          %
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="p-1.5 text-right align-middle">
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {formatINR(computed[i].lineTotal)}
                      </span>
                    </TableCell>
                    <TableCell className="p-1.5 text-right align-middle">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(i)}
                        aria-label="Remove item"
                      >
                        <Trash className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => addItem()}>
              <Plus className="size-4" />
              Add Another Item
            </Button>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_ITEMS.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => addItem(name)}
                  className="rounded-full border border-border bg-muted/30 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── 3. Bill Summary ── */}
        <section className={sectionCard}>
          <header className="mb-4 flex items-center gap-2 border-b border-border pb-3">
            <Info className="size-4 text-primary" />
            <h2 className={sectionTitle}>Bill Summary</h2>
          </header>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SummaryRow label="Subtotal" value={formatINR(subtotal)} />
            <SummaryRow label="Discount" value={`- ${formatINR(discount)}`} />
            <SummaryRow label="Tax" value={formatINR(taxAmount)} />
            <div>
              <Label className={fieldLabel}>Total Amount</Label>
              <div className="flex h-9 items-center rounded-md border border-primary/30 bg-primary/5 px-3 text-sm font-bold text-primary tabular-nums">
                {formatINR(total)}
              </div>
            </div>
            <div>
              <Label className={fieldLabel}>Amount Paid</Label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
                  ₹
                </span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="h-9 pl-7 tabular-nums"
                  value={amountPaid}
                  onChange={(e) => setAmountPaidSafe(e.target.value)}
                />
              </div>
            </div>
            <SummaryRow
              label="Balance Due"
              value={formatINR(balanceDue)}
              strong
              tone={balanceDue > 0 ? "default" : "success"}
            />
          </div>
        </section>

        {/* ── 4. Notes ── */}
        <section className={sectionCard}>
          <header className="mb-4 flex items-center gap-2 border-b border-border pb-3">
            <FileText className="size-4 text-primary" />
            <h2 className={sectionTitle}>Notes</h2>
          </header>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <Label className={fieldLabel}>Bill Notes <span className="font-normal text-muted-foreground/70">(visible to patient)</span></Label>
              <Textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Thank you for visiting our clinic."
              />
            </div>
            <div>
              <Label className={fieldLabel}>Internal Notes <span className="font-normal text-muted-foreground/70">(visible only to staff)</span></Label>
              <Textarea
                rows={3}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Staff-only remarks…"
              />
            </div>
          </div>
        </section>

        {/* ── 5. Additional Options ── */}
        <section className={sectionCard}>
          <header className="mb-4 flex items-center gap-2 border-b border-border pb-3">
            <Paperclip className="size-4 text-primary" />
            <h2 className={sectionTitle}>Additional Options</h2>
            <span className="ml-auto text-xs text-muted-foreground">Optional</span>
          </header>
          <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <Label className={fieldLabel}>Attach Document</Label>
              <div className="flex h-9 items-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-3">
                <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  {attachName || "PDF / JPG / PNG"}
                </span>
                <input
                  id="bill-attachment"
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => setAttachName(e.target.files?.[0]?.name ?? "")}
                />
                <label
                  htmlFor="bill-attachment"
                  className="cursor-pointer text-xs font-medium text-primary"
                >
                  Browse
                </label>
              </div>
            </div>
            <div>
              <Label className={fieldLabel}>Reference</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. Prescription #R-1024"
              />
            </div>
            <div>
              <Label className={fieldLabel}>Send Bill to Patient</Label>
              <Select value={sendMethod} onValueChange={(v) => setSendMethod((v ?? "none") as "whatsapp" | "email" | "none")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="none">Don&apos;t Send</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>
      </fieldset>

      {/* Actions */}
      {!readOnly && (
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 gap-1.5"
            onClick={resetForm}
            disabled={saving}
          >
            <RotateCcw className="size-4" />
            Reset
          </Button>
          <Button type="submit" className="h-10 gap-1.5" disabled={saving}>
            {saving ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                {isEdit ? "Saving..." : "Creating..."}
              </>
            ) : isEdit ? (
              "Save Changes"
            ) : (
              <>
                <Plus className="size-4" />
                Create Bill
              </>
            )}
          </Button>
        </div>
      )}
    </form>
  );
}

function SummaryRow({
  label,
  value,
  strong,
  tone = "default",
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "default" | "success";
}) {
  return (
    <div>
      <Label className="text-xs font-medium text-muted-foreground mb-1">{label}</Label>
      <div
        className={`flex h-9 items-center rounded-md border border-border bg-muted/40 px-3 text-sm tabular-nums ${
          strong ? "font-bold" : ""
        } ${tone === "success" ? "text-success" : "text-foreground"}`}
      >
        {value}
      </div>
    </div>
  );
}