"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useRequireRole, sessionCan } from "@/hooks/use-clinic-session";
import { useDropdownOptions } from "@/lib/dropdown-options";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import {
  type Appointment,
  type AppointmentStatus,
  type Patient,
  type Doctor,
  createAppointment,
  deleteAppointment,
  listAppointments,
  listDoctors,
  listPatients,
  queueCallNext,
  queueCancel,
  queueComplete,
  queueNoShow,
  updateAppointment,
  getAppointmentNotifications,
} from "@/lib/clinic-api";
import { formatTime } from "@/lib/format-time";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { PersonAvatar } from "@/components/clinic/person-avatar";
import dynamic from "next/dynamic";
import { appointmentStatusTone } from "@/lib/status-styles";
import { formatDateTime, nowMs, todayISO } from "@/lib/datetime";

const StatsAppointments = dynamic(
  () => import("@/components/stats-appointments"),
  { loading: () => <div className="h-[270px]" aria-hidden="true" /> }
);
import {
  AppointmentForm,
  appointmentToForm,
  buildNotes,
  emptyAppointmentForm,
  type AppointmentFormState,
} from "@/components/clinic/appointment-form";
import {
  Calendar,
  Clock,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Bell,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  Download,
  Eye,
  RefreshCw,
  ChevronLeft,
  Phone,
  Pencil,
  ArrowRightCircle,
  Star,
} from "lucide-react";

const STATUSES: AppointmentStatus[] = ["scheduled", "completed", "cancelled", "no_show"];

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
  rescheduled: "Rescheduled",
};

const STATUS_CLASS: Record<AppointmentStatus, string> = {
  scheduled: appointmentStatusTone("scheduled"),
  confirmed: appointmentStatusTone("confirmed"),
  completed: appointmentStatusTone("completed"),
  cancelled: appointmentStatusTone("cancelled"),
  no_show: appointmentStatusTone("no_show"),
  rescheduled: appointmentStatusTone("rescheduled"),
};


export default function AppointmentsPage() {
  const session = useRequireRole("patient");
  const clinicId = session?.clinicId ?? "";
  const { getOptions } = useDropdownOptions(clinicId);
  const canManage = sessionCan(session, "staff");

  const [callingNext, setCallingNext] = useState(false);

  const handleCallNext = async () => {
    if (!clinicId) return;
    setCallingNext(true);
    try {
      const isDoctor = session?.role === "doctor";
      const effectiveDoctorId = isDoctor ? session?.doctorId ?? "" : "";
      await queueCallNext(clinicId, {
        doctorId: effectiveDoctorId || undefined,
        date: todayISO(),
      });
      toast.success("Called next patient");
      loadData();
    } catch {
      toast.error("Failed to call next patient");
    } finally {
      setCallingNext(false);
    }
  };

  // Main Data States
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [dateFilter, setDateFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Table Configuration (Sorting & Columns)
  const [sortField, setSortField] = useState<"date" | "time" | null>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [visibleColumns] = useState<Record<string, boolean>>({
    dateTime: true,
    patient: true,
    doctor: true,
    reason: true,
    status: true,
    alerts: true,
  });

  // Table Selection & Pagination
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal Dialogs
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Appointment | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Detail Modal
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [viewing, setViewing] = useState(false);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);

  // Patient Appointment History (shown in View Appointment)
  const [history, setHistory] = useState<Appointment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Notification Logs Modal
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [selectedApptForLogs, setSelectedApptForLogs] = useState<Appointment | null>(null);
  const [viewingLogs, setViewingLogs] = useState(false);

  // Mappers
  const patientMap = useMemo(() => {
    const map = new Map<string, Patient>();
    for (const p of patients) map.set(p.patientId, p);
    return map;
  }, [patients]);

  const doctorMap = useMemo(() => {
    const map = new Map<string, Doctor>();
    for (const d of doctors) map.set(d.doctorId, d);
    return map;
  }, [doctors]);

  const loadData = useCallback(() => {
    if (!clinicId) return;
    Promise.allSettled([
      listAppointments(clinicId, { limit: 50 }),
      listPatients(clinicId, { limit: 50 }),
      listDoctors(clinicId, { limit: 50 }),
    ]).then(([apptsRes, patientsRes, doctorsRes]) => {
      if (apptsRes.status === "fulfilled") {
        setAppointments(apptsRes.value.items);
      } else {
        toast.error("Failed to load appointments");
      }
      if (patientsRes.status === "fulfilled") {
        setPatients(patientsRes.value.items);
      } else {
        toast.error("Failed to load patients");
      }
      if (doctorsRes.status === "fulfilled") {
        setDoctors(doctorsRes.value.items);
      } else {
        toast.error("Failed to load doctors");
      }
    }).finally(() => setLoading(false));
  }, [clinicId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load patient's appointment history when opening the View modal
  useEffect(() => {
    if (!viewing || !selectedAppt || !clinicId) {
      setHistory([]);
      return;
    }
    let cancelled = false;
    setLoadingHistory(true);
    setHistory([]);
    listAppointments(clinicId, {
      patientId: selectedAppt.patientId,
      limit: 100,
    })
      .then((res) => {
        if (cancelled) return;
        const items = res.items
          .filter((a) => a.appointmentId !== selectedAppt.appointmentId)
          .sort((a, b) =>
            `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)
          );
        setHistory(items);
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
  }, [viewing, selectedAppt, clinicId]);

  // Actions
  async function handleCreate(form: {
    patientId: string;
    doctorId: string;
    date: string;
    time: string;
    reason: string;
    notes: string;
    department?: string;
    visitType?: string;
    duration?: number;
    priority?: string;
    symptoms?: string;
    previousVisit?: string;
    reminder?: string;
    whatsappAlert?: boolean;
    doctorNotification?: boolean;
  }) {
    setSaving(true);
    try {
      await createAppointment(clinicId, {
        patientId: form.patientId,
        doctorId: form.doctorId,
        date: form.date,
        time: form.time,
        reason: form.reason || null,
        notes: buildNotes(form),
      });
      toast.success("Appointment successfully created. WhatsApp alerts queued!");
      setCreating(false);
      loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create appointment");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(appointment: Appointment, form: {
    patientId: string;
    doctorId: string;
    date: string;
    time: string;
    reason: string;
    notes: string;
    department?: string;
    visitType?: string;
    duration?: number;
    priority?: string;
    symptoms?: string;
    previousVisit?: string;
    reminder?: string;
    whatsappAlert?: boolean;
    doctorNotification?: boolean;
  }) {
    setSaving(true);
    try {
      await updateAppointment(clinicId, appointment.appointmentId, {
        patientId: form.patientId,
        doctorId: form.doctorId,
        date: form.date,
        time: form.time,
        reason: form.reason || null,
        notes: buildNotes(form),
      });
      toast.success("Appointment updated successfully.");
      setEditingAppt(null);
      loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update appointment");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(appointment: Appointment, status: AppointmentStatus) {
    if (!status) return;
    const id = appointment.appointmentId;
    try {
      // Queue-aware transitions notify the next waiting patient automatically.
      if (status === "completed") {
        await queueComplete(clinicId, id);
      } else if (status === "no_show") {
        await queueNoShow(clinicId, id);
      } else if (status === "cancelled") {
        await queueCancel(clinicId, id);
      } else {
        await updateAppointment(clinicId, id, { status });
      }
      toast.success(`Appointment marked ${STATUS_LABELS[status]}.`);
      loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update appointment");
    }
  }

  async function handleDelete(appointment: Appointment) {
    await deleteAppointment(clinicId, appointment.appointmentId);
    toast.success("Appointment deleted and cancel alerts queued.");
    loadData();
  }

  // Bulk Actions
  function handleBulkExport() {
    const selectedAppts = appointments.filter((a) => selectedIds.has(a.appointmentId));
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selectedAppts, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `appointments_export_${nowMs()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success(`Exported ${selectedAppts.length} appointments to JSON.`);
  }

  async function handleBulkDelete() {
    let successCount = 0;
    let failCount = 0;

    for (const apptId of selectedIds) {
      try {
        await deleteAppointment(clinicId, apptId);
        successCount++;
      } catch {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully deleted ${successCount} appointments.`);
    }
    if (failCount > 0) {
      toast.error(`Failed to delete ${failCount} appointments.`);
    }

    setSelectedIds(new Set());
    loadData();
  }

  // Row Selection Helpers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedAppointments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedAppointments.map((a) => a.appointmentId)));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // WhatsApp logs fetching
  async function fetchNotificationLogs(appt: Appointment) {
    setSelectedApptForLogs(appt);
    setViewingLogs(true);
    setLoadingLogs(true);
    setLogs([]);
    try {
      const data = await getAppointmentNotifications(clinicId, appt.appointmentId);
      setLogs(data.notifications || []);
    } catch {
      toast.error("Error fetching notification delivery status");
    } finally {
      setLoadingLogs(false);
    }
  }

  // Sorting Handler
  const handleSort = (field: "date" | "time") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Filter & Search Logic
  const filteredAndSortedAppointments = useMemo(() => {
    let list = [...appointments];

    // Filter by Date
    if (dateFilter) {
      list = list.filter((a) => a.date === dateFilter);
    }

    // Filter by Status
    if (statusFilter !== "all") {
      list = list.filter((a) => a.status === statusFilter);
    }

    // Filter by Search Term
    if (searchTerm.trim() !== "") {
      const query = searchTerm.toLowerCase();
      list = list.filter((a) => {
        const patient = patientMap.get(a.patientId);
        const doctor = doctorMap.get(a.doctorId);
        const patientName = patient?.fullName.toLowerCase() || "";
        const doctorName = doctor?.name.toLowerCase() || "";
        const reason = a.reason?.toLowerCase() || "";
        return patientName.includes(query) || doctorName.includes(query) || reason.includes(query);
      });
    }

    // Sort List
    if (sortField) {
      list.sort((a, b) => {
        let valA = a[sortField] || "";
        let valB = b[sortField] || "";
        if (sortOrder === "asc") {
          return valA.localeCompare(valB);
        } else {
          return valB.localeCompare(valA);
        }
      });
    }

    return list;
  }, [appointments, dateFilter, statusFilter, searchTerm, sortField, sortOrder, patientMap, doctorMap]);

  // Paginated List
  const paginatedAppointments = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSortedAppointments.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedAppointments, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAndSortedAppointments.length / pageSize);

  // Status visual badge inside the table rows
  function renderWhatsAppBadgeStatus(apptId: string) {
    // Ideally we can look up if there are any notifications for this appt from a local map,
    // but for simplicity, we can let users click to view logs. Let's make it a nice badge.
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-7 gap-1.5 text-[11px] font-semibold border-dashed hover:bg-muted/50"
        onClick={() => {
          const appt = appointments.find((a) => a.appointmentId === apptId);
          if (appt) fetchNotificationLogs(appt);
        }}
      >
        <Bell className="size-3 text-primary animate-pulse" />
        Delivery Logs
      </Button>
    );
  }

  if (creating) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 border-b border-border bg-background">
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-start gap-4">
              <button
                onClick={() => setCreating(false)}
                className="mt-1 inline-flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-muted"
              >
                <ChevronLeft size={20} className="text-muted-foreground" />
              </button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">New Appointment</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Schedule a patient visit. Automated WhatsApp alerts will be instantly queued for both patient and doctor.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <AppointmentForm
              clinicId={clinicId}
              appointments={appointments}
              patients={patients}
              doctors={doctors}
              initial={emptyAppointmentForm()}
              onSave={async (form) => {
                await handleCreate(form);
                setCreating(false);
              }}
              saving={saving}
            />
          </div>
        </div>
      </div>
    );
  }

  if (editingAppt) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 border-b border-border bg-background">
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-start gap-4">
              <button
                onClick={() => setEditingAppt(null)}
                className="mt-1 inline-flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-muted"
              >
                <ChevronLeft size={20} className="text-muted-foreground" />
              </button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Edit Appointment</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Modify appointment details, patient, doctor, date, and time.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <AppointmentForm
              clinicId={clinicId}
              appointments={appointments}
              patients={patients}
              doctors={doctors}
              initial={appointmentToForm(editingAppt)}
              isEdit
              onSave={async (form) => {
                await handleUpdate(editingAppt, form);
                setEditingAppt(null);
              }}
              saving={saving}
            />
          </div>
        </div>
      </div>
    );
  }

  if (viewing && selectedAppt) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 border-b border-border bg-background">
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-start gap-4">
              <button
                onClick={() => setViewing(false)}
                className="mt-1 inline-flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-muted"
              >
                <ChevronLeft size={20} className="text-muted-foreground" />
              </button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">View Appointment</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Appointment details, patient, doctor, and status.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <AppointmentForm
              clinicId={clinicId}
              appointments={appointments}
              patients={patients}
              doctors={doctors}
              initial={appointmentToForm(selectedAppt)}
              isEdit
              readOnly
              saving={false}
            />

            {/* Patient Appointment History */}
            <Card className="shadow-sm">
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Clock className="size-4 text-primary" />
                  <h2 className="text-base font-semibold text-foreground">
                    Appointment History
                  </h2>
                  {!loadingHistory && history.length > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      {history.length} past
                    </Badge>
                  )}
                </div>

                {loadingHistory ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : history.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No previous appointments for this patient.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                          <TableHead className="w-[120px]">Date</TableHead>
                          <TableHead className="w-[90px]">Time</TableHead>
                          <TableHead className="w-[180px]">Doctor</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead className="w-[140px]">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history.map((h) => {
                          const hDoctor = doctorMap.get(h.doctorId);
                          return (
                            <TableRow
                              key={h.appointmentId}
                              className="cursor-pointer hover:bg-muted/30 transition-colors"
                              onClick={() => {
                                setSelectedAppt(h);
                              }}
                            >
                              <TableCell className="text-xs font-medium">
                                {h.date}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {formatTime(h.time)}
                              </TableCell>
                              <TableCell className="text-xs">
                                {hDoctor?.name || h.doctorId}
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                                {h.reason || "—"}
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLASS[h.status]}`}
                                >
                                  {STATUS_LABELS[h.status]}
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stats Section with action slot - Appointment Analytics with centered search */}
      {!loading && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <StatsAppointments
            appointments={appointments}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            action={
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadData}
                  disabled={loading}
                  className="h-9 gap-1.5"
                >
                  <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
                  Sync
                </Button>

                {canManage && (
                  <Button
                    variant="outline"
                    className="flex items-center gap-1.5 h-9"
                    onClick={handleCallNext}
                    disabled={callingNext}
                  >
                    <ArrowRightCircle className={`size-4 ${callingNext ? "animate-spin" : ""}`} />
                    Call Next Patient
                  </Button>
                )}

                <Button className="flex items-center gap-1.5 shadow-sm h-9" onClick={() => setCreating(true)}>
                  <Plus className="size-4" />
                  New Appointment
                </Button>
              </div>
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
              className="h-7 text-muted-foreground hover:text-foreground text-xs"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear selection
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={handleBulkExport}
            >
              <Download className="size-3.5" />
              Export JSON
            </Button>
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive text-xs"
                onClick={() => setBulkDeleteOpen(true)}
              >
                <Trash2 className="size-3.5" />
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
            <div className="space-y-4 p-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filteredAndSortedAppointments.length === 0 ? (
            <div className="py-16 text-center">
              <Calendar className="size-10 mx-auto text-muted-foreground/45" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">No appointments found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-12 pl-4">
                      <Checkbox
                        checked={selectedIds.size === filteredAndSortedAppointments.length && filteredAndSortedAppointments.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>

                    <TableHead className="w-[90px]">Token #</TableHead>

                    {visibleColumns.dateTime && (
                      <TableHead className="w-[180px]">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1 pl-0 text-xs font-medium tracking-wide text-muted-foreground uppercase hover:text-foreground"
                          onClick={() => handleSort("date")}
                        >
                          Date & Time
                          {sortField === "date" && sortOrder === "asc" && <ChevronUp className="size-3.5" />}
                          {sortField === "date" && sortOrder === "desc" && <ChevronDown className="size-3.5" />}
                        </Button>
                      </TableHead>
                    )}

                    {visibleColumns.patient && <TableHead className="w-[220px]">Patient</TableHead>}
                    {visibleColumns.doctor && <TableHead className="w-[180px]">Doctor</TableHead>}
                    {visibleColumns.reason && <TableHead>Reason</TableHead>}
                    {visibleColumns.status && <TableHead className="w-[140px]">Status</TableHead>}
                    {visibleColumns.alerts && <TableHead className="w-[150px]">WhatsApp Alerts</TableHead>}

                    <TableHead className="w-36 pr-4 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                
                <TableBody>
                  {paginatedAppointments.map((a) => {
                    const patient = patientMap.get(a.patientId);
                    const doctor = doctorMap.get(a.doctorId);
                    const dLabel = doctor ? doctor.name : a.doctorId;

                    return (
                      <TableRow key={a.appointmentId} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="pl-4">
                          <Checkbox
                            checked={selectedIds.has(a.appointmentId)}
                            onCheckedChange={() => toggleSelectRow(a.appointmentId)}
                          />
                        </TableCell>

                        <TableCell className="text-sm font-semibold">
                          {a.tokenNumber != null ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                              #{a.tokenNumber}
                              {a.priority && <Star className="size-3 fill-primary" />}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        {visibleColumns.dateTime && (
                          <TableCell className="font-medium text-xs">
                            <div className="flex flex-col gap-0.5">
                              <span className="flex items-center gap-1">
                                <Calendar className="size-3 text-muted-foreground" />
                                {a.date}
                              </span>
                              <span className="flex items-center gap-1 text-muted-foreground font-normal">
                                <Clock className="size-3 text-muted-foreground" />
                                {formatTime(a.time)}
                              </span>
                            </div>
                          </TableCell>
                        )}

                        {visibleColumns.patient && (
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <PersonAvatar clinicId={clinicId} ownerType="patient" ownerId={a.patientId} name={patient?.fullName || "Unknown Patient"} />
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold text-foreground leading-tight">
                                  {patient?.fullName || "Unknown Patient"}
                                </span>
                                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground font-mono mt-0.5">
                                  <Phone className="size-2.5" />
                                  {patient?.mobile || "No Contact"}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                        )}

                        {visibleColumns.doctor && (
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <PersonAvatar clinicId={clinicId} ownerType="doctor" ownerId={a.doctorId} name={doctor?.name || a.doctorId} />
                              <span className="text-xs font-medium text-foreground">
                                {dLabel}
                              </span>
                            </div>
                          </TableCell>
                        )}

                        {visibleColumns.reason && (
                          <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                            {a.reason || "—"}
                          </TableCell>
                        )}

                        {visibleColumns.status && (
                          <TableCell>
                            <Select
                              value={a.status}
                              onValueChange={(v) => handleStatus(a, v as AppointmentStatus)}
                            >
                              <SelectTrigger className={`h-7 text-[11px] font-semibold w-28 rounded-full ${STATUS_CLASS[a.status]}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUSES.map((s) => (
                                  <SelectItem key={s} value={s} className="text-xs">
                                    {STATUS_LABELS[s]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        )}

                        {visibleColumns.alerts && (
                          <TableCell>
                            {renderWhatsAppBadgeStatus(a.appointmentId)}
                          </TableCell>
                        )}

                        <TableCell className="pr-4">
                          <div className="flex items-center justify-end gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-foreground"
                              aria-label="View details"
                              onClick={() => {
                                setSelectedAppt(a);
                                setViewing(true);
                              }}
                            >
                              <Eye className="size-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-primary hover:text-primary"
                              aria-label="Edit appointment"
                              onClick={() => setEditingAppt(a)}
                            >
                              <Pencil className="size-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              aria-label="Delete appointment"
                              onClick={() => setDeleteTarget(a)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-primary"
                              aria-label="WhatsApp logs"
                              onClick={() => fetchNotificationLogs(a)}
                            >
                              <Bell className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>

        {/* Pagination Footer */}
        {!loading && filteredAndSortedAppointments.length > 0 && (
          <Pagination
            page={currentPage}
            pageSize={pageSize}
            totalItems={filteredAndSortedAppointments.length}
            onPageChange={(p) => setCurrentPage(Math.max(1, Math.min(p, totalPages || 1)))}
            pageSizeOptions={[5, 10, 25, 50]}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            itemLabel="appointments"
          />
        )}
      </Card>

      {/* WhatsApp Logs Modal */}
      <Dialog open={viewingLogs} onOpenChange={setViewingLogs}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="size-5 text-primary animate-bounce" />
              WhatsApp Alerts History
            </DialogTitle>
            <DialogDescription>
              Real-time delivery status of automated event updates and scheduled 1-hour reminders.
            </DialogDescription>
          </DialogHeader>

          {loadingLogs ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="size-8 text-primary animate-spin" />
              <p className="text-xs text-muted-foreground">Loading delivery status logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center">
              <Bell className="size-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm font-medium text-muted-foreground">No alerts have been triggered yet.</p>
              <p className="text-xs text-muted-foreground/80 mt-1">Pending reminders will fire exactly 1 hour before the slot.</p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {logs.map((log) => {
                 const dateFmt = formatDateTime(log.createdAt);
                const schedFmt = formatDateTime(log.scheduledTime);

                return (
                  <div
                    key={log._id}
                    className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-muted/20 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="capitalize text-[10px]">
                          {log.recipientRole}
                        </Badge>
                        <Badge variant="secondary" className="capitalize text-[10px]">
                          {log.type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        {log.status === "sent" && (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-success">
                            <CheckCircle2 className="size-3.5" />
                            Sent
                          </span>
                        )}
                        {log.status === "enqueued" && (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-info">
                            <Loader2 className="size-3.5 animate-spin" />
                            Enqueued
                          </span>
                        )}
                        {log.status === "pending" && (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-warning">
                            <Clock className="size-3.5" />
                            Scheduled
                          </span>
                        )}
                        {log.status === "failed" && (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-destructive">
                            <XCircle className="size-3.5" />
                            Failed
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-foreground font-mono bg-background p-2 rounded border border-border whitespace-pre-wrap">
                      {log.message}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground mt-1 font-mono">
                      <div>
                        <span>Queued:</span> {dateFmt}
                      </div>
                      <div>
                        <span>Send Time:</span> {schedFmt}
                      </div>
                      <div className="col-span-2">
                        <span>Recipient:</span> {log.phone || "No phone registered"}
                      </div>
                      {log.lastError && (
                        <div className="col-span-2 text-destructive flex items-start gap-1 mt-1 font-sans">
                          <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
                          <span>Error: {log.lastError}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setViewingLogs(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete appointment?"
        description={
          deleteTarget
            ? `Are you sure you want to delete the appointment for ${
                patientMap.get(deleteTarget.patientId)?.fullName ??
                deleteTarget.patientId
              }?`
            : undefined
        }
        onConfirm={async () => {
          if (deleteTarget) await handleDelete(deleteTarget);
        }}
      />
      <ConfirmDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`Delete ${selectedIds.size} selected appointments?`}
        description="All selected appointments will be permanently deleted and cancel alerts will be queued."
        onConfirm={async () => {
          await handleBulkDelete();
          setBulkDeleteOpen(false);
        }}
      />
    </div>
  );
}