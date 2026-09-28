"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  type MedicineEntry,
  type Prescription,
  type Patient,
  createPrescription,
  deletePrescription,
  listPrescriptions,
  listPatients,
  API_BASE_URL,
} from "@/lib/clinic-api";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { PersonAvatar } from "@/components/clinic/person-avatar";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
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
import {
  SuggestionInput,
  MedicineNameInput,
  DOSAGE_SUGGESTIONS,
  FREQUENCY_SUGGESTIONS,
  DURATION_SUGGESTIONS,
} from "@/components/clinic/medicine-input";
import { useDropdownOptions } from "@/lib/dropdown-options";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Pagination } from "@/components/ui/pagination";
import { sessionCan } from "@/hooks/use-clinic-session";
import dynamic from "next/dynamic";
import { formatDate } from "@/lib/format-time";
import { nowMs, todayISO, parseDate, formatDateTime } from "@/lib/datetime";

const Stats07 = dynamic(() => import("@/components/stats-07"), {
  loading: () => <div className="h-[270px]" aria-hidden="true" />,
});
import {
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  Ellipsis,
  User,
  Pencil,
  Trash,
  UserCog,
  Search,
  Plus,
  Download,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  FileText,
  MessageSquare,
  Eye,
  Phone,
} from "lucide-react";

interface PrescriptionFormState {
  patientId: string;
  doctorId: string;
  visitDate: string;
  diagnosis: string;
  medicines: MedicineEntry[];
  notes: string;
}

const EMPTY_MEDICINE: MedicineEntry = {
  name: "",
  dosage: "",
  frequency: "",
  duration: "",
  instructions: "",
};


export default function PrescriptionsPage() {
  const session = useRequireRole("patient");
  const clinicId = session?.clinicId ?? "";

  // Core data states
  const [items, setItems] = useState<Prescription[]>([]);
  const [total, setTotal] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  // A bounded, unfiltered patient sample purely for the "mobile coverage" stat card — that needs
  // real records to compute a percentage from, not just a count.
  const [statsPatients, setStatsPatients] = useState<Patient[]>([]);
  const [notificationsMap, setNotificationsMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  // Modal / Form states
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Prescription | null>(null);
  const [viewing, setViewing] = useState<Prescription | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Prescription | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  // Table options (sorting, filtering, selection, visibility, pagination)
  const [sortField, setSortField] = useState<"visitDate" | null>("visitDate");
  const [sortDesc, setSortDesc] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleColumns] = useState<Record<string, boolean>>({
    select: true,
    visitDate: true,
    patient: true,
    doctor: true,
    diagnosis: true,
    medicines: true,
    status: true,
  });
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 8;

  // Debounced so every keystroke doesn't fire a request.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // WhatsApp delivery-log badges — independent of table pagination/search, so it's loaded once
  // rather than being refetched on every keystroke/page change.
  const loadNotifications = useCallback(() => {
    if (!clinicId) return;
    fetch(`${API_BASE_URL}/api/clinics/${clinicId}/prescriptions/notifications`)
      .then((notifRes) => (notifRes.ok ? notifRes.json() : { notifications: [] }))
      .then((notifData) => {
        const map: Record<string, any> = {};
        (notifData.notifications || []).forEach((n: any) => {
          const existing = map[n.prescriptionId];
          const nUpdated = parseDate(n.updatedAt);
          const existingUpdated = existing ? parseDate(existing.updatedAt) : null;
          if (!existing || (nUpdated && existingUpdated && nUpdated > existingUpdated)) {
            map[n.prescriptionId] = n;
          }
        });
        setNotificationsMap(map);
      })
      .catch(() => {});
  }, [clinicId]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Bounded, unfiltered sample for the "mobile coverage" stat card.
  const loadStatsPatients = useCallback(() => {
    if (!clinicId) return;
    listPatients(clinicId, { limit: 100 })
      .then((res) => setStatsPatients(res.items ?? []))
      .catch(() => {});
  }, [clinicId]);

  useEffect(() => {
    loadStatsPatients();
  }, [loadStatsPatients]);

  // Clinic-wide counts for the "Total"/"Today" stat cards — independent of the table's page/search.
  const [globalStats, setGlobalStats] = useState<{ total: number; today: number } | null>(null);
  const loadStats = useCallback(() => {
    if (!clinicId) return;
    Promise.allSettled([
      listPrescriptions(clinicId, { limit: 1 }),
      listPrescriptions(clinicId, { limit: 1, from: todayISO(), to: todayISO() }),
    ]).then(([totalRes, todayRes]) => {
      const count = (r: PromiseSettledResult<any>) => (r.status === "fulfilled" ? r.value?.total ?? 0 : 0);
      setGlobalStats({ total: count(totalRes), today: count(todayRes) });
    });
  }, [clinicId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // The actual table data: real server-side pagination + search.
  const load = useCallback(() => {
    if (!clinicId) return;
    setLoading(true);
    listPrescriptions(clinicId, {
      q: debouncedSearch || undefined,
      page: pageIndex + 1,
      limit: pageSize,
    })
      .then((res) => {
        setItems(res.items ?? []);
        setTotal(res.total ?? 0);
      })
      .catch((e) => toast.error(e?.message || "Failed to load prescriptions"))
      .finally(() => {
        setLoading(false);
        setInitialLoading(false);
      });
  }, [clinicId, debouncedSearch, pageIndex]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(form: PrescriptionFormState) {
    setSaving(true);
    try {
      await createPrescription(clinicId, {
        patientId: form.patientId,
        doctorId: form.doctorId || undefined,
        visitDate: form.visitDate,
        diagnosis: form.diagnosis || null,
        medicines: form.medicines.filter((m) => m.name.trim()),
        notes: form.notes || null,
      });
      toast.success("Prescription created successfully");
      setCreating(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create prescription");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(p: Prescription) {
    await deletePrescription(clinicId, p.prescriptionId);
    toast.success("Prescription deleted successfully");
    // Clean up row selection if deleted
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(p.prescriptionId);
      return next;
    });
    load();
  }

  // Row Selection logic
  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(sortedItems.map((p) => p.prescriptionId));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelectRow = (prescriptionId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(prescriptionId);
      } else {
        next.delete(prescriptionId);
      }
      return next;
    });
  };

  // Bulk actions
  const handleBulkExport = () => {
    const selectedRows = items.filter((p) => selectedIds.has(p.prescriptionId));
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selectedRows, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `prescriptions_export_${nowMs()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success(`Exported ${selectedIds.size} prescriptions.`);
  };

  const handleBulkDelete = async () => {
    try {
      setLoading(true);
      await Promise.all(
        Array.from(selectedIds).map((id) => deletePrescription(clinicId, id))
      );
      toast.success(`Successfully deleted ${selectedIds.size} prescriptions.`);
      setSelectedIds(new Set());
      load();
    } catch (e) {
      if (e instanceof Error) {
        const clinicError = e as { status?: number; code?: string };
        if (clinicError.status) {
          toast.error(`Bulk delete failed (${clinicError.status}): ${e.message}${clinicError.code ? ` [${clinicError.code}]` : ""}`);
        } else {
          toast.error(e.message);
        }
      } else {
        toast.error("Failed to delete selected prescriptions.");
      }
      load();
    } finally {
      setLoading(false);
      setBulkDeleteOpen(false);
    }
  };

  // Detailed logs viewing
  const viewLogs = async (p: Prescription) => {
    setSelectedPrescription(p);
    setLogsOpen(true);
    setLogsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/clinics/${clinicId}/prescriptions/${p.prescriptionId}/notifications`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.notifications || []);
      } else {
        setLogs([]);
      }
    } catch (err) {
      toast.error("Failed to load notification logs");
    } finally {
      setLogsLoading(false);
    }
  };

  // Search is applied server-side (see `load`); `items` is already exactly one page.
  // Only the sort-toggle re-orders that page client-side (cheap for ~8 rows, no round trip needed).
  const sortedItems = useMemo(() => {
    if (!sortField) return items;
    return [...items].sort((a, b) => (sortDesc ? b.visitDate.localeCompare(a.visitDate) : a.visitDate.localeCompare(b.visitDate)));
  }, [items, sortField, sortDesc]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const canManage = sessionCan(session, "clinic_admin");

  const toggleSort = (field: "visitDate") => {
    if (sortField === field) {
      setSortDesc(!sortDesc);
    } else {
      setSortField(field);
      setSortDesc(true);
    }
  };

  if (creating) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 border-b border-border bg-background">
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-start gap-4">
              <button
                onClick={() => setCreating(false)}
                className="mt-1 inline-flex items-center justify-center rounded-lg p-2 hover:bg-muted"
              >
                <ChevronLeft size={20} className="text-muted-foreground" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-foreground sm:text-2xl">Create Prescription</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Write diagnosis and prescribe medication. Respective patients will receive secure automated WhatsApp alerts.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="space-y-6">
            <Card className="border-border bg-gradient-to-b from-muted/50 to-transparent">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-foreground">
                  Prescription Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <PrescriptionForm
                  clinicId={clinicId}
                  doctorId={session?.doctorId ?? ""}
                  saving={saving}
                  onSave={async (form) => {
                    await handleSave(form);
                    setCreating(false);
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 border-b border-border bg-background">
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-start gap-4">
              <button
                onClick={() => setEditing(null)}
                className="mt-1 inline-flex items-center justify-center rounded-lg p-2 hover:bg-muted"
              >
                <ChevronLeft size={20} className="text-muted-foreground" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-foreground sm:text-2xl">Edit Prescription</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Modify the prescription details. Respective patients will receive secure automated WhatsApp alerts on update.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="space-y-6">
            <Card className="border-border bg-gradient-to-b from-muted/50 to-transparent">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-foreground">
                  Prescription Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <PrescriptionForm
                  clinicId={clinicId}
                  doctorId={session?.doctorId ?? ""}
                  initial={{
                    patientId: editing.patientId,
                    doctorId: editing.doctorId ?? "",
                    visitDate: editing.visitDate,
                    diagnosis: editing.diagnosis ?? "",
                    medicines: editing.medicines,
                    notes: editing.notes ?? "",
                  }}
                  isEdit
                  saving={saving}
                  onSave={async (form) => {
                    await handleSave(form);
                    setEditing(null);
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (viewing) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 border-b border-border bg-background">
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-start gap-4">
              <button
                onClick={() => setViewing(null)}
                className="mt-1 inline-flex items-center justify-center rounded-lg p-2 hover:bg-muted"
              >
                <ChevronLeft size={20} className="text-muted-foreground" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-foreground sm:text-2xl">View Prescription</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Read-only view of the prescription details.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="space-y-6">
            <Card className="border-border bg-gradient-to-b from-muted/50 to-transparent">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-foreground">
                  Prescription Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <PrescriptionForm
                  clinicId={clinicId}
                  doctorId={session?.doctorId ?? ""}
                  initial={{
                    patientId: viewing.patientId,
                    doctorId: viewing.doctorId ?? "",
                    visitDate: viewing.visitDate,
                    diagnosis: viewing.diagnosis ?? "",
                    medicines: viewing.medicines,
                    notes: viewing.notes ?? "",
                  }}
                  saving={false}
                  readOnly
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Metrics Section */}
      {!initialLoading && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <Stats07
            prescriptions={items}
            patients={statsPatients}
            stats={globalStats ?? undefined}
            searchTerm={searchTerm}
            onSearchChange={(v) => {
              setSearchTerm(v);
              setPageIndex(0);
            }}
            searchPlaceholder="Search patient, medicine, doctor..."
            action={
              <Button className="flex h-9 w-full items-center justify-center gap-1.5 shadow-sm sm:w-auto" onClick={() => setCreating(true)}>
                <Plus className="size-4" />
                New Prescription
              </Button>
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
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setBulkDeleteOpen(true)}
              >
                <Trash className="size-3.5" />
                Delete Selected
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-4 p-4 sm:p-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : sortedItems.length === 0 ? (
            <Empty className="border-none py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon"><FileText /></EmptyMedia>
                <EmptyTitle>{debouncedSearch ? "No matching prescriptions" : "No prescriptions yet"}</EmptyTitle>
                <EmptyDescription>
                  {debouncedSearch ? "Try a different search term." : "Prescriptions you write will show up here."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
            {/* Desktop table — hidden on mobile */}
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                    {visibleColumns.select && (
                      <TableHead className="w-10 pl-4">
                        <Checkbox
                          checked={selectedIds.size === sortedItems.length && sortedItems.length > 0}
                          indeterminate={selectedIds.size > 0 && selectedIds.size < sortedItems.length}
                          onCheckedChange={(c) => handleToggleSelectAll(c === true)}
                          aria-label="Select all rows"
                        />
                      </TableHead>
                    )}

                    {visibleColumns.visitDate && (
                      <TableHead className="pl-1">
                        <button
                          type="button"
                          onClick={() => toggleSort("visitDate")}
                          className="inline-flex items-center gap-1 text-xs font-medium tracking-wide uppercase text-muted-foreground hover:text-foreground"
                        >
                          Date
                          {sortField === "visitDate" ? (
                            sortDesc ? (
                              <ArrowDown className="size-3.5" />
                            ) : (
                              <ArrowUp className="size-3.5" />
                            )
                          ) : (
                            <ChevronsUpDown className="size-3.5 text-muted-foreground/50" />
                          )}
                        </button>
                      </TableHead>
                    )}

                    {visibleColumns.patient && (
                      <TableHead>
                        Patient
                      </TableHead>
                    )}

                    {visibleColumns.doctor && (
                      <TableHead>
                        Doctor
                      </TableHead>
                    )}

                    {visibleColumns.diagnosis && (
                      <TableHead>
                        Diagnosis
                      </TableHead>
                    )}

                    {visibleColumns.medicines && (
                      <TableHead>
                        Medicines
                      </TableHead>
                    )}

                    {visibleColumns.status && (
                      <TableHead>
                        Notification Status
                      </TableHead>
                    )}

                    <TableHead className="w-10 pr-4">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedItems.map((p) => {
                    const patientLabel = p.patientName || "Unknown Patient";
                    const patientPhone = p.patientPhone || "No phone";
                    const doctorLabel = p.doctorName || "Unknown Doctor";
                    const notif = notificationsMap[p.prescriptionId];

                    return (
                      <TableRow
                        key={p.prescriptionId}
                        data-state={selectedIds.has(p.prescriptionId) ? "selected" : undefined}
                        className="border-b border-border transition-colors hover:bg-muted/30"
                      >
                        {visibleColumns.select && (
                          <TableCell className="pl-4">
                            <Checkbox
                              checked={selectedIds.has(p.prescriptionId)}
                              onCheckedChange={(c) => handleToggleSelectRow(p.prescriptionId, c === true)}
                              aria-label={`Select row`}
                            />
                          </TableCell>
                        )}

                        {visibleColumns.visitDate && (
                          <TableCell className="pl-1 font-medium text-xs tabular-nums text-foreground">
                            {formatDate(p.visitDate)}
                          </TableCell>
                        )}

                        {visibleColumns.patient && (
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <PersonAvatar
                                clinicId={clinicId}
                                ownerType="patient"
                                ownerId={p.patientId}
                                name={patientLabel}
                                className="size-8"
                              />
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold leading-tight text-foreground">
                                  {patientLabel}
                                </p>
                                <p className="truncate text-[10px] text-muted-foreground">
                                  {patientPhone}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                        )}

                        {visibleColumns.doctor && (
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <PersonAvatar clinicId={clinicId} ownerType="doctor" ownerId={p.doctorId} name={doctorLabel} />
                              <span className="text-xs text-foreground font-medium">
                                {doctorLabel}
                              </span>
                            </div>
                          </TableCell>
                        )}

                        {visibleColumns.diagnosis && (
                          <TableCell className="max-w-44 truncate text-xs text-muted-foreground">
                            {p.diagnosis ?? "—"}
                          </TableCell>
                        )}

                        {visibleColumns.medicines && (
                          <TableCell className="max-w-52">
                            <ul className="list-disc pl-4 text-[11px] text-muted-foreground leading-tight space-y-0.5">
                              {(p.medicines ?? []).slice(0, 2).map((m, i) => (
                                <li key={i} className="truncate">
                                  <span className="font-semibold text-foreground/80">{m.name}</span>{" "}
                                  {m.dosage && `(${m.dosage})`}
                                </li>
                              ))}
                              {(p.medicines ?? []).length > 2 && (
                                <li className="list-none text-[10px] text-primary/80 font-medium pl-0">
                                  +{(p.medicines ?? []).length - 2} more items
                                </li>
                              )}
                            </ul>
                          </TableCell>
                        )}

                        {visibleColumns.status && (
                          <TableCell>
                            {notif ? (
                              <div className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium border border-current shadow-sm">
                                {notif.status === "sent" && (
                                  <>
                                    <CheckCircle className="size-3 text-success" />
                                    <span className="text-success capitalize">Sent</span>
                                  </>
                                )}
                                {notif.status === "failed" && (
                                  <>
                                    <XCircle className="size-3 text-destructive" />
                                    <span className="text-destructive capitalize">Failed</span>
                                  </>
                                )}
                                {notif.status === "enqueued" && (
                                  <>
                                    <Loader2 className="size-3 text-yellow-500 animate-spin" />
                                    <span className="text-yellow-700 capitalize">Enqueued</span>
                                  </>
                                )}
                                {notif.status === "pending" && (
                                  <>
                                    <AlertCircle className="size-3 text-warning" />
                                    <span className="text-warning capitalize">Pending</span>
                                  </>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">Not triggered</span>
                            )}
                          </TableCell>
                        )}

                        <TableCell className="pr-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger render={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                              >
                                <Ellipsis className="size-4" />
                              </Button>
                            } />
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setViewing(p);
                                }}
                                className="text-xs"
                              >
                                <FileText className="mr-2 size-3.5 text-muted-foreground" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditing(p);
                                }}
                                className="text-xs"
                              >
                                <Pencil className="mr-2 size-3.5 text-muted-foreground" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => viewLogs(p)}
                                className="text-xs"
                              >
                                <MessageSquare className="mr-2 size-3.5 text-muted-foreground" />
                                Notification Logs
                              </DropdownMenuItem>
                              {canManage && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => setDeleteTarget(p)}
                                    className="text-xs text-destructive"
                                  >
                                    <Trash className="mr-2 size-3.5" />
                                    Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile card list — visible only on small screens */}
            <div className="space-y-2.5 bg-muted/40 p-3 md:hidden">
              {sortedItems.map((p) => {
                const patientLabel = p.patientName || "Unknown Patient";
                const patientPhone = p.patientPhone || "No phone";
                const doctorLabel = p.doctorName || "Unknown Doctor";
                const notif = notificationsMap[p.prescriptionId];
                const isSelected = selectedIds.has(p.prescriptionId);
                return (
                  <article
                    key={p.prescriptionId}
                    className={`overflow-hidden rounded-2xl border bg-card shadow-2xs transition-colors ${
                      isSelected ? "border-primary/50 ring-1 ring-primary/30" : "border-border"
                    }`}
                  >
                    {/* Header: select + patient + date */}
                    <div className="flex items-center gap-2.5 p-3.5 pb-2.5">
                      {visibleColumns.select && (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(c) => handleToggleSelectRow(p.prescriptionId, c === true)}
                          aria-label="Select row"
                        />
                      )}
                      <PersonAvatar
                        clinicId={clinicId}
                        ownerType="patient"
                        ownerId={p.patientId}
                        name={patientLabel}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-foreground">{patientLabel}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Phone className="size-3 shrink-0" />
                          <span className="truncate font-mono">{patientPhone}</span>
                        </p>
                      </div>
                      {visibleColumns.visitDate && (
                        <span className="shrink-0 text-xs font-bold text-foreground tabular-nums">
                          {formatDate(p.visitDate)}
                        </span>
                      )}
                    </div>

                    {/* Doctor + diagnosis */}
                    <div className="px-3.5">
                      {visibleColumns.doctor && (
                        <p className="truncate text-[11px] text-muted-foreground">Dr. {doctorLabel}</p>
                      )}
                      {visibleColumns.diagnosis && p.diagnosis ? (
                        <p className="mt-0.5 truncate text-xs font-medium text-foreground">{p.diagnosis}</p>
                      ) : null}
                    </div>

                    {/* Medicines */}
                    {visibleColumns.medicines && (
                      <ul className="mx-3.5 mt-2 space-y-0.5 rounded-xl bg-muted/60 p-2">
                        {(p.medicines ?? []).map((m, i) => (
                          <li key={i} className="truncate text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground/80">{m.name}</span>
                            {m.dosage ? <span> · {m.dosage}</span> : null}
                            {m.frequency ? <span> · {m.frequency}</span> : null}
                          </li>
                        ))}
                        {(p.medicines ?? []).length === 0 && (
                          <li className="text-xs text-muted-foreground">—</li>
                        )}
                      </ul>
                    )}

                    {/* Footer: notification status + actions */}
                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 px-3.5 py-2.5">
                      {visibleColumns.status && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium">
                          {notif?.status === "sent" && (
                            <><CheckCircle className="size-3.5 text-success" /><span className="text-success">Sent</span></>
                          )}
                          {notif?.status === "failed" && (
                            <><XCircle className="size-3.5 text-destructive" /><span className="text-destructive">Failed</span></>
                          )}
                          {notif?.status === "enqueued" && (
                            <><Loader2 className="size-3.5 animate-spin text-yellow-500" /><span className="text-yellow-700">Enqueued</span></>
                          )}
                          {notif?.status === "pending" && (
                            <><AlertCircle className="size-3.5 text-warning" /><span className="text-warning">Pending</span></>
                          )}
                          {!notif && <span className="text-muted-foreground">Not triggered</span>}
                        </span>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-9 rounded-xl text-muted-foreground"
                          aria-label="View details"
                          onClick={() => setViewing(p)}
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-9 rounded-xl border-primary/20 bg-primary/5 text-primary"
                          aria-label="Edit"
                          onClick={() => setEditing(p)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-9 rounded-xl text-muted-foreground"
                          aria-label="Notification logs"
                          onClick={() => viewLogs(p)}
                        >
                          <MessageSquare className="size-4" />
                        </Button>
                        {canManage && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-9 rounded-xl border-destructive/20 bg-destructive/5 text-destructive"
                            aria-label="Delete"
                            onClick={() => setDeleteTarget(p)}
                          >
                            <Trash className="size-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            </>
          )}

          {/* Table Footer / Pagination */}
          {!loading && total > 0 && (
            <Pagination
              page={pageIndex + 1}
              pageSize={pageSize}
              totalItems={total}
              onPageChange={(p) => setPageIndex(Math.max(0, Math.min(p - 1, pageCount - 1)))}
              itemLabel="prescriptions"
            />
          )}
        </CardContent>
      </Card>


      {/* Modal: Notification logs */}
      <Dialog open={logsOpen} onOpenChange={setLogsOpen}>
        <DialogContent className="max-w-md">
          {selectedPrescription && (
            <>
              <DialogHeader>
                <DialogTitle>Notification History</DialogTitle>
                <DialogDescription>
                  WhatsApp delivery tracking logs for patient: {selectedPrescription.patientName || "Unknown Patient"}
                </DialogDescription>
              </DialogHeader>
              <div className="py-3">
                {logsLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                ) : logs.length === 0 ? (
                  <p className="text-center py-8 text-xs text-muted-foreground">
                    No notifications sent/triggered for this prescription.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {logs.map((log) => {
                      const badgeColors: Record<string, string> = {
                        sent: "bg-success/10 text-success border-success/25",
                        failed: "bg-destructive/10 text-destructive border-destructive/25",
                        enqueued: "bg-yellow-100 text-yellow-800 border-yellow-200",
                        pending: "bg-primary/10 text-primary border-border",
                      };

                      return (
                        <div key={log._id} className="rounded-lg border p-3 text-xs bg-card space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-foreground capitalize">
                              Action: {log.action}
                            </span>
                            <Badge variant="outline" className={badgeColors[log.status] || ""}>
                              {log.status}
                            </Badge>
                          </div>
                           <p className="text-muted-foreground text-[10px]">
                             Triggered: {formatDateTime(log.createdAt)}
                           </p>
                          {log.phone && (
                            <p className="text-[10px] text-foreground">
                              Recipient Phone: <span className="font-mono">{log.phone}</span>
                            </p>
                          )}
                          {log.attempts > 0 && (
                            <p className="text-[10px] text-muted-foreground">
                              Attempts: {log.attempts} / 3
                            </p>
                          )}
                          {log.lastError && (
                            <p className="text-[10px] text-destructive font-medium">
                              Error: {log.lastError}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setLogsOpen(false)} className="w-full">
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete prescription?"
        description="Are you sure you want to delete this prescription? This action cannot be undone."
        onConfirm={async () => {
          if (deleteTarget) await handleDelete(deleteTarget);
        }}
      />
      <ConfirmDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`Delete ${selectedIds.size} selected prescriptions?`}
        description="All selected prescriptions will be permanently deleted."
        onConfirm={async () => {
          await handleBulkDelete();
          setBulkDeleteOpen(false);
        }}
      />
    </div>
  );
}

function PrescriptionForm({
  clinicId,
  doctorId,
  initial,
  saving,
  onSave,
  isEdit,
  readOnly,
}: {
  clinicId: string;
  doctorId: string;
  initial?: PrescriptionFormState;
  saving: boolean;
  onSave?: (form: PrescriptionFormState) => Promise<void>;
  isEdit?: boolean;
  readOnly?: boolean;
}) {
  const [form, setForm] = useState<PrescriptionFormState>(initial || {
    patientId: "",
    doctorId,
    visitDate: todayISO(),
    diagnosis: "",
    medicines: [{ ...EMPTY_MEDICINE }],
    notes: "",
  });
  const { getOptions } = useDropdownOptions(clinicId);

  const set = <K extends keyof PrescriptionFormState>(key: K, value: PrescriptionFormState[K] | null) =>
    setForm((f) => ({ ...f, [key]: (value ?? "") as PrescriptionFormState[K] }));

  function setMedicine(i: number, patch: Partial<MedicineEntry>) {
    setForm((f) => ({
      ...f,
      medicines: f.medicines.map((m, idx) => (idx === i ? { ...m, ...patch } : m)),
    }));
  }

  function addMedicine() {
    setForm((f) => ({ ...f, medicines: [...f.medicines, { ...EMPTY_MEDICINE }] }));
  }

  function removeMedicine(i: number) {
    setForm((f) => ({
      ...f,
      medicines: f.medicines.length > 1 ? f.medicines.filter((_, idx) => idx !== i) : f.medicines,
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.patientId) {
      toast.error("Please select a patient");
      return;
    }
    if (onSave) await onSave(form);
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <fieldset disabled={readOnly} className="space-y-6 border-0 p-0 m-0">
      {/* 1. PATIENT & DIAGNOSIS */}
      <Card className="border-border bg-gradient-to-b from-muted/50 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            1. Patient &amp; Diagnosis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Patient <span className="ml-1 text-destructive">*</span>
              </Label>
              <PatientSelect clinicId={clinicId} value={form.patientId} onChange={(v) => set("patientId", v)} required />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Visit date <span className="ml-1 text-destructive">*</span>
              </Label>
              <Input type="date" value={form.visitDate} onChange={(e) => set("visitDate", e.target.value)} required className="border border-border focus:ring-ring" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Diagnosis</Label>
            <Input value={form.diagnosis} onChange={(e) => set("diagnosis", e.target.value)} placeholder="Diagnosis details..." className="border border-border focus:ring-ring" />
          </div>
        </CardContent>
      </Card>

      {/* 2. MEDICINES */}
      <Card className="border-border bg-gradient-to-b from-muted/50 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold text-foreground">
              2. Medicines List
            </CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addMedicine} className="h-8 border-primary/30 text-primary hover:bg-accent">
              <Plus className="size-3.5" />
              Add Medicine Entry
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {form.medicines.map((m, i) => (
              <div key={i} className="space-y-2 rounded-lg border border-border bg-background p-3">
                <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                  <MedicineNameInput
                    clinicId={clinicId}
                    value={m.name}
                    onChange={(v) => setMedicine(i, { name: v })}
                    required
                  />
                  {form.medicines.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeMedicine(i)} className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive">
                      Remove
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-3">
                  <SuggestionInput
                    value={m.dosage ?? ""}
                    onChange={(v) => setMedicine(i, { dosage: v })}
                    options={DOSAGE_SUGGESTIONS}
                    placeholder="Dosage"
                    className="border border-border focus:ring-ring"
                  />
                  <SuggestionInput
                    value={m.frequency ?? ""}
                    onChange={(v) => setMedicine(i, { frequency: v })}
                    options={FREQUENCY_SUGGESTIONS}
                    placeholder="Frequency"
                    className="border border-border focus:ring-ring"
                  />
                  <SuggestionInput
                    value={m.duration ?? ""}
                    onChange={(v) => setMedicine(i, { duration: v })}
                    options={DURATION_SUGGESTIONS}
                    placeholder="Duration"
                    className="border border-border focus:ring-ring"
                  />
                </div>
                <SuggestionInput
                  value={m.instructions ?? ""}
                  onChange={(v) => setMedicine(i, { instructions: v })}
                  options={getOptions("medicine_instructions")}
                  placeholder="Instructions (e.g. before food)"
                  className="border border-border focus:ring-ring"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 3. NOTES */}
      <Card className="border-border bg-gradient-to-b from-muted/50 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            3. Notes / Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Add doctor instructions..." className="border border-border focus:ring-ring" />
        </CardContent>
      </Card>
      </fieldset>

      {!readOnly && (
        <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:gap-3 sm:pt-8">
          <Button type="button" variant="outline" onClick={() => setForm(initial || { patientId: "", doctorId, visitDate: todayISO(), diagnosis: "", medicines: [{ ...EMPTY_MEDICINE }], notes: "" })} className="w-full justify-center border-primary/30 text-primary hover:bg-accent sm:w-auto">
            Reset
          </Button>
          <div className="hidden flex-1 sm:block" />
          <Button type="submit" disabled={saving} size="lg" className="w-full justify-center sm:w-auto">
            {saving ? "Saving Prescription..." : isEdit ? "Save Changes" : "Save & Queue WhatsApp Alert"}
          </Button>
        </div>
      )}
    </form>
  );
}