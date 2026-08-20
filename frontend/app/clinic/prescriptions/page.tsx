"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  type MedicineEntry,
  type Prescription,
  type Patient,
  type Doctor,
  createPrescription,
  deletePrescription,
  listPrescriptions,
  listPatients,
  listDoctors,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { sessionCan } from "@/hooks/use-clinic-session";
import Stats07 from "@/components/stats-07";
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
} from "lucide-react";

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

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
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
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

  // Patient and Doctor lookup maps
  const patientMap = useMemo(() => {
    const map = new Map<string, Patient>();
    patients.forEach((p) => map.set(p.patientId, p));
    return map;
  }, [patients]);

  const doctorMap = useMemo(() => {
    const map = new Map<string, Doctor>();
    doctors.forEach((d) => map.set(d.doctorId, d));
    return map;
  }, [doctors]);

  const load = useCallback(() => {
    if (!clinicId) return;
    Promise.all([
      listPrescriptions(clinicId, { limit: 500 }),
      listPatients(clinicId, { limit: 500 }),
      listDoctors(clinicId, { limit: 100 }),
    ])
      .then(([prescRes, patientRes, docRes]) => {
        setItems(prescRes.items);
        setPatients(patientRes.items);
        setDoctors(docRes.items);
      })
      .then(() =>
        fetch(`${API_BASE_URL}/api/clinics/${clinicId}/prescriptions/notifications`)
          .then((notifRes) => (notifRes.ok ? notifRes.json() : { notifications: [] }))
          .then((notifData) => {
            const map: Record<string, any> = {};
            (notifData.notifications || []).forEach((n: any) => {
              // Keep the newest notification status per prescription
              if (!map[n.prescriptionId] || new Date(n.updatedAt) > new Date(map[n.prescriptionId].updatedAt)) {
                map[n.prescriptionId] = n;
              }
            });
            setNotificationsMap(map);
          })
      )
      .catch(() => {
        toast.error("Failed to load prescription dashboard data");
      })
      .finally(() => setLoading(false));
  }, [clinicId]);

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
      const allIds = new Set(filteredItems.map((p) => p.prescriptionId));
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
    downloadAnchor.setAttribute("download", `prescriptions_export_${Date.now()}.json`);
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

  // Filtering & Search
  const filteredItems = useMemo(() => {
    return items.filter((p) => {
      const patient = patientMap.get(p.patientId);
      const patientName = patient?.fullName.toLowerCase() ?? "";
      const patientEmail = patient?.email?.toLowerCase() ?? "";
      const patientMobile = patient?.mobile ?? "";
      const diagnosis = p.diagnosis?.toLowerCase() ?? "";
      const doctor = doctorMap.get(p.doctorId)?.name.toLowerCase() ?? "";
      const term = searchTerm.toLowerCase();

      return (
        patientName.includes(term) ||
        patientEmail.includes(term) ||
        patientMobile.includes(term) ||
        diagnosis.includes(term) ||
        doctor.includes(term) ||
        p.visitDate.includes(term)
      );
    });
  }, [items, searchTerm, patientMap, doctorMap]);

  // Sorting
  const sortedItems = useMemo(() => {
    if (!sortField) return filteredItems;

    return [...filteredItems].sort((a, b) => {
      let valA: string = a[sortField] || "";
      let valB: string = b[sortField] || "";

      if (sortField === "visitDate") {
        valA = a.visitDate;
        valB = b.visitDate;
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
      <div className="min-h-screen bg-white">
        <div className="sticky top-0 z-10 border-b border-blue-200 bg-white">
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-start gap-4">
              <button
                onClick={() => setCreating(false)}
                className="mt-1 inline-flex items-center justify-center rounded-lg p-2 hover:bg-blue-100"
              >
                <ChevronLeft size={20} className="text-blue-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Create Prescription</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Write diagnosis and prescribe medication. Respective patients will receive secure automated WhatsApp alerts.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <Card className="border-blue-200 bg-gradient-to-b from-blue-50/50 to-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-gray-800">
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
      <div className="min-h-screen bg-white">
        <div className="sticky top-0 z-10 border-b border-blue-200 bg-white">
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-start gap-4">
              <button
                onClick={() => setEditing(null)}
                className="mt-1 inline-flex items-center justify-center rounded-lg p-2 hover:bg-blue-100"
              >
                <ChevronLeft size={20} className="text-blue-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Edit Prescription</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Modify the prescription details. Respective patients will receive secure automated WhatsApp alerts on update.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <Card className="border-blue-200 bg-gradient-to-b from-blue-50/50 to-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-gray-800">
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
      <div className="min-h-screen bg-white">
        <div className="sticky top-0 z-10 border-b border-blue-200 bg-white">
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-start gap-4">
              <button
                onClick={() => setViewing(null)}
                className="mt-1 inline-flex items-center justify-center rounded-lg p-2 hover:bg-blue-100"
              >
                <ChevronLeft size={20} className="text-blue-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">View Prescription</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Read-only view of the prescription details.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <Card className="border-blue-200 bg-gradient-to-b from-blue-50/50 to-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-gray-800">
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
    <div className="flex flex-col gap-6">
      {/* Metrics Section */}
      {!loading && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <Stats07
            prescriptions={items}
            patients={patients}
            action={
              <Button className="flex items-center gap-1.5 shadow-sm" onClick={() => setCreating(true)}>
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
        <CardHeader className="pb-3 border-b border-border bg-muted/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Table Heading */}
            <CardTitle className="font-heading text-lg font-semibold tracking-tight text-foreground">
              Prescriptions Table
            </CardTitle>

            {/* Filters / Visibility Controls */}
            <div className="flex items-center justify-center gap-2">
              <div className="relative mx-auto w-full max-w-md sm:w-72">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPageIndex(0);
                  }}
                  placeholder="Search patients, doctors..."
                  className="h-8 w-full pl-8 text-xs focus-visible:ring-1"
                />
              </div>

            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-4 p-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : sortedItems.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="size-10 mx-auto text-muted-foreground/45" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">No prescriptions found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                    {visibleColumns.select && (
                      <TableHead className="w-10 pl-4">
                        <Checkbox
                          checked={selectedIds.size === filteredItems.length && filteredItems.length > 0}
                          indeterminate={selectedIds.size > 0 && selectedIds.size < filteredItems.length}
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
                  {paginatedItems.map((p) => {
                    const patient = patientMap.get(p.patientId);
                    const doctor = doctorMap.get(p.doctorId);
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
                                name={patient?.fullName ?? p.patientId}
                                className="size-8"
                              />
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold leading-tight text-foreground">
                                  {patient?.fullName ?? p.patientId}
                                </p>
                                <p className="truncate text-[10px] text-muted-foreground">
                                  {patient?.mobile ?? "No phone"}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                        )}

                        {visibleColumns.doctor && (
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <PersonAvatar clinicId={clinicId} ownerType="doctor" ownerId={p.doctorId} name={doctor?.name || "Unknown Doctor"} />
                              <span className="text-xs text-foreground font-medium">
                                {doctor?.name ?? "—"}
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
                              {p.medicines.slice(0, 2).map((m, i) => (
                                <li key={i} className="truncate">
                                  <span className="font-semibold text-foreground/80">{m.name}</span>{" "}
                                  {m.dosage && `(${m.dosage})`}
                                </li>
                              ))}
                              {p.medicines.length > 2 && (
                                <li className="list-none text-[10px] text-primary/80 font-medium pl-0">
                                  +{p.medicines.length - 2} more items
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
                                    <CheckCircle className="size-3 text-green-500" />
                                    <span className="text-green-700 capitalize">Sent</span>
                                  </>
                                )}
                                {notif.status === "failed" && (
                                  <>
                                    <XCircle className="size-3 text-red-500" />
                                    <span className="text-red-700 capitalize">Failed</span>
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
                                    <AlertCircle className="size-3 text-blue-500" />
                                    <span className="text-blue-700 capitalize">Pending</span>
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
          )}

          {/* Table Footer / Pagination */}
          {!loading && sortedItems.length > 0 && (
            <Pagination
              page={pageIndex + 1}
              pageSize={pageSize}
              totalItems={sortedItems.length}
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
                  WhatsApp delivery tracking logs for patient: {patientMap.get(selectedPrescription.patientId)?.fullName ?? selectedPrescription.patientId}
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
                        sent: "bg-green-100 text-green-800 border-green-200",
                        failed: "bg-red-100 text-red-800 border-red-200",
                        enqueued: "bg-yellow-100 text-yellow-800 border-yellow-200",
                        pending: "bg-blue-100 text-blue-800 border-blue-200",
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
                            Triggered: {new Intl.DateTimeFormat("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }).format(new Date(log.createdAt))}
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
                            <p className="text-[10px] text-red-600 font-medium">
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
    visitDate: today(),
    diagnosis: "",
    medicines: [{ ...EMPTY_MEDICINE }],
    notes: "",
  });

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
      <Card className="border-blue-200 bg-gradient-to-b from-blue-50/50 to-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-800">
            1. Patient &amp; Diagnosis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Patient <span className="ml-1 text-red-500">*</span>
              </Label>
              <PatientSelect clinicId={clinicId} value={form.patientId} onChange={(v) => set("patientId", v)} required />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Visit date <span className="ml-1 text-red-500">*</span>
              </Label>
              <Input type="date" value={form.visitDate} onChange={(e) => set("visitDate", e.target.value)} required className="border border-blue-200 focus:ring-blue-400" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Diagnosis</Label>
            <Input value={form.diagnosis} onChange={(e) => set("diagnosis", e.target.value)} placeholder="Diagnosis details..." className="border border-blue-200 focus:ring-blue-400" />
          </div>
        </CardContent>
      </Card>

      {/* 2. MEDICINES */}
      <Card className="border-blue-200 bg-gradient-to-b from-blue-50/50 to-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold text-gray-800">
              2. Medicines List
            </CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addMedicine} className="h-8 border-blue-300 text-blue-600 hover:bg-blue-50">
              <Plus className="size-3.5" />
              Add Medicine Entry
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {form.medicines.map((m, i) => (
              <div key={i} className="space-y-2 rounded-lg border border-blue-100 bg-white p-3">
                <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                  <Input
                    placeholder="Medicine name"
                    value={m.name}
                    onChange={(e) => setMedicine(i, { name: e.target.value })}
                    required
                    className="border border-blue-200 focus:ring-blue-400"
                  />
                  {form.medicines.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeMedicine(i)} className="h-8 text-xs text-red-600 hover:bg-red-50 hover:text-red-700">
                      Remove
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input placeholder="Dosage" value={m.dosage ?? ""} onChange={(e) => setMedicine(i, { dosage: e.target.value })} className="border border-blue-200 focus:ring-blue-400" />
                  <Input placeholder="Frequency" value={m.frequency ?? ""} onChange={(e) => setMedicine(i, { frequency: e.target.value })} className="border border-blue-200 focus:ring-blue-400" />
                  <Input placeholder="Duration" value={m.duration ?? ""} onChange={(e) => setMedicine(i, { duration: e.target.value })} className="border border-blue-200 focus:ring-blue-400" />
                </div>
                <Input placeholder="Instructions (e.g. before food)" value={m.instructions ?? ""} onChange={(e) => setMedicine(i, { instructions: e.target.value })} className="border border-blue-200 focus:ring-blue-400" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 3. NOTES */}
      <Card className="border-blue-200 bg-gradient-to-b from-blue-50/50 to-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-800">
            3. Notes / Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Add doctor instructions..." className="border border-blue-200 focus:ring-blue-400" />
        </CardContent>
      </Card>
      </fieldset>

      {!readOnly && (
        <div className="flex gap-3 border-t border-blue-200 pt-8">
          <Button type="button" variant="outline" onClick={() => setForm(initial || { patientId: "", doctorId, visitDate: today(), diagnosis: "", medicines: [{ ...EMPTY_MEDICINE }], notes: "" })} className="border-blue-300 text-blue-600 hover:bg-blue-50">
            Reset
          </Button>
          <div className="flex-1" />
          <Button type="submit" disabled={saving} className="bg-blue-600 text-white hover:bg-blue-700" size="lg">
            {saving ? "Saving Prescription..." : isEdit ? "Save Changes" : "Save & Queue WhatsApp Alert"}
          </Button>
        </div>
      )}
    </form>
  );
}