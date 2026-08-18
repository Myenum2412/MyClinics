"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useRequireRole, sessionCan } from "@/hooks/use-clinic-session";
import {
  type Appointment,
  type AppointmentStatus,
  type Patient,
  type Doctor,
  createAppointment,
  deleteAppointment,
  listAppointments,
  updateAppointment,
  // Let's assume listPatients and listDoctors can be fetched
} from "@/lib/clinic-api";
import { TimePicker } from "@/components/ui/time-picker";
import { formatTime } from "@/lib/format-time";
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { DoctorSelect, PatientSelect } from "@/components/clinic/pickers";
import StatsAppointments from "@/components/stats-appointments";
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
  Ellipsis,
  Plus,
  Trash2,
  Download,
  Eye,
  RefreshCw,
  Columns,
  ChevronLeft,
  ChevronRight,
  Phone,
  CalendarCheck,
} from "lucide-react";

const STATUSES: AppointmentStatus[] = ["scheduled", "completed", "cancelled", "no_show"];

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

const STATUS_CLASS: Record<AppointmentStatus, string> = {
  scheduled: "bg-blue-500/10 text-blue-500 border border-blue-500/20",
  completed: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
  cancelled: "bg-rose-500/10 text-rose-500 border border-rose-500/20",
  no_show: "bg-amber-500/10 text-amber-500 border border-amber-500/20",
};

const COLUMN_LABELS: Record<string, string> = {
  dateTime: "Date & Time",
  patient: "Patient",
  doctor: "Doctor",
  reason: "Reason",
  status: "Status",
  alerts: "WhatsApp Alerts",
};

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function AppointmentsPage() {
  const session = useRequireRole("doctor");
  const clinicId = session?.clinicId ?? "";
  const canManage = sessionCan(session, "clinic_admin");

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
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
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
  const [saving, setSaving] = useState(false);
  
  // Detail Modal
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [viewingDetails, setViewingDetails] = useState(false);

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

  const loadData = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      // Fetch appointments, patients, and doctors in parallel
      const [apptsRes, patientsRes, doctorsRes] = await Promise.all([
        listAppointments(clinicId, { limit: 1000 }),
        fetch(`/api/clinics/${clinicId}/patients?limit=1000`).then((r) =>
          r.ok ? r.json() : null
        ),
        fetch(`/api/clinics/${clinicId}/doctors?limit=100`).then((r) =>
          r.ok ? r.json() : null
        ),
      ]);

      setAppointments(apptsRes.items);
      if (patientsRes) {
        setPatients(patientsRes.items || []);
      }
      if (doctorsRes) {
        setDoctors(doctorsRes.items || []);
      }
    } catch {
      toast.error("Failed to load appointments data");
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      const additionalInfo = [
        form.department ? `Department: ${form.department}` : null,
        form.visitType ? `Visit Type: ${form.visitType}` : null,
        form.duration ? `Duration: ${form.duration} min` : null,
        form.priority ? `Priority: ${form.priority}` : null,
        form.symptoms ? `Symptoms: ${form.symptoms}` : null,
        form.previousVisit ? `Previous Visit: ${form.previousVisit}` : null,
        form.reminder ? `Reminder: ${form.reminder}` : null,
        form.whatsappAlert !== undefined ? `WhatsApp Alert: ${form.whatsappAlert ? "Yes" : "No"}` : null,
        form.doctorNotification !== undefined ? `Doctor Notification: ${form.doctorNotification ? "Yes" : "No"}` : null,
      ].filter(Boolean).join("\n");

      const combinedNotes = [form.notes, additionalInfo].filter(Boolean).join("\n\n");

      await createAppointment(clinicId, {
        patientId: form.patientId,
        doctorId: form.doctorId,
        date: form.date,
        time: form.time,
        reason: form.reason || null,
        notes: combinedNotes || null,
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

  async function handleStatus(appointment: Appointment, status: AppointmentStatus) {
    try {
      await updateAppointment(clinicId, appointment.appointmentId, { status });
      toast.success(`Appointment status updated to ${STATUS_LABELS[status]}.`);
      loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update appointment");
    }
  }

  async function handleDelete(appointment: Appointment) {
    const patient = patientMap.get(appointment.patientId);
    const patientLabel = patient ? patient.fullName : appointment.patientId;
    if (!confirm(`Are you sure you want to delete the appointment for ${patientLabel}?`)) return;

    try {
      await deleteAppointment(clinicId, appointment.appointmentId);
      toast.success("Appointment deleted and cancel alerts queued.");
      loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete appointment");
    }
  }

  // Bulk Actions
  function handleBulkExport() {
    const selectedAppts = appointments.filter((a) => selectedIds.has(a.appointmentId));
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selectedAppts, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `appointments_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success(`Exported ${selectedAppts.length} appointments to JSON.`);
  }

  async function handleBulkDelete() {
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} selected appointments?`)) return;

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
      const res = await fetch(`/api/clinics/${clinicId}/appointments/${appt.appointmentId}/notifications`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.notifications || []);
      } else {
        toast.error("Failed to load WhatsApp logs");
      }
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
                <h1 className="text-2xl font-bold text-gray-900">New Appointment</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Schedule a patient visit. Automated WhatsApp alerts will be instantly queued for both patient and doctor.
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
                  Appointment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <NewAppointmentForm
                  clinicId={clinicId}
                  appointments={appointments}
                  patients={patients}
                  doctors={doctors}
                  onSave={async (form) => {
                    await handleCreate(form);
                    setCreating(false);
                  }}
                  saving={saving}
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
      {/* Stats Section with action slot */}
      {!loading && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <StatsAppointments
            appointments={appointments}
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
                onClick={handleBulkDelete}
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
        <CardHeader className="pb-3 border-b border-border bg-muted/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Table Heading */}
            <CardTitle className="font-heading text-lg font-semibold tracking-tight text-foreground">
              Appointments Listing
            </CardTitle>

            {/* Filters / Search Bar */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <div className="relative mx-auto w-full max-w-md sm:w-72">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search name, doctor, reason..."
                  className="h-8 w-full pl-8 text-xs focus-visible:ring-1"
                />
              </div>

              {/* Date Filter */}
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-8 w-36 text-xs focus-visible:ring-1"
              />

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Column Visibility dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger render={
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                    <Columns className="size-3.5" />
                    Columns
                  </Button>
                } />
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuLabel className="text-xs">Toggle Columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {Object.keys(COLUMN_LABELS).map((colKey) => (
                    <DropdownMenuCheckboxItem
                      key={colKey}
                      checked={visibleColumns[colKey]}
                      onCheckedChange={(checked) =>
                        setVisibleColumns((prev) => ({ ...prev, [colKey]: checked }))
                      }
                      className="text-xs"
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
                  <TableRow>
                    <TableHead className="w-12 pl-4">
                      <Checkbox
                        checked={selectedIds.size === filteredAndSortedAppointments.length && filteredAndSortedAppointments.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>

                    {visibleColumns.dateTime && (
                      <TableHead className="w-[180px]">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1 pl-0 text-left font-semibold text-xs text-foreground"
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

                    <TableHead className="w-16 pr-4 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                
                <TableBody>
                  {paginatedAppointments.map((a) => {
                    const patient = patientMap.get(a.patientId);
                    const doctor = doctorMap.get(a.doctorId);
                    const pInitial = patient?.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "P";
                    const dLabel = doctor ? doctor.name : a.doctorId;

                    return (
                      <TableRow key={a.appointmentId} className="hover:bg-muted/10 transition-colors">
                        <TableCell className="pl-4">
                          <Checkbox
                            checked={selectedIds.has(a.appointmentId)}
                            onCheckedChange={() => toggleSelectRow(a.appointmentId)}
                          />
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
                              <div className="flex size-7.5 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                                {pInitial}
                              </div>
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
                            <span className="text-xs font-medium text-foreground">
                              {dLabel}
                            </span>
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
                                className="text-xs gap-1.5 cursor-pointer"
                                onClick={() => {
                                  setSelectedAppt(a);
                                  setViewingDetails(true);
                                }}
                              >
                                <Eye className="size-3.5" />
                                View Details
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                className="text-xs gap-1.5 cursor-pointer"
                                onClick={() => fetchNotificationLogs(a)}
                              >
                                <Bell className="size-3.5 text-primary" />
                                WhatsApp Logs
                              </DropdownMenuItem>

                              {canManage && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-xs gap-1.5 text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                                    onClick={() => handleDelete(a)}
                                  >
                                    <Trash2 className="size-3.5" />
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
        </CardContent>

        {/* Pagination Footer */}
        {!loading && filteredAndSortedAppointments.length > 0 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-muted/5">
            <div className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{(currentPage - 1) * pageSize + 1}</span> to{" "}
              <span className="font-semibold text-foreground">
                {Math.min(currentPage * pageSize, filteredAndSortedAppointments.length)}
              </span>{" "}
              of <span className="font-semibold text-foreground">{filteredAndSortedAppointments.length}</span>{" "}
              appointments
            </div>
            
            <div className="flex items-center gap-2">
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-7 w-20 text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5" className="text-xs">5 / page</SelectItem>
                  <SelectItem value="10" className="text-xs">10 / page</SelectItem>
                  <SelectItem value="25" className="text-xs">25 / page</SelectItem>
                  <SelectItem value="50" className="text-xs">50 / page</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-7"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                <span className="text-xs font-medium px-2">
                  {currentPage} of {totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-7"
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Appointment Details Modal */}
      <Dialog open={viewingDetails} onOpenChange={setViewingDetails}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
            <DialogDescription>Full details and history of the selected appointment slot.</DialogDescription>
          </DialogHeader>
          
          {selectedAppt && (
            <div className="space-y-4 py-3 text-sm">
              <div className="grid grid-cols-2 gap-4 border-b border-border pb-3">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Date</span>
                  <p className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                    <Calendar className="size-4 text-primary" />
                    {selectedAppt.date}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Time</span>
                  <p className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                    <Clock className="size-4 text-primary" />
                    {formatTime(selectedAppt.time)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b border-border pb-3">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Patient Name</span>
                  <p className="font-medium text-foreground mt-0.5">
                    {patientMap.get(selectedAppt.patientId)?.fullName || "Unknown"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Doctor Assigned</span>
                  <p className="font-medium text-foreground mt-0.5">
                    {doctorMap.get(selectedAppt.doctorId)?.name || "Unknown"}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Reason for Visit</span>
                <p className="text-foreground bg-muted/40 p-2.5 rounded border border-border mt-1 whitespace-pre-line">
                  {selectedAppt.reason || "No reason specified."}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Doctor Notes</span>
                <p className="text-muted-foreground bg-muted/20 p-2.5 rounded border border-dashed mt-1 whitespace-pre-line text-xs">
                  {selectedAppt.notes || "No notes added."}
                </p>
              </div>

              <div className="flex justify-between items-center bg-muted/30 px-3 py-2 rounded-lg border border-border text-xs">
                <span className="text-muted-foreground">Internal ID: {selectedAppt.appointmentId}</span>
                <Badge className={STATUS_CLASS[selectedAppt.status]}>
                  {STATUS_LABELS[selectedAppt.status]}
                </Badge>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setViewingDetails(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                const dateFmt = new Date(log.createdAt).toLocaleString();
                const schedFmt = new Date(log.scheduledTime).toLocaleString();

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
                          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-500">
                            <CheckCircle2 className="size-3.5" />
                            Sent
                          </span>
                        )}
                        {log.status === "enqueued" && (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-blue-500">
                            <Loader2 className="size-3.5 animate-spin" />
                            Enqueued
                          </span>
                        )}
                        {log.status === "pending" && (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-amber-500">
                            <Clock className="size-3.5" />
                            Scheduled
                          </span>
                        )}
                        {log.status === "failed" && (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-rose-500">
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
                        <div className="col-span-2 text-rose-500 flex items-start gap-1 mt-1 font-sans">
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
    </div>
  );
}

function NewAppointmentForm({
  clinicId,
  appointments,
  patients,
  doctors,
  onSave,
  saving,
}: {
  clinicId: string;
  appointments: Appointment[];
  patients: Patient[];
  doctors: Doctor[];
  onSave: (form: {
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
  }) => Promise<void>;
  saving: boolean;
}) {
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [department, setDepartment] = useState("");
  const [visitType, setVisitType] = useState("New Visit");
  const [date, setDate] = useState(today());
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState(30);
  const [reason, setReason] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [symptoms, setSymptoms] = useState("");
  const [previousVisit, setPreviousVisit] = useState("");
  const [notes, setNotes] = useState("");
  const [reminder, setReminder] = useState("Same Day");
  const [whatsappAlert, setWhatsappAlert] = useState(true);
  const [doctorNotification, setDoctorNotification] = useState(true);
  const [patientQuery, setPatientQuery] = useState("");
  const [doctorQuery, setDoctorQuery] = useState("");
  const [error, setError] = useState("");
  const [showOptionalInfo, setShowOptionalInfo] = useState(false);

  const selectedPatient = useMemo(
    () => patients.find((p) => p.patientId === patientId) ?? null,
    [patients, patientId]
  );
  const selectedDoctor = useMemo(
    () => doctors.find((d) => d.doctorId === doctorId) ?? null,
    [doctors, doctorId]
  );

  const filteredPatients = useMemo(() => {
    const q = patientQuery.trim().toLowerCase();
    if (!q) return patients.slice(0, 20);
    return patients.filter((p) => p.fullName.toLowerCase().includes(q) || p.mobile.includes(q));
  }, [patients, patientQuery]);

  const filteredDoctors = useMemo(() => {
    const q = doctorQuery.trim().toLowerCase();
    if (!q) return doctors.slice(0, 20);
    return doctors.filter((d) => d.name.toLowerCase().includes(q) || d.specialization?.toLowerCase().includes(q));
  }, [doctors, doctorQuery]);

  const endTime = useMemo(() => {
    if (!time) return "--:--";
    const [hours, minutes] = time.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes + duration;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    const suffix = endHours >= 12 ? "PM" : "AM";
    const h12 = ((endHours + 11) % 12) + 1;
    return `${String(h12).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")} ${suffix}`;
  }, [time, duration]);

  const occupiedSlots = useMemo(() => {
    if (!doctorId || !date) return [] as string[];
    const chosen = appointments.filter((appt) => appt.doctorId === doctorId && appt.date === date);
    return chosen.map((appt) => appt.time).sort();
  }, [appointments, doctorId, date]);

  function timeToMinutes(value: string) {
    if (!value) return 0;
    const [h, m] = value.split(":").map(Number);
    return h * 60 + m;
  }

  function conflictExists() {
    if (!doctorId || !date || !time) return false;
    const slotStart = timeToMinutes(time);
    const slotEnd = slotStart + duration;

    return appointments.some((appt) => {
      if (appt.doctorId !== doctorId || appt.date !== date) return false;
      const apptStart = timeToMinutes(appt.time);
      const apptEnd = apptStart + 30;
      return slotStart < apptEnd && slotEnd > apptStart;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!patientId || !doctorId) {
      setError("Patient and doctor are required.");
      return;
    }
    if (!date || !time) {
      setError("Date and time are required.");
      return;
    }
    if (!reason.trim()) {
      setError("Reason for visit is required.");
      return;
    }
    if (conflictExists()) {
      setError("This doctor already has an appointment at the selected time. Please choose another slot.");
      return;
    }

    await onSave({
      patientId,
      doctorId,
      date,
      time,
      reason,
      notes,
      department,
      visitType,
      duration,
      priority,
      symptoms,
      previousVisit,
      reminder,
      whatsappAlert,
      doctorNotification,
    });
  }

  function resetForm() {
    setPatientId("");
    setDoctorId("");
    setDepartment("");
    setVisitType("New Visit");
    setDate(today());
    setTime("10:00");
    setDuration(30);
    setReason("");
    setPriority("Normal");
    setSymptoms("");
    setPreviousVisit("");
    setNotes("");
    setReminder("Same Day");
    setWhatsappAlert(true);
    setDoctorNotification(true);
    setPatientQuery("");
    setDoctorQuery("");
    setError("");
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* 1. PATIENT & DOCTOR */}
      <Card className="border-blue-200 bg-gradient-to-b from-blue-50/50 to-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-800">
            1. Patient &amp; Doctor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Patient <span className="ml-1 text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  value={selectedPatient ? selectedPatient.fullName : patientQuery}
                  onChange={(e) => {
                    setPatientId("");
                    setPatientQuery(e.target.value);
                  }}
                  onFocus={() => setPatientQuery(selectedPatient?.fullName ?? patientQuery)}
                  placeholder="Search patient"
                  className={`border ${
                    error && !patientId ? "border-red-500 focus:ring-red-500" : "border-blue-200 focus:ring-blue-400"
                  }`}
                />
                {!selectedPatient && filteredPatients.length > 0 && patientQuery.trim() && (
                  <div className="absolute z-20 mt-1 w-full rounded-xl border border-blue-200 bg-white p-1 shadow-xl">
                    {filteredPatients.slice(0, 8).map((p) => (
                      <button
                        key={p.patientId}
                        type="button"
                        onClick={() => {
                          setPatientId(p.patientId);
                          setPatientQuery(p.fullName);
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-xs transition hover:bg-blue-50"
                      >
                        <span className="font-medium text-gray-700">{p.fullName}</span>
                        <span className="text-gray-500">{p.mobile}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Doctor <span className="ml-1 text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  value={selectedDoctor ? selectedDoctor.name : doctorQuery}
                  onChange={(e) => {
                    setDoctorId("");
                    setDoctorQuery(e.target.value);
                  }}
                  onFocus={() => setDoctorQuery(selectedDoctor?.name ?? doctorQuery)}
                  placeholder="Search doctor"
                  className={`border ${
                    error && !doctorId ? "border-red-500 focus:ring-red-500" : "border-blue-200 focus:ring-blue-400"
                  }`}
                />
                {!selectedDoctor && filteredDoctors.length > 0 && doctorQuery.trim() && (
                  <div className="absolute z-20 mt-1 w-full rounded-xl border border-blue-200 bg-white p-1 shadow-xl">
                    {filteredDoctors.slice(0, 8).map((d) => (
                      <button
                        key={d.doctorId}
                        type="button"
                        onClick={() => {
                          setDoctorId(d.doctorId);
                          setDoctorQuery(d.name);
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-xs transition hover:bg-blue-50"
                      >
                        <span className="font-medium text-gray-700">{d.name}</span>
                        <span className="text-gray-500">{d.specialization || "General"}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. VISIT DETAILS */}
      <Card className="border-blue-200 bg-gradient-to-b from-blue-50/50 to-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-800">
            2. Visit Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Department</Label>
              <Input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Optional"
                className="border border-blue-200 focus:ring-blue-400"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Visit Type</Label>
              <Select value={visitType} onValueChange={(value) => setVisitType(value ?? "New Visit")}>
                <SelectTrigger className="border border-blue-200 focus:ring-blue-400">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New Visit">New Visit</SelectItem>
                  <SelectItem value="Follow-up">Follow-up</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Date <span className="ml-1 text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className={`border ${
                  error && !date ? "border-red-500 focus:ring-red-500" : "border-blue-200 focus:ring-blue-400"
                }`}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Time <span className="ml-1 text-red-500">*</span>
              </Label>
              <TimePicker
                value={time}
                onChange={setTime}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Duration</Label>
              <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                <SelectTrigger className="border border-blue-200 focus:ring-blue-400">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[15, 30, 45, 60].map((mins) => (
                    <SelectItem key={mins} value={String(mins)}>{mins} minutes</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Reason for Visit <span className="ml-1 text-red-500">*</span>
              </Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Fever, checkup, follow-up..."
                required
                className={`border ${
                  error && !reason.trim() ? "border-red-500 focus:ring-red-500" : "border-blue-200 focus:ring-blue-400"
                }`}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Priority</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value ?? "Normal")}>
                <SelectTrigger className="border border-blue-200 focus:ring-blue-400">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">End Time</Label>
              <div className="rounded-lg border border-blue-200 bg-blue-50/40 px-3 py-2.5 text-sm text-blue-700">
                {endTime}
              </div>
            </div>
          </div>

          {doctorId && date && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-gray-700">Doctor schedule</p>
                <span className="text-[10px] uppercase tracking-wide text-gray-500">Available / occupied</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00"].map((slot) => {
                  const busy = occupiedSlots.includes(slot);
                  const selected = slot === time;
                  return (
                    <button
                      type="button"
                      key={slot}
                      onClick={() => setTime(slot)}
                      className={`rounded-full border px-2 py-1 text-[10px] font-medium transition ${
                        selected
                          ? "border-blue-600 bg-blue-600 text-white"
                          : busy
                            ? "border-red-200 bg-red-50 text-red-600"
                            : "border-blue-200 bg-white text-blue-700 hover:bg-blue-100"
                      }`}
                    >
{formatTime(slot)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. ADDITIONAL INFORMATION */}
      <Card className="border-blue-200 bg-gradient-to-b from-blue-50/50 to-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold text-gray-800">
              3. Additional Information (Optional)
            </CardTitle>
            <span className="rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[10px] text-blue-700">
              {showOptionalInfo ? "Hide" : "Show"}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <button
            type="button"
            onClick={() => setShowOptionalInfo((v) => !v)}
            className="w-full rounded-lg border border-blue-200 bg-blue-50/40 px-3 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-blue-100"
          >
            {showOptionalInfo ? "Hide optional fields" : "Show optional fields"}
          </button>

          {showOptionalInfo && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-medium text-gray-700">Symptoms</Label>
                <Textarea value={symptoms} onChange={(e) => setSymptoms(e.target.value)} rows={2} className="border border-blue-200 focus:ring-blue-400" placeholder="Brief symptoms or complaints" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Previous Visit</Label>
                <Input value={previousVisit} onChange={(e) => setPreviousVisit(e.target.value)} placeholder="Optional" className="border border-blue-200 focus:ring-blue-400" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Internal Notes</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Staff notes" className="border border-blue-200 focus:ring-blue-400" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. NOTIFICATIONS */}
      <Card className="border-blue-200 bg-gradient-to-b from-blue-50/50 to-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-800">
            4. Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Patient Reminder</Label>
              <Select value={reminder} onValueChange={(value) => setReminder(value ?? "Same Day")}>
                <SelectTrigger className="border border-blue-200 focus:ring-blue-400">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  <SelectItem value="Same Day">Same Day</SelectItem>
                  <SelectItem value="1 Day Before">1 Day Before</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">WhatsApp Alert</Label>
              <Select value={whatsappAlert ? "Yes" : "No"} onValueChange={(v) => setWhatsappAlert(v === "Yes")}>
                <SelectTrigger className="border border-blue-200 focus:ring-blue-400">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Doctor Notification</Label>
              <Select value={doctorNotification ? "Yes" : "No"} onValueChange={(v) => setDoctorNotification(v === "Yes")}>
                <SelectTrigger className="border border-blue-200 focus:ring-blue-400">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            {whatsappAlert || doctorNotification
              ? "Patient and staff notifications will be sent based on the selected reminder and alert preferences."
              : "No notifications will be sent for this appointment."}
          </p>
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="flex gap-3 border-t border-blue-200 pt-8">
        <Button type="button" variant="outline" onClick={resetForm} className="border-blue-300 text-blue-600 hover:bg-blue-50">
          Reset
        </Button>
        <div className="flex-1" />
        <Button type="submit" disabled={saving} className="bg-blue-600 text-white hover:bg-blue-700" size="lg">
          {saving ? "Creating..." : "Create Appointment"}
        </Button>
      </div>
    </form>
  );
}