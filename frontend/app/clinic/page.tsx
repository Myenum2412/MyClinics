"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  type Appointment,
  type Bill,
  type MedicineRecord,
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
import { Search, Download, Calendar, Pill, Receipt, Clipboard, FileBarChart, Bell, Plus, Users, CreditCard, TrendingUp, Activity, ArrowRight, UserPlus, FileText, AlertCircle, Phone, Mail, Clock, ChevronDown } from "lucide-react";
import StatsGeneric from "@/components/stats-generic";
import { DoctorDashboard } from "@/components/clinic/doctor-dashboard";
import { PersonAvatar } from "@/components/clinic/person-avatar";
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

  const loadStaffStats = useCallback((clinicId: string) => {
    return Promise.all([
      listPatients(clinicId, { limit: 100 }),
      listAppointments(clinicId, { date: today(), limit: 100 }),
      listBills(clinicId, { status: "issued", limit: 100 }),
    ]).then(([p, a, b]) => {
      const map: Record<string, string> = {};
      p.items.forEach((pt) => {
        map[pt.patientId] = pt.fullName;
      });

      setPatients(p.items);
      setAppointments(a.items);
      setBills(b.items);
      setPatientLookup(map);
    });
  }, []);

  useEffect(() => {
    if (!session?.clinicId) return;
    if (isPatient) return;
    loadStaffStats(session.clinicId)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session?.clinicId, isPatient, loadStaffStats]);

  const handleSearchChange = (v: string) => {
    setQ(v);
    setCurrentPage(1);
    setSelectedIds(new Set());
  };

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

  const totalPatients = patients.length;
  const totalApptsToday = appointments.length;
  const unpaidTotal = bills.reduce((sum, b) => sum + b.total, 0);

  // Staff Stats
  const stats = useMemo(() => {
    return [
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
  }, [patients, appointments, bills]);

  if (isPatient) {
    return <PatientPortal clinicId={session?.clinicId ?? ""} />;
  }

  if (session?.role === "doctor") {
    return <DoctorDashboard clinicId={session?.clinicId ?? ""} />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
      {/* Top Navigation Bar inside the page (per instructions to create it) */}
      <div className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-slate-900 hidden sm:block">Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 sm:flex">
            <Calendar className="size-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">{formatDate(today())}</span>
            <ChevronDown className="size-4 text-slate-400" />
          </div>
          <Button className="bg-blue-600 text-white hover:bg-blue-700 shadow-sm gap-1.5 h-9 rounded-md">
            <Plus className="size-4" />
            <span className="hidden sm:inline">New Appointment</span>
          </Button>
        </div>
      </div>

      <div className="p-4 md:p-6 lg:p-8 flex flex-col gap-6 max-w-[1400px] mx-auto w-full">
        {/* Dashboard Header */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Good Morning, Admin! 👋</h2>
          <p className="mt-1 text-sm text-slate-500">Here's what's happening in Smilies Clinic today.</p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Patients */}
          <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">Total Patients</p>
                  <h3 className="mt-2 text-3xl font-bold text-slate-900">{totalPatients}</h3>
                </div>
                <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Users className="size-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                  <TrendingUp className="mr-1 size-3" /> +12.5%
                </span>
                <span className="text-xs text-slate-400">vs last month</span>
              </div>
            </CardContent>
          </Card>

          {/* Appointments Today */}
          <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">Appointments Today</p>
                  <h3 className="mt-2 text-3xl font-bold text-slate-900">{totalApptsToday}</h3>
                </div>
                <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Calendar className="size-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="flex items-center text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">
                  {Math.round((totalApptsToday / 50) * 100)}% Capacity
                </span>
                <span className="text-xs text-slate-400">of daily limit</span>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Today */}
          <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">Revenue Today</p>
                  <h3 className="mt-2 text-3xl font-bold text-slate-900">₹{unpaidTotal.toLocaleString("en-IN")}</h3>
                </div>
                <div className="flex size-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                  <CreditCard className="size-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                  <TrendingUp className="mr-1 size-3" /> +8.2%
                </span>
                <span className="text-xs text-slate-400">vs yesterday</span>
              </div>
            </CardContent>
          </Card>

          {/* Pending Bills */}
          <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">Pending Bills</p>
                  <h3 className="mt-2 text-3xl font-bold text-slate-900">{bills.length}</h3>
                </div>
                <div className="flex size-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                  <Receipt className="size-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="flex items-center text-xs font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-md">
                  Action Needed
                </span>
                <span className="text-xs text-slate-400">₹{unpaidTotal.toLocaleString("en-IN")} total</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Section */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Today's Schedule (2 cols) */}
          <Card className="lg:col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Today's Schedule</h3>
              <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50 hover:text-blue-700 -mr-2">
                View all
              </Button>
            </div>
            <div className="flex-1 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-100 bg-slate-50/50 hover:bg-slate-50/50">
                    <TableHead className="font-medium text-slate-500 h-10">Time</TableHead>
                    <TableHead className="font-medium text-slate-500 h-10">Patient</TableHead>
                    <TableHead className="font-medium text-slate-500 h-10">Type</TableHead>
                    <TableHead className="font-medium text-slate-500 h-10">Doctor</TableHead>
                    <TableHead className="font-medium text-slate-500 h-10">Status</TableHead>
                    <TableHead className="text-right h-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.slice(0, 5).map((a) => (
                    <TableRow key={a.appointmentId} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <TableCell className="font-medium text-slate-900 whitespace-nowrap">
                        {formatTime(a.time)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <PersonAvatar clinicId={session?.clinicId ?? ""} ownerType="patient" ownerId={a.patientId} name={patientLookup[a.patientId] || a.patientId} className="size-8 text-xs" />
                          <div>
                            <p className="font-medium text-slate-900">{patientLookup[a.patientId] || a.patientId}</p>
                            <p className="text-xs text-slate-500">MRN: {a.patientId.substring(0, 8)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-600">{a.reason || "General"}</span>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-slate-900">Dr. Smith</p>
                        <p className="text-xs text-slate-500">Dentist</p>
                      </TableCell>
                      <TableCell>
                        <ApptStatus status={a.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="size-8 text-slate-400 hover:text-slate-600">
                          <ArrowRight className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {appointments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-sm text-slate-500">
                        No appointments scheduled for today.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
              <Button variant="outline" className="w-full text-blue-600 border-blue-200 hover:bg-blue-50 bg-white">
                View full schedule <ArrowRight className="ml-2 size-4" />
              </Button>
            </div>
          </Card>

          {/* Right: Revenue Overview (1 col) */}
          <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Revenue Overview</h3>
              <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 p-1 text-xs">
                <button className="rounded px-2 py-1 bg-white shadow-sm font-medium text-slate-900">Weekly</button>
                <button className="rounded px-2 py-1 text-slate-500 hover:text-slate-700 font-medium">Monthly</button>
              </div>
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <div className="mb-6">
                <p className="text-sm text-slate-500">Total Revenue (This Week)</p>
                <div className="flex items-end gap-3 mt-1">
                  <h3 className="text-3xl font-bold text-slate-900">₹{((unpaidTotal || 5000) * 4.5).toLocaleString("en-IN")}</h3>
                  <span className="flex items-center text-xs font-medium text-emerald-600 mb-1.5">
                    <TrendingUp className="mr-1 size-3" /> +14.5%
                  </span>
                </div>
              </div>
              
              {/* Mock Bar Chart */}
              <div className="flex-1 min-h-[180px] flex items-end justify-between gap-2 pt-4">
                {[
                  { label: "Mon", height: "40%", active: false },
                  { label: "Tue", height: "70%", active: false },
                  { label: "Wed", height: "45%", active: false },
                  { label: "Thu", height: "90%", active: true },
                  { label: "Fri", height: "60%", active: false },
                  { label: "Sat", height: "85%", active: false },
                  { label: "Sun", height: "30%", active: false },
                ].map((bar, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 flex-1 group h-full">
                    <div className="w-full relative flex items-end justify-center h-full">
                      <div 
                        className={`w-full max-w-[28px] rounded-t-md transition-all duration-300 ${bar.active ? 'bg-blue-600' : 'bg-blue-100 group-hover:bg-blue-200'}`}
                        style={{ height: bar.height }}
                      ></div>
                    </div>
                    <span className={`text-xs font-medium ${bar.active ? 'text-blue-600' : 'text-slate-400'}`}>{bar.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
          <Card className="rounded-xl border border-slate-200 bg-white shadow-sm hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group">
            <CardContent className="p-5 flex flex-col items-center text-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <UserPlus className="size-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Add Patient</h4>
                <p className="text-xs text-slate-500 mt-0.5">Register new patient</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-xl border border-slate-200 bg-white shadow-sm hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group">
            <CardContent className="p-5 flex flex-col items-center text-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Calendar className="size-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Add Appointment</h4>
                <p className="text-xs text-slate-500 mt-0.5">Schedule appointment</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-xl border border-slate-200 bg-white shadow-sm hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group">
            <CardContent className="p-5 flex flex-col items-center text-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <Receipt className="size-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900">New Bill</h4>
                <p className="text-xs text-slate-500 mt-0.5">Create new invoice</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-xl border border-slate-200 bg-white shadow-sm hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group">
            <CardContent className="p-5 flex flex-col items-center text-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                <Pill className="size-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Add Prescription</h4>
                <p className="text-xs text-slate-500 mt-0.5">Create prescription</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Dashboard Sections */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Patients */}
          <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Recent Patients</h3>
              <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50 hover:text-blue-700 -mr-2">
                View all
              </Button>
            </div>
            <div className="p-0 flex-1">
              <div className="flex flex-col">
                {patients.slice(0, 4).map((p) => (
                  <div key={p.patientId} className="flex items-center justify-between p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <PersonAvatar clinicId={session?.clinicId ?? ""} ownerType="patient" ownerId={p.patientId} name={p.fullName} className="size-10 text-sm" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{p.fullName}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span>MRN: {p.patientId.substring(0, 6)}</span>
                          <span className="size-1 rounded-full bg-slate-300"></span>
                          <span>{p.gender || "M"}</span>
                          <span className="size-1 rounded-full bg-slate-300"></span>
                          <span>24 yrs</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-slate-600">{formatDate(p.createdAt)}</p>
                    </div>
                  </div>
                ))}
                {patients.length === 0 && (
                  <div className="p-6 text-center text-sm text-slate-500">
                    No recent patients.
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Recent Prescriptions & Top Services (Split column) */}
          <div className="flex flex-col gap-6">
            <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col flex-1">
              <div className="border-b border-slate-100 px-5 py-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Recent Prescriptions</h3>
                <span className="text-xs text-blue-600 cursor-pointer hover:underline font-medium">View all</span>
              </div>
              <div className="flex flex-col p-2">
                {[1, 2, 3].map((_, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-600 mt-0.5">
                      <Pill className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-900 truncate">Paracetamol 500mg, Amoxicillin</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <span className="truncate">For: John Doe</span>
                        <span className="size-1 shrink-0 rounded-full bg-slate-300"></span>
                        <span className="shrink-0">Today</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col flex-1">
              <div className="border-b border-slate-100 px-5 py-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Top Services</h3>
              </div>
              <div className="flex flex-col p-4 gap-4">
                {[
                  { name: "General Consultation", count: 145, pct: 45, color: "bg-blue-500" },
                  { name: "Dental Care", count: 86, pct: 30, color: "bg-emerald-500" },
                  { name: "Health Checkup", count: 42, pct: 15, color: "bg-purple-500" },
                ].map((svc, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium text-slate-700">{svc.name}</span>
                      <span className="text-slate-500">{svc.count} visits ({svc.pct}%)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full ${svc.color} rounded-full`} style={{ width: `${svc.pct}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Alerts & Notifications */}
          <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="size-4 text-slate-500" />
                <h3 className="text-base font-semibold text-slate-900">Alerts & Notifications</h3>
              </div>
              <Badge className="bg-red-50 text-red-600 hover:bg-red-50 border-red-200 font-medium">3 New</Badge>
            </div>
            <div className="p-0 flex-1">
              <div className="flex flex-col">
                <div className="flex items-start gap-3 p-4 border-b border-slate-50 bg-red-50/30">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 mt-0.5">
                    <AlertCircle className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Overdue Bills Alert</p>
                    <p className="text-xs text-slate-500 mt-1">There are 12 pending bills exceeding 30 days overdue. Total: ₹45,000.</p>
                    <p className="text-xs text-slate-400 mt-2 font-medium">10 mins ago</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-4 border-b border-slate-50 hover:bg-slate-50/50">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 mt-0.5">
                    <Clock className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Pending Appointments</p>
                    <p className="text-xs text-slate-500 mt-1">4 online appointment requests need your confirmation.</p>
                    <p className="text-xs text-slate-400 mt-2 font-medium">1 hour ago</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 border-b border-slate-50 hover:bg-slate-50/50">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600 mt-0.5">
                    <Pill className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Low Stock Warning</p>
                    <p className="text-xs text-slate-500 mt-1">Amoxicillin 500mg is running low (only 2 strips left).</p>
                    <p className="text-xs text-slate-400 mt-2 font-medium">3 hours ago</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-3 border-t border-slate-100 bg-slate-50/50 text-center">
              <span className="text-xs font-medium text-blue-600 cursor-pointer hover:underline">View all notifications</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Patient portal dashboard (own data only via /me/*) ─────────────────────

function PatientPortal({ clinicId }: { clinicId: string }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [records, setRecords] = useState<MedicineRecord[]>([]);
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

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setQ("");
    setSelectedIds(new Set());
    setCurrentPage(1);
  };

  const handleSearchChange = (v: string) => {
    setQ(v);
    setCurrentPage(1);
    setSelectedIds(new Set());
  };

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

  // 3. Medicine Filter & Export
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
      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
          <TabsList className="bg-muted p-1 rounded-lg">
            <TabsTrigger value="appointments" className="gap-2"><Calendar className="size-4" /> Appointments</TabsTrigger>
            <TabsTrigger value="prescriptions" className="gap-2"><Pill className="size-4" /> Prescriptions</TabsTrigger>
            <TabsTrigger value="records" className="gap-2"><Clipboard className="size-4" /> Medicine</TabsTrigger>
            <TabsTrigger value="bills" className="gap-2"><Receipt className="size-4" /> Bills</TabsTrigger>
            <TabsTrigger value="reports" className="gap-2"><FileBarChart className="size-4" /> Reports</TabsTrigger>
          </TabsList>

          <div className="relative mx-auto w-full max-w-md sm:w-72">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${activeTab}...`}
              value={q}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-9 w-full pl-9"
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
                    <TableHeader>
                      <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                        <TableHead className="w-12 pl-6">
                          <Checkbox
                            checked={selectedIds.size === paginatedItems.length && paginatedItems.length > 0}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
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

                {/* 3. Medicine content */}
                {activeTab === "records" && (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                        <TableHead className="w-12 pl-6">
                          <Checkbox
                            checked={selectedIds.size === paginatedItems.length && paginatedItems.length > 0}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Diagnosis</TableHead>
                        <TableHead>Treatment</TableHead>
                        <TableHead>Symptoms</TableHead>
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
                    <TableHeader>
                      <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                        <TableHead className="w-12 pl-6">
                          <Checkbox
                            checked={selectedIds.size === paginatedItems.length && paginatedItems.length > 0}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Bill No.</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
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
                    <TableHeader>
                      <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                        <TableHead className="w-12 pl-6">
                          <Checkbox
                            checked={selectedIds.size === paginatedItems.length && paginatedItems.length > 0}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
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
                  <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-muted/20">
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