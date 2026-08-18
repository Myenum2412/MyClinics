"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  type Appointment,
  type Bill,
  type MedicalRecord,
  type Patient,
  type Prescription,
  type Report,
  listAppointments,
  listBills,
  listPatients,
  myAppointments,
  myBills,
  myPrescriptions,
  myRecords,
  myReports,
} from "@/lib/clinic-api";
import { formatTime } from "@/lib/format-time";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Search, Download, Calendar, Pill, Receipt, Clipboard, FileBarChart } from "lucide-react";
import StatsGeneric from "@/components/stats-generic";
import { toast } from "sonner";

function today(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ApptStatus({ status }: { status: string }) {
  const classes: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-700 hover:bg-blue-100 border-0",
    completed: "bg-green-100 text-green-700 hover:bg-green-100 border-0",
    cancelled: "bg-red-100 text-red-700 hover:bg-red-100 border-0",
    no_show: "bg-slate-200 text-slate-600 hover:bg-slate-200 border-0",
  };
  return (
    <Badge className={classes[status] ?? "bg-slate-100 text-slate-600 hover:bg-slate-100 border-0"}>
      {status.replace("_", " ")}
    </Badge>
  );
}

export default function ClinicDashboardPage() {
  const session = useRequireRole("patient");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientLookup, setPatientLookup] = useState<Record<string, string>>({});

  // Search, pagination & selection states for staff dashboard
  const [q, setQ] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isPatient = session?.role === "patient";

  const loadStaffStats = useCallback(async (clinicId: string) => {
    const [p, a, b] = await Promise.all([
      listPatients(clinicId, { limit: 100 }),
      listAppointments(clinicId, { date: today(), limit: 100 }),
      listBills(clinicId, { status: "issued", limit: 100 }),
    ]);

    const map: Record<string, string> = {};
    p.items.forEach((pt) => {
      map[pt.patientId] = pt.fullName;
    });

    setPatients(p.items);
    setAppointments(a.items);
    setBills(b.items);
    setPatientLookup(map);
  }, []);

  useEffect(() => {
    if (!session?.clinicId) return;
    if (isPatient) return;
    setLoading(true);
    loadStaffStats(session.clinicId)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session?.clinicId, isPatient, loadStaffStats]);

  // Reset pagination/selection on search
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [q]);

  if (isPatient) {
    return <PatientPortal clinicId={session?.clinicId ?? ""} />;
  }

  // Filter today's appointments
  const filteredAppointments = appointments.filter((a) => {
    if (!q) return true;
    const lower = q.toLowerCase();
    const pName = (patientLookup[a.patientId] || "").toLowerCase();
    return (
      pName.includes(lower) ||
      a.patientId.toLowerCase().includes(lower) ||
      (a.reason && a.reason.toLowerCase().includes(lower))
    );
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredAppointments.length / pageSize);
  const paginatedAppointments = filteredAppointments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedAppointments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedAppointments.map((a) => a.appointmentId)));
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

  const handleBulkExportAppointments = () => {
    const selected = appointments.filter((a) => selectedIds.has(a.appointmentId));
    const mappedSelected = selected.map((a) => ({
      ...a,
      patientName: patientLookup[a.patientId] || "Unknown",
    }));
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(mappedSelected, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `today_appointments_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success(`Exported ${selected.length} appointments to JSON.`);
  };

  // Staff Stats
  const totalPatients = patients.length;
  const totalApptsToday = appointments.length;
  const unpaidTotal = bills.reduce((sum, b) => sum + b.total, 0);

  const stats = [
    {
      name: "Registered Patients",
      percentage: Math.min(100, Math.round((totalPatients / 500) * 100)),
      current: totalPatients,
      allowed: 500,
      allowedLabel: "target limit",
      fill: "var(--chart-1)",
    },
    {
      name: "Appointments Today",
      percentage: Math.min(100, Math.round((totalApptsToday / 50) * 100)),
      current: totalApptsToday,
      allowed: 50,
      allowedLabel: "capacity",
      fill: "var(--chart-2)",
    },
    {
      name: "Outstanding Revenue",
      percentage: Math.min(100, Math.round((unpaidTotal / 100000) * 100)),
      current: `₹${unpaidTotal.toLocaleString("en-IN")}`,
      allowed: "₹1,00,000",
      allowedLabel: "receivable target",
      fill: "var(--chart-3)",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Stats Section */}
      {!loading && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <StatsGeneric
            title="Clinic Overview"
            description="Real-time dashboard analytics tracking registrations, schedules, and active bills."
            items={stats}
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
              onClick={handleBulkExportAppointments}
              className="h-8 gap-1.5 shadow-sm"
            >
              <Download className="size-3.5 text-muted-foreground" />
              Export Selected
            </Button>
          </div>
        </div>
      )}

      {/* Main card containing listing */}
      <Card className="border-border shadow-sm">
        <CardHeader className="border-b border-border bg-muted/20 px-6 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-xl font-semibold text-foreground">
              Today's Scheduled Appointments
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search appointments..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No appointments scheduled for today.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-12 pl-6">
                      <Checkbox
                        checked={selectedIds.size === paginatedAppointments.length && paginatedAppointments.length > 0}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead className="font-semibold text-foreground">Time</TableHead>
                    <TableHead className="font-semibold text-foreground">Patient</TableHead>
                    <TableHead className="font-semibold text-foreground">Reason</TableHead>
                    <TableHead className="font-semibold text-foreground">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAppointments.map((a) => (
                    <TableRow
                      key={a.appointmentId}
                      className="hover:bg-muted/30 border-b border-border last:border-0"
                    >
                      <TableCell className="pl-6">
                        <Checkbox
                          checked={selectedIds.has(a.appointmentId)}
                          onCheckedChange={() => toggleSelectRow(a.appointmentId)}
                          aria-label={`Select appointment for ${patientLookup[a.patientId] || a.patientId}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{formatTime(a.time)}</TableCell>
                      <TableCell>{patientLookup[a.patientId] || a.patientId}</TableCell>
                      <TableCell>{a.reason ?? "—"}</TableCell>
                      <TableCell>
                        <ApptStatus status={a.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-muted/10">
                  <div className="flex flex-1 justify-between sm:hidden">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{" "}
                        <span className="font-medium">
                          {Math.min(currentPage * pageSize, filteredAppointments.length)}
                        </span>{" "}
                        of <span className="font-medium">{filteredAppointments.length}</span> results
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Patient portal dashboard (own data only via /me/*) ─────────────────────

function PatientPortal({ clinicId }: { clinicId: string }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab & Search/Filter states
  const [activeTab, setActiveTab] = useState("appointments");
  const [q, setQ] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!clinicId) return;
    setLoading(true);
    Promise.all([
      myAppointments(clinicId, { limit: 50 }),
      myBills(clinicId, { limit: 50 }),
      myPrescriptions(clinicId, { limit: 50 }),
      myRecords(clinicId, { limit: 50 }),
      myReports(clinicId, { limit: 50 }),
    ])
      .then(([a, b, p, r, rep]) => {
        setAppointments(a.items);
        setBills(b.items);
        setPrescriptions(p.items);
        setRecords(r.items);
        setReports(rep.items);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clinicId]);

  // Reset tab specific states
  useEffect(() => {
    setQ("");
    setSelectedIds(new Set());
    setCurrentPage(1);
  }, [activeTab]);

  // 1. Appointments Filter & Export
  const filteredAppointments = useMemo(() => {
    if (!q) return appointments;
    const lower = q.toLowerCase();
    return appointments.filter(
      (a) =>
        (a.reason && a.reason.toLowerCase().includes(lower)) ||
        a.date.includes(lower)
    );
  }, [appointments, q]);

  // 2. Prescriptions Filter & Export
  const filteredPrescriptions = useMemo(() => {
    if (!q) return prescriptions;
    const lower = q.toLowerCase();
    return prescriptions.filter(
      (p) =>
        p.medicines.some((m) => m.name.toLowerCase().includes(lower)) ||
        (p.diagnosis && p.diagnosis.toLowerCase().includes(lower))
    );
  }, [prescriptions, q]);

  // 3. Medical Records Filter & Export
  const filteredRecords = useMemo(() => {
    if (!q) return records;
    const lower = q.toLowerCase();
    return records.filter(
      (r) =>
        r.diagnosis.toLowerCase().includes(lower) ||
        (r.treatment && r.treatment.toLowerCase().includes(lower))
    );
  }, [records, q]);

  // 4. Bills Filter & Export
  const filteredBills = useMemo(() => {
    if (!q) return bills;
    const lower = q.toLowerCase();
    return bills.filter((b) => b.billNumber.toLowerCase().includes(lower));
  }, [bills, q]);

  // 5. Reports Filter & Export
  const filteredReports = useMemo(() => {
    if (!q) return reports;
    const lower = q.toLowerCase();
    return reports.filter(
      (r) =>
        r.title.toLowerCase().includes(lower) ||
        r.type.toLowerCase().includes(lower)
    );
  }, [reports, q]);

  // Get active items list based on selected Tab
  const activeTabItems = useMemo(() => {
    if (activeTab === "appointments") return filteredAppointments;
    if (activeTab === "prescriptions") return filteredPrescriptions;
    if (activeTab === "records") return filteredRecords;
    if (activeTab === "bills") return filteredBills;
    return filteredReports;
  }, [activeTab, filteredAppointments, filteredPrescriptions, filteredRecords, filteredBills, filteredReports]);

  // Get key identifier for selection
  const getActiveTabItemId = useCallback((item: any) => {
    if (activeTab === "appointments") return item.appointmentId;
    if (activeTab === "prescriptions") return item.prescriptionId;
    if (activeTab === "records") return item.recordId;
    if (activeTab === "bills") return item.billId;
    return item.reportId;
  }, [activeTab]);

  // Paginated active items
  const totalPages = Math.ceil(activeTabItems.length / pageSize);
  const paginatedItems = useMemo(() => {
    return activeTabItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [activeTabItems, currentPage, pageSize]);

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedItems.map((item) => getActiveTabItemId(item))));
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

  const handleExportActiveTab = () => {
    let itemsToExport: any[] = [];
    if (activeTab === "appointments") {
      itemsToExport = appointments.filter((a) => selectedIds.has(a.appointmentId));
    } else if (activeTab === "prescriptions") {
      itemsToExport = prescriptions.filter((p) => selectedIds.has(p.prescriptionId));
    } else if (activeTab === "records") {
      itemsToExport = records.filter((r) => selectedIds.has(r.recordId));
    } else if (activeTab === "bills") {
      itemsToExport = bills.filter((b) => selectedIds.has(b.billId));
    } else {
      itemsToExport = reports.filter((r) => selectedIds.has(r.reportId));
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(itemsToExport, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `my_${activeTab}_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success(`Exported ${itemsToExport.length} items to JSON.`);
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Patient Header Card */}
      <Card className="border-border bg-gradient-to-r from-primary/10 to-primary/5 shadow-sm">
        <CardHeader className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-primary p-3 text-primary-foreground">
              <Calendar className="size-6" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                Patient Portal
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                View your medical history, prescriptions, bills, and schedule appointments.
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
          <TabsList className="bg-muted p-1 rounded-lg">
            <TabsTrigger value="appointments" className="gap-2"><Calendar className="size-4" /> Appointments</TabsTrigger>
            <TabsTrigger value="prescriptions" className="gap-2"><Pill className="size-4" /> Prescriptions</TabsTrigger>
            <TabsTrigger value="records" className="gap-2"><Clipboard className="size-4" /> Medical Records</TabsTrigger>
            <TabsTrigger value="bills" className="gap-2"><Receipt className="size-4" /> Bills</TabsTrigger>
            <TabsTrigger value="reports" className="gap-2"><FileBarChart className="size-4" /> Reports</TabsTrigger>
          </TabsList>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${activeTab}...`}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

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
                onClick={handleExportActiveTab}
                className="h-8 gap-1.5 shadow-sm"
              >
                <Download className="size-3.5 text-muted-foreground" />
                Export Selected
              </Button>
            </div>
          </div>
        )}

        <Card className="border-border shadow-sm p-0 overflow-hidden">
          <CardContent className="p-0">
            {activeTabItems.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No items found.
              </div>
            ) : (
              <>
                {/* 1. Appointments content */}
                {activeTab === "appointments" && (
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="w-12 pl-6">
                          <Checkbox
                            checked={selectedIds.size === paginatedItems.length && paginatedItems.length > 0}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead className="font-semibold text-foreground">Date</TableHead>
                        <TableHead className="font-semibold text-foreground">Time</TableHead>
                        <TableHead className="font-semibold text-foreground">Reason</TableHead>
                        <TableHead className="font-semibold text-foreground">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedItems.map((a: any) => (
                        <TableRow key={a.appointmentId} className="hover:bg-muted/30 border-b border-border last:border-0">
                          <TableCell className="pl-6">
                            <Checkbox
                              checked={selectedIds.has(a.appointmentId)}
                              onCheckedChange={() => toggleSelectRow(a.appointmentId)}
                            />
                          </TableCell>
                          <TableCell className="font-medium text-foreground">{a.date}</TableCell>
                          <TableCell>{formatTime(a.time)}</TableCell>
                          <TableCell>{a.reason ?? "—"}</TableCell>
                          <TableCell>
                            <ApptStatus status={a.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {/* 2. Prescriptions content */}
                {activeTab === "prescriptions" && (
                  <div className="p-6 space-y-4">
                    {paginatedItems.map((p: any) => (
                      <div
                        key={p.prescriptionId}
                        className="rounded-xl border border-border p-4 hover:border-primary/40 transition-colors flex items-start gap-4"
                      >
                        <Checkbox
                          checked={selectedIds.has(p.prescriptionId)}
                          onCheckedChange={() => toggleSelectRow(p.prescriptionId)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground text-base">
                              Visit Date: {formatDate(p.visitDate)}
                            </span>
                            <Badge variant="outline" className="border-border">
                              {p.medicines.length} medicine(s)
                            </Badge>
                          </div>
                          {p.diagnosis && (
                            <p className="mt-2 text-sm text-muted-foreground font-medium">
                              Diagnosis: <span className="text-foreground">{p.diagnosis}</span>
                            </p>
                          )}
                          <div className="mt-3 bg-muted/30 rounded-lg p-3 border border-border/50">
                            <ul className="grid gap-2 sm:grid-cols-2 text-xs">
                              {p.medicines.map((m: any, i: number) => (
                                <li key={i} className="flex flex-col gap-0.5 border-b border-border/30 pb-2 last:border-0 last:pb-0">
                                  <span className="font-semibold text-foreground">{m.name}</span>
                                  <span className="text-muted-foreground">
                                    {m.dosage ? `${m.dosage}` : "N/A"} • {m.frequency ? `${m.frequency}` : "N/A"} • {m.duration ? `${m.duration}` : "N/A"}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. Medical Records content */}
                {activeTab === "records" && (
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="w-12 pl-6">
                          <Checkbox
                            checked={selectedIds.size === paginatedItems.length && paginatedItems.length > 0}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead className="font-semibold text-foreground">Date</TableHead>
                        <TableHead className="font-semibold text-foreground">Diagnosis</TableHead>
                        <TableHead className="font-semibold text-foreground">Treatment</TableHead>
                        <TableHead className="font-semibold text-foreground">Symptoms</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedItems.map((r: any) => (
                        <TableRow key={r.recordId} className="hover:bg-muted/30 border-b border-border last:border-0">
                          <TableCell className="pl-6">
                            <Checkbox
                              checked={selectedIds.has(r.recordId)}
                              onCheckedChange={() => toggleSelectRow(r.recordId)}
                            />
                          </TableCell>
                          <TableCell className="font-medium text-foreground">{formatDate(r.visitDate)}</TableCell>
                          <TableCell className="font-semibold text-foreground">{r.diagnosis}</TableCell>
                          <TableCell>{r.treatment ?? "—"}</TableCell>
                          <TableCell>{r.symptoms ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {/* 4. Bills content */}
                {activeTab === "bills" && (
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="w-12 pl-6">
                          <Checkbox
                            checked={selectedIds.size === paginatedItems.length && paginatedItems.length > 0}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead className="font-semibold text-foreground">Bill No.</TableHead>
                        <TableHead className="font-semibold text-foreground">Date</TableHead>
                        <TableHead className="font-semibold text-foreground">Total</TableHead>
                        <TableHead className="font-semibold text-foreground">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedItems.map((b: any) => (
                        <TableRow key={b.billId} className="hover:bg-muted/30 border-b border-border last:border-0">
                          <TableCell className="pl-6">
                            <Checkbox
                              checked={selectedIds.has(b.billId)}
                              onCheckedChange={() => toggleSelectRow(b.billId)}
                            />
                          </TableCell>
                          <TableCell className="font-medium text-foreground">{b.billNumber}</TableCell>
                          <TableCell>{formatDate(b.createdAt)}</TableCell>
                          <TableCell className="font-semibold text-foreground">₹{b.total.toLocaleString("en-IN")}</TableCell>
                          <TableCell>
                            <ApptStatus status={b.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {/* 5. Reports content */}
                {activeTab === "reports" && (
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="w-12 pl-6">
                          <Checkbox
                            checked={selectedIds.size === paginatedItems.length && paginatedItems.length > 0}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead className="font-semibold text-foreground">Title</TableHead>
                        <TableHead className="font-semibold text-foreground">Type</TableHead>
                        <TableHead className="font-semibold text-foreground">Date</TableHead>
                        <TableHead className="font-semibold text-foreground">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedItems.map((r: any) => (
                        <TableRow key={r.reportId} className="hover:bg-muted/30 border-b border-border last:border-0">
                          <TableCell className="pl-6">
                            <Checkbox
                              checked={selectedIds.has(r.reportId)}
                              onCheckedChange={() => toggleSelectRow(r.reportId)}
                            />
                          </TableCell>
                          <TableCell className="font-medium text-foreground">{r.title}</TableCell>
                          <TableCell>{r.type}</TableCell>
                          <TableCell>{formatDate(r.createdAt)}</TableCell>
                          <TableCell>
                            <ApptStatus status={r.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {/* Generic Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-muted/10">
                    <div className="flex flex-1 justify-between sm:hidden">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{" "}
                          <span className="font-medium">
                            {Math.min(currentPage * pageSize, activeTabItems.length)}
                          </span>{" "}
                          of <span className="font-medium">{activeTabItems.length}</span> results
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}