"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  type Bill,
  type BillItem,
  type PaymentStatus,
  type PaymentType,
  createBill,
  downloadBillPdf,
  listBills,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
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
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Pagination } from "@/components/ui/pagination";
import { RowActions } from "@/components/ui/row-actions";
import { sessionCan } from "@/hooks/use-clinic-session";
import dynamic from "next/dynamic";
import { billStatusTone } from "@/lib/status-styles";
import { formatDate } from "@/lib/format-time";
import { nowMs, todayISO } from "@/lib/datetime";

const StatsBilling = dynamic(() => import("@/components/stats-billing"), {
  loading: () => <div className="h-[270px]" aria-hidden="true" />,
});
const BillingPayoutsChart = dynamic(() => import("@/components/clinic/billing-payouts-chart").then((m) => m.BillingPayoutsChart), {
  loading: () => <div className="h-[360px]" aria-hidden="true" />,
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

function formatINR(value: number): string {
  return `₹${(Number.isFinite(value) ? value : 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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
  const [total, setTotal] = useState(0);
  // Separate, unfiltered snapshot (most recent 100) purely for the revenue stat cards + chart —
  // those need real records to sum, not just a count, so they can't reuse the table's own page.
  const [statsBills, setStatsBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
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

  // Debounced so every keystroke doesn't fire a request.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const loadStatsBills = useCallback(() => {
    if (!clinicId) return;
    listBills(clinicId, { limit: 100 })
      .then((res) => setStatsBills(res.items ?? []))
      .catch(() => {});
  }, [clinicId]);

  const load = useCallback(() => {
    if (!clinicId) return;
    setLoading(true);
    listBills(clinicId, {
      status: statusFilter !== "all" ? statusFilter : undefined,
      q: debouncedSearch || undefined,
      page: pageIndex + 1,
      limit: pageSize,
    })
      .then((res) => {
        setItems(res.items ?? []);
        setTotal(res.total ?? 0);
        setSelectedIds(new Set());
      })
      .catch(() => toast.error("Failed to load bills"))
      .finally(() => {
        setLoading(false);
        setInitialLoading(false);
      });
    loadStatsBills();
  }, [clinicId, statusFilter, debouncedSearch, pageIndex, loadStatsBills]);

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
      const allIds = new Set(sortedItems.map((b) => b.billId));
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
      downloadAnchor.setAttribute("download", `bills_export_${nowMs()}.json`);
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

  // Search/status are applied server-side (see `load`); `items` is already exactly one page.
  // Only the sort-toggle re-orders that page client-side (cheap for ~10 rows, no round trip needed).
  const sortedItems = useMemo(() => {
    if (!sortField) return items;
    return [...items].sort((a, b) => (sortDesc ? b.createdAt.localeCompare(a.createdAt) : a.createdAt.localeCompare(b.createdAt)));
  }, [items, sortField, sortDesc]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

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
      <div className="flex flex-col gap-4 sm:gap-6">
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
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">New Bill</h1>
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
      <div className="flex flex-col gap-4 sm:gap-6">
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
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">Edit Bill</h1>
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
    const patientName = viewing.patientName || "Unknown Patient";
    return (
      <div className="flex flex-col gap-4 sm:gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
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
              <h1 className="text-xl font-bold text-foreground sm:text-2xl">Bill Details</h1>
              <p className="text-sm text-muted-foreground">
                {viewing.billNumber} · {patientName}
              </p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-full justify-center gap-1.5 sm:w-auto"
              onClick={() => handleDownloadPdf(viewing)}
            >
              <Download className="size-4" />
              Download PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-full justify-center gap-1.5 sm:w-auto"
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
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Metrics Section */}
      {!initialLoading && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <StatsBilling
            bills={statsBills}
            searchTerm={searchTerm}
            onSearchChange={(v) => {
              setSearchTerm(v);
              setPageIndex(0);
            }}
            searchPlaceholder="Search bills, patient, status..."
            action={
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex h-9 w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 text-sm sm:w-36">
                    {statusFilter === "all" ? "All Statuses" : statusFilter} <ChevronDown className="size-4 opacity-50" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    {["all","draft","issued","paid","void"].map((s) => (
                      <DropdownMenuItem key={s} onClick={() => { setStatusFilter(s); setPageIndex(0); }}>{s === "all" ? "All Statuses" : s}</DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button className="flex h-9 w-full items-center justify-center gap-1.5 shadow-sm sm:w-auto" onClick={() => setCreating(true)}>
                  <Plus className="size-4" />
                  New Bill
                </Button>
              </div>
            }
          />
        </div>
      )}

      {/* Chart below section card — real data only */}
      {!initialLoading && (
        <Card className="border-border shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <BillingPayoutsChart bills={statsBills} />
          </CardContent>
        </Card>
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
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 sm:p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : sortedItems.length === 0 ? (
            <Empty className="border-none py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon"><ReceiptText /></EmptyMedia>
                <EmptyTitle>{debouncedSearch || statusFilter !== "all" ? "No matching bills" : "No bills yet"}</EmptyTitle>
                <EmptyDescription>
                  {debouncedSearch || statusFilter !== "all"
                    ? "Try a different search term or clear the filters above."
                    : "Bills you create will show up here."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
            {/* Desktop table — hidden on mobile */}
            <div className="hidden overflow-x-auto -mx-6 px-6 md:block">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                  {visibleColumns.select && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          sortedItems.length > 0 &&
                          sortedItems.every((b) => selectedIds.has(b.billId))
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
                {sortedItems.map((b) => (
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
                          <PersonAvatar clinicId={clinicId} ownerType="patient" ownerId={b.patientId} name={b.patientName || "Unknown Patient"} />
                          <span className="text-muted-foreground font-medium">
                            {b.patientName || "Unknown Patient"}
                          </span>
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.createdAt && (
                      <TableCell className="text-muted-foreground">{formatDate(b.createdAt)}</TableCell>
                    )}
                    {visibleColumns.itemsCount && (
                      <TableCell className="text-muted-foreground font-medium">{(b.items ?? []).length}</TableCell>
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
                          <DropdownMenu>
                            <DropdownMenuTrigger className="flex h-7 w-28 items-center justify-between rounded-lg border border-input px-2 text-xs font-semibold">
                              {b.status} <ChevronDown className="size-3 opacity-50" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-28">
                              {(["draft","issued","paid"] as const).map((s) => (
                                <DropdownMenuItem key={s} onClick={() => handleStatus(b, s)}>{s}</DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <RowActions
                        onView={() => setViewing(b)}
                        onEdit={() => setEditing(b)}
                        onDelete={b.status !== "void" ? () => setVoidTarget(b) : undefined}
                        deleteLabel="Void"
                        extraBefore={[{ label: "Download PDF", icon: <Download className="size-3.5" />, onSelect: () => handleDownloadPdf(b) }]}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>

            {/* Mobile card list — visible only on small screens */}
            <div className="space-y-2.5 bg-muted/40 p-3 md:hidden">
              {sortedItems.map((b) => {
                const isSelected = selectedIds.has(b.billId);
                return (
                  <article
                    key={b.billId}
                    className={`overflow-hidden rounded-2xl border bg-card shadow-2xs transition-colors ${
                      isSelected ? "border-primary/50 ring-1 ring-primary/30" : "border-border"
                    }`}
                  >
                    {/* Header: select + patient + total */}
                    <div className="flex items-center gap-2.5 p-3.5 pb-2.5">
                      {visibleColumns.select && (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleToggleSelectRow(b.billId, !!checked)}
                          aria-label={`Select ${b.billNumber}`}
                        />
                      )}
                      <PersonAvatar clinicId={clinicId} ownerType="patient" ownerId={b.patientId} name={b.patientName || "Unknown Patient"} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-foreground">
                          {b.patientName || "Unknown Patient"}
                        </p>
                        {visibleColumns.billNumber && (
                          <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                            {b.billNumber}
                          </p>
                        )}
                      </div>
                      {visibleColumns.total && (
                        <span className="shrink-0 text-sm font-extrabold text-foreground tabular-nums">
                          {formatINR(b.total)}
                        </span>
                      )}
                    </div>

                    {/* Meta: date · items */}
                    <div className="px-3.5">
                      <p className="truncate text-[11px] text-muted-foreground tabular-nums">
                        {visibleColumns.createdAt ? formatDate(b.createdAt) : ""}
                        {visibleColumns.createdAt && visibleColumns.itemsCount ? " · " : ""}
                        {visibleColumns.itemsCount ? `${(b.items ?? []).length} item${(b.items ?? []).length === 1 ? "" : "s"}` : ""}
                      </p>
                    </div>

                    {/* Footer: status + actions */}
                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 px-3.5 py-2.5">
                      {visibleColumns.status && (
                        b.status === "void" ? (
                          <Badge variant="outline" className={STATUS_CLASS.void}>void</Badge>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger className="flex h-8 min-w-28 items-center justify-between rounded-lg border border-input px-2 text-xs font-semibold">
                              {b.status} <ChevronDown className="size-3 opacity-50" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-28">
                              {(["draft","issued","paid"] as const).map((s) => (
                                <DropdownMenuItem key={s} onClick={() => handleStatus(b, s)}>{s}</DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )
                      )}
                      <RowActions
                        onView={() => setViewing(b)}
                        onEdit={() => setEditing(b)}
                        onDelete={b.status !== "void" ? () => setVoidTarget(b) : undefined}
                        deleteLabel="Void"
                        extraBefore={[{ label: "Download PDF", icon: <Download className="size-3.5" />, onSelect: () => handleDownloadPdf(b) }]}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
            </>
          )}

          {/* Pagination Footer */}
          {!loading && total > 0 && (
            <Pagination
              page={pageIndex + 1}
              pageSize={pageSize}
              totalItems={total}
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
    initial && (initial.items ?? []).length > 0
      ? initial.items.map((it) => ({
          description: it.description,
          quantity: String(it.quantity),
          unitPrice: String(it.unitPrice),
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
    const lineTotal = qty * price;
    return { gross: lineTotal, lineTotal };
  });

  const subtotal = computed.reduce((s, c) => s + c.gross, 0);
  const total = Math.max(subtotal, 0);

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
      discount: 0,
      taxPercent: 0,
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
  const sectionCard = "rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5";
  const fieldLabel = "text-xs font-medium text-muted-foreground mb-1";

  return (
    <form onSubmit={submit} className="space-y-4 sm:space-y-6">
      <fieldset disabled={readOnly} className="space-y-4 border-0 p-0 m-0 sm:space-y-6">
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
              <DropdownMenu>
                <DropdownMenuTrigger className="flex h-9 w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 text-sm">
                  {PAYMENT_TYPE_OPTIONS.find(o=>o.value===paymentType)?.label ?? paymentType} <ChevronDown className="size-4 opacity-50" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48">
                  {PAYMENT_TYPE_OPTIONS.map((opt) => (
                    <DropdownMenuItem key={opt.value} onClick={() => setPaymentType(opt.value)}>{opt.label}</DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div>
              <Label className={fieldLabel}>Payment Status</Label>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex h-9 w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 text-sm">
                  {(readOnly ? initial?.paymentStatus ?? "unpaid" : derivedStatus)} <ChevronDown className="size-4 opacity-50" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48">
                  {(["unpaid","partial","paid"] as const).map((s) => (
                    <DropdownMenuItem key={s} onClick={() => selectPaymentStatus(s)}>{s}</DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </section>

        {/* ── 2. Items ── */}
        <section className={sectionCard}>
          <header className="mb-4 flex items-center gap-2 border-b border-border pb-3">
            <FileText className="size-4 text-primary" />
            <h2 className={sectionTitle}>Items</h2>
          </header>



          {/* Desktop items table */}
          <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                  <TableHead className="min-w-44">Description</TableHead>
                  <TableHead className="w-20">Qty</TableHead>
                  <TableHead className="w-24">Unit Price</TableHead>
                  <TableHead className="w-28 text-right">Amount</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it, i) => (
                  <TableRow key={i} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <TableCell className="p-1.5 align-middle">
                      <div className="flex items-center gap-1">
                        <Input
                          className="h-9 flex-1"
                          placeholder="e.g. Consultation"
                          value={it.description}
                          onChange={(e) => setItem(i, { description: e.target.value })}
                        />
                        <DropdownMenu>
                          <DropdownMenuTrigger className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-input bg-transparent">
                            <ChevronDown className="size-4 opacity-50" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-48">
                            {COMMON_ITEMS.map((name) => (
                              <DropdownMenuItem key={name} onClick={() => setItem(i, { description: name })}>{name}</DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
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

          {/* Mobile item cards */}
          <div className="space-y-2.5 md:hidden">
            {items.map((it, i) => (
              <div key={i} className="space-y-2 rounded-xl border border-border bg-background p-3">
                <div className="flex items-center gap-1.5">
                  <Input
                    className="h-10 flex-1"
                    placeholder="e.g. Consultation"
                    value={it.description}
                    onChange={(e) => setItem(i, { description: e.target.value })}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-input bg-transparent">
                      <ChevronDown className="size-4 opacity-50" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {COMMON_ITEMS.map((name) => (
                        <DropdownMenuItem key={name} onClick={() => setItem(i, { description: name })}>{name}</DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {errors.items?.[i] && (
                  <p className="text-[11px] text-destructive">{errors.items[i]}</p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="mb-1 text-[11px] font-medium text-muted-foreground">Qty</Label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      className="h-10"
                      value={it.quantity}
                      onChange={(e) => setItem(i, { quantity: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="mb-1 text-[11px] font-medium text-muted-foreground">Unit Price</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className="h-10"
                      placeholder="0.00"
                      value={it.unitPrice}
                      onChange={(e) => setItem(i, { unitPrice: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-border/60 pt-2">
                  <span className="text-sm font-bold tabular-nums text-foreground">
                    {formatINR(computed[i].lineTotal)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => removeItem(i)}
                  >
                    <Trash className="size-3.5" /> Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => addItem()}>
              <Plus className="size-4" />
              Add Another Item
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-9 items-center gap-1.5 rounded-lg border border-input bg-transparent px-3 text-sm">
                Quick Add <ChevronDown className="size-4 opacity-50" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {COMMON_ITEMS.map((name) => (
                  <DropdownMenuItem key={name} onClick={() => addItem(name)}>{name}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
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
              <DropdownMenu>
                <DropdownMenuTrigger className="flex h-9 w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 text-sm">
                  {sendMethod === "whatsapp" ? "WhatsApp" : sendMethod === "email" ? "Email" : "Don't Send"} <ChevronDown className="size-4 opacity-50" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48">
                  <DropdownMenuItem onClick={() => setSendMethod("whatsapp")}>WhatsApp</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSendMethod("email")}>Email</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSendMethod("none")}>Don&apos;t Send</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </section>
      </fieldset>

      {/* Actions */}
      {!readOnly && (
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full justify-center gap-1.5 sm:w-auto"
            onClick={resetForm}
            disabled={saving}
          >
            <RotateCcw className="size-4" />
            Reset
          </Button>
          <Button type="submit" className="h-10 w-full justify-center gap-1.5 sm:w-auto" disabled={saving}>
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