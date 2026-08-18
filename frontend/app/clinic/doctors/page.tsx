"use client";

import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  type Doctor,
  createDoctor,
  deleteDoctor,
  listDoctors,
  updateDoctor,
  createClinicUser,
} from "@/lib/clinic-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Search,
  Download,
  Columns,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Trash2,
  Upload,
  AlertCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import StatsGeneric from "@/components/stats-generic";

const COLUMN_LABELS: Record<string, string> = {
  select: "Select",
  name: "Name",
  specialization: "Specialization",
  phone: "Phone",
  email: "Email",
  fee: "Consultation Fee",
  status: "Status",
};
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
import { Skeleton } from "@/components/ui/skeleton";
import { sessionCan } from "@/hooks/use-clinic-session";

const DAYS = [
  { value: "Mon", label: "Monday" },
  { value: "Tue", label: "Tuesday" },
  { value: "Wed", label: "Wednesday" },
  { value: "Thu", label: "Thursday" },
  { value: "Fri", label: "Friday" },
  { value: "Sat", label: "Saturday" },
  { value: "Sun", label: "Sunday" },
];

const NATIONALITIES = [
  "Indian",
  "American",
  "British",
  "Australian",
  "Canadian",
  "German",
  "French",
  "Japanese",
  "Chinese",
  "Nigerian",
  "Pakistani",
  "Bangladeshi",
  "Sri Lankan",
  "Nepali",
  "Emirati",
  "Saudi",
  "Qatari",
  "Omani",
  "Kuwaiti",
  "Singaporean",
  "Malaysian",
  "Other",
];

const DEPARTMENTS = [
  "General Medicine",
  "Cardiology",
  "Pediatrics",
  "Orthopedics",
  "Dermatology",
  "ENT",
  "Ophthalmology",
  "Gynecology & Obstetrics",
  "Neurology",
  "Psychiatry",
  "Dental",
  "Other",
];

interface TimeSlot {
  start: string;
  end: string;
}

interface DoctorFormState {
  // 1. Personal information
  name: string;
  gender: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  nationality: string;
  address: string;
  // 2. Professional information
  specialization: string;
  qualification: string;
  experienceYears: string;
  licenseNo: string;
  registrationNo: string;
  issuingAuthority: string;
  fee: string;
  department: string;
  // 3. Account & access
  username: string;
  password: string;
  confirmPassword: string;
  role: string;
  status: string;
  allowLogin: string;
  // 4. Consultation schedule
  days: string[];
  timeSlots: TimeSlot[];
  // 5. Additional information
  about: string;
  languages: string;
  profileImage: File | null;
  notes: string;
}

const DEFAULT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const EMPTY_FORM: DoctorFormState = {
  name: "",
  gender: "",
  dateOfBirth: "",
  phone: "",
  email: "",
  nationality: "",
  address: "",
  specialization: "",
  qualification: "",
  experienceYears: "",
  licenseNo: "",
  registrationNo: "",
  issuingAuthority: "",
  fee: "",
  department: "",
  username: "",
  password: "",
  confirmPassword: "",
  role: "Doctor",
  status: "active",
  allowLogin: "yes",
  days: [...DEFAULT_DAYS],
  timeSlots: [{ start: "09:00", end: "17:00" }],
  about: "",
  languages: "",
  profileImage: null,
  notes: "",
};

function doctorToForm(doctor: Doctor): DoctorFormState {
  const days =
    doctor.scheduleDays && doctor.scheduleDays.length > 0
      ? doctor.scheduleDays
      : Array.from(new Set(doctor.schedule.map((s) => s.day)));
  const slots: TimeSlot[] = [];
  doctor.schedule.forEach((s) => {
    if (!slots.some((x) => x.start === s.start && x.end === s.end)) {
      slots.push({ start: s.start, end: s.end });
    }
  });
  return {
    name: doctor.name,
    gender: doctor.gender ?? "",
    dateOfBirth: doctor.dateOfBirth ?? "",
    phone: doctor.phone ?? "",
    email: doctor.email ?? "",
    nationality: doctor.nationality ?? "",
    address: doctor.address ?? "",
    specialization: doctor.specialization,
    qualification: doctor.qualification ?? "",
    experienceYears: doctor.experienceYears != null ? String(doctor.experienceYears) : "",
    licenseNo: doctor.licenseNo ?? "",
    registrationNo: doctor.registrationNo ?? "",
    issuingAuthority: doctor.issuingAuthority ?? "",
    fee: doctor.fee != null ? String(doctor.fee) : "",
    department: doctor.department ?? "",
    username: doctor.username ?? "",
    password: "",
    confirmPassword: "",
    role: "Doctor",
    status: doctor.status,
    allowLogin: doctor.allowLogin === false ? "no" : "yes",
    days: days.length > 0 ? days : [...DEFAULT_DAYS],
    timeSlots: slots.length > 0 ? slots : [{ start: "09:00", end: "17:00" }],
    about: doctor.about ?? "",
    languages: doctor.languages ?? "",
    profileImage: null,
    notes: doctor.notes ?? "",
  };
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-1.5 text-sm text-red-600">
      <AlertCircle size={16} />
      {message}
    </div>
  );
}

function RequiredStar() {
  return <span className="text-red-500">*</span>;
}

export default function DoctorsPage() {
  const session = useRequireRole("doctor");
  const clinicId = session?.clinicId ?? "";
  const [items, setItems] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Doctor | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Search, pagination & selection states
  const [q, setQ] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    if (!clinicId) return;
    setLoading(true);
    listDoctors(clinicId, { limit: 100 })
      .then((res) => {
        setItems(res.items);
        setCurrentPage(1);
        setSelectedIds(new Set());
      })
      .catch(() => toast.error("Failed to load doctors"))
      .finally(() => setLoading(false));
  }, [clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  // Reset page/selection on search
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [q]);

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    select: true,
    name: true,
    specialization: true,
    phone: true,
    email: true,
    fee: true,
    status: true,
  });

  async function handleSave(form: DoctorFormState) {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        specialization: form.specialization.trim(),
        licenseNo: form.licenseNo.trim() || null,
        qualification: form.qualification.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        fee: form.fee.trim() ? Number(form.fee.trim()) : null,
        status: form.status === "active" ? "active" : "inactive",
        gender: form.gender || null,
        dateOfBirth: form.dateOfBirth || null,
        nationality: form.nationality || null,
        address: form.address.trim() || null,
        experienceYears: form.experienceYears.trim()
          ? Number(form.experienceYears.trim())
          : null,
        registrationNo: form.registrationNo.trim() || null,
        issuingAuthority: form.issuingAuthority.trim() || null,
        department: form.department || null,
        about: form.about.trim() || null,
        languages: form.languages.trim() || null,
        notes: form.notes.trim() || null,
        username: form.username.trim() || null,
        allowLogin: form.allowLogin === "yes",
        profileImage: form.profileImage ? form.profileImage.name : null,
        scheduleDays: form.days,
        schedule: form.timeSlots
          .filter((s) => s.start && s.end && s.end > s.start)
          .map((s) => ({
            day: form.days[0] || "Mon",
            start: s.start,
            end: s.end,
          })),
      };

      if (editing) {
        await updateDoctor(clinicId, editing.doctorId, payload);
        toast.success("Doctor updated");
      } else {
        const created = await createDoctor(clinicId, payload);

        // Create the login account when Allow Login is enabled.
        if (form.allowLogin === "yes" && form.password && form.email.trim()) {
          try {
            await createClinicUser(clinicId, {
              name: form.name.trim(),
              email: form.email.trim(),
              password: form.password,
              role: "doctor",
              phone: form.phone.trim() || null,
              doctorId: created.doctorId,
            });
            toast.success("Doctor added with login access");
          } catch (e) {
            toast.error(
              `Doctor saved, but login account could not be created: ${
                e instanceof Error ? e.message : "unknown error"
              }`
            );
          }
        } else {
          toast.success("Doctor added");
        }
      }
      setEditing(null);
      setCreating(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save doctor");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(doctor: Doctor) {
    if (!confirm(`Delete doctor ${doctor.name}?`)) return;
    try {
      await deleteDoctor(clinicId, doctor.doctorId);
      toast.success("Doctor deleted");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete doctor");
    }
  }

  const canManage = sessionCan(session, "clinic_admin");

  // Filtering of items locally
  const filteredItems = useMemo(() => {
    if (!q) return items;
    const lower = q.toLowerCase();
    return items.filter(
      (d) =>
        d.name.toLowerCase().includes(lower) ||
        d.specialization.toLowerCase().includes(lower) ||
        (d.email && d.email.toLowerCase().includes(lower))
    );
  }, [items, q]);

  // Stats calculations
  const totalCount = items.length;
  const activeCount = items.filter((d) => d.status === "active").length;
  const avgFee = totalCount ? Math.round(items.reduce((acc, d) => acc + (d.fee || 0), 0) / totalCount) : 0;
  const scheduledCount = items.filter((d) => d.schedule && d.schedule.length > 0).length;

  const doctorStats = useMemo(() => [
    {
      name: "Total Doctors",
      percentage: Math.min(100, Math.round((totalCount / 50) * 100)),
      current: totalCount,
      allowed: 50,
      allowedLabel: "target",
      fill: "var(--chart-1)",
    },
    {
      name: "Active Doctors",
      percentage: totalCount ? Math.round((activeCount / totalCount) * 100) : 0,
      current: activeCount,
      allowed: totalCount,
      allowedLabel: "registered",
      fill: "var(--chart-2)",
    },
    {
      name: "Avg Fee",
      percentage: Math.min(100, Math.round((avgFee / 2000) * 100)),
      current: `₹${avgFee}`,
      allowed: "₹2000",
      allowedLabel: "target avg",
      fill: "var(--chart-3)",
    },
    {
      name: "Scheduled Doctors",
      percentage: totalCount ? Math.round((scheduledCount / totalCount) * 100) : 0,
      current: scheduledCount,
      allowed: totalCount,
      allowedLabel: "active",
      fill: "var(--chart-4)",
    },
  ], [totalCount, activeCount, avgFee, scheduledCount]);

  // Bulk actions helper
  const handleBulkExport = () => {
    const selected = items.filter((d) => selectedIds.has(d.doctorId));
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selected, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `doctors_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success(`Exported ${selected.length} doctors to JSON.`);
  };

  // Pagination calculation
  const totalPages = Math.ceil(filteredItems.length / pageSize);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredItems.slice(startIndex, startIndex + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedItems.map((d) => d.doctorId)));
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
                <h1 className="text-2xl font-bold text-gray-900">Add Doctor</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Register a new doctor at this clinic
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <DoctorForm
              initial={EMPTY_FORM}
              isEdit={false}
              saving={saving}
              onSave={async (form) => {
                await handleSave(form);
                setCreating(false);
              }}
            />
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
                <h1 className="text-2xl font-bold text-gray-900">Edit Doctor</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Modify doctor details, fee, and schedule
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <DoctorForm
              initial={doctorToForm(editing)}
              isEdit={true}
              saving={saving}
              onSave={async (form) => {
                await handleSave(form);
                setEditing(null);
              }}
            />
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
          <StatsGeneric
            title="Doctors Registry"
            description="Real-time analytics on doctor specializations, shift coverage, and active rosters."
            items={doctorStats}
            action={
              canManage && (
                <Button className="flex items-center gap-1.5 shadow-sm" onClick={() => setCreating(true)}>
                  <Plus className="size-4" />
                  Add Doctor
                </Button>
              )
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
              onClick={handleBulkExport}
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
            <div className="space-y-1">
              <CardTitle className="text-xl font-semibold text-foreground">
                Doctors Listing
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage medical practitioners, consultation hours, fees, and system access.
              </p>
            </div>
            <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:w-auto">
              <div className="relative mx-auto w-full max-w-md sm:w-72">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search doctors..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="h-9 w-full pl-9"
                />
              </div>
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
              No doctors found.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    {visibleColumns.select && (
                      <TableHead className="w-12 pl-6">
                        <Checkbox
                          checked={selectedIds.size === paginatedItems.length && paginatedItems.length > 0}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all"
                        />
                      </TableHead>
                    )}
                    {visibleColumns.name && <TableHead className="font-semibold text-foreground">Name</TableHead>}
                    {visibleColumns.specialization && <TableHead className="font-semibold text-foreground">Specialization</TableHead>}
                    {visibleColumns.phone && <TableHead className="font-semibold text-foreground">Phone</TableHead>}
                    {visibleColumns.email && <TableHead className="font-semibold text-foreground">Email</TableHead>}
                    {visibleColumns.fee && <TableHead className="font-semibold text-foreground">Fee</TableHead>}
                    {visibleColumns.status && <TableHead className="font-semibold text-foreground">Status</TableHead>}
                    {canManage && <TableHead className="text-right pr-6 font-semibold text-foreground">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((d) => (
                    <TableRow
                      key={d.doctorId}
                      className={`hover:bg-muted/30 border-b border-border last:border-0 ${selectedIds.has(d.doctorId) ? "bg-muted/30" : ""}`}
                    >
                      {visibleColumns.select && (
                        <TableCell className="pl-6">
                          <Checkbox
                            checked={selectedIds.has(d.doctorId)}
                            onCheckedChange={() => toggleSelectRow(d.doctorId)}
                            aria-label={`Select ${d.name}`}
                          />
                        </TableCell>
                      )}
                      {visibleColumns.name && <TableCell className="font-medium text-foreground">{d.name}</TableCell>}
                      {visibleColumns.specialization && <TableCell className="text-muted-foreground">{d.specialization}</TableCell>}
                      {visibleColumns.phone && <TableCell className="text-muted-foreground">{d.phone ?? "—"}</TableCell>}
                      {visibleColumns.email && <TableCell className="text-muted-foreground">{d.email ?? "—"}</TableCell>}
                      {visibleColumns.fee && <TableCell className="text-muted-foreground font-medium">{d.fee != null ? `₹${d.fee}` : "—"}</TableCell>}
                      {visibleColumns.status && (
                        <TableCell>
                          <Badge
                            className={
                              d.status === "active"
                                ? "bg-green-50 text-green-700 hover:bg-green-50 border-green-200"
                                : "bg-slate-50 text-slate-700 hover:bg-slate-50 border-slate-200"
                            }
                            variant="outline"
                          >
                            {d.status}
                          </Badge>
                        </TableCell>
                      )}
                      {canManage && (
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setEditing(d)}>Edit</Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(d)}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-muted/10">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Showing <span className="font-medium">{filteredItems.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to{" "}
                      <span className="font-medium">
                        {Math.min(currentPage * pageSize, filteredItems.length)}
                      </span>{" "}
                      of <span className="font-medium">{filteredItems.length}</span> results
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="size-4 mr-1" />
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
                      <ChevronRight className="size-4 ml-1" />
                    </Button>
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

function DoctorForm({
  initial,
  isEdit,
  saving,
  onSave,
}: {
  initial: DoctorFormState;
  isEdit: boolean;
  saving: boolean;
  onSave: (form: DoctorFormState) => Promise<void>;
}) {
  const [form, setForm] = useState<DoctorFormState>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const set = <K extends keyof DoctorFormState>(key: K, value: DoctorFormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      const next = { ...e };
      delete next[String(key)];
      return next;
    });
  };

  function toggleDay(day: string, checked: boolean) {
    setForm((f) => ({
      ...f,
      days: checked
        ? Array.from(new Set([...f.days, day]))
        : f.days.filter((d) => d !== day),
    }));
    setErrors((e) => {
      const next = { ...e };
      delete next.days;
      return next;
    });
  }

  function setSlot(i: number, patch: Partial<TimeSlot>) {
    setForm((f) => ({
      ...f,
      timeSlots: f.timeSlots.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    }));
    setErrors((e) => {
      const next = { ...e };
      delete next[`slot-${i}-start`];
      delete next[`slot-${i}-end`];
      return next;
    });
  }

  function addSlot() {
    setForm((f) => ({ ...f, timeSlots: [...f.timeSlots, { start: "09:00", end: "17:00" }] }));
  }

  function removeSlot(i: number) {
    setForm((f) => ({
      ...f,
      timeSlots: f.timeSlots.length > 1 ? f.timeSlots.filter((_, idx) => idx !== i) : f.timeSlots,
    }));
  }

  function handleProfileImage(file: File | null) {
    if (!file) return;
    const ok = ["image/jpeg", "image/png"].includes(file.type);
    if (!ok) {
      setErrors((e) => ({ ...e, profileImage: "Only JPG or PNG images are allowed" }));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrors((e) => ({ ...e, profileImage: "Image must be smaller than 2MB" }));
      return;
    }
    setErrors((e) => {
      const next = { ...e };
      delete next.profileImage;
      return next;
    });
    setForm((f) => ({ ...f, profileImage: file }));
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  }

  const resetForm = () => {
    setForm({ ...initial, timeSlots: initial.timeSlots.map((s) => ({ ...s })) });
    setErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Full name is required";
    else if (form.name.trim().length < 2) errs.name = "Enter a valid full name";
    if (!form.gender) errs.gender = "Gender is required";
    if (!form.phone.trim()) errs.phone = "Phone number is required";
    else if (!/^\+?[\d\s()-]{10,15}$/.test(form.phone.trim())) errs.phone = "Enter a valid phone number";
    if (!form.email.trim()) errs.email = "Email address is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = "Enter a valid email address";
    if (!form.specialization.trim()) errs.specialization = "Specialization is required";
    else if (form.specialization.trim().length < 2) errs.specialization = "Enter a valid specialization";
    if (!form.qualification.trim()) errs.qualification = "Qualification is required";
    if (form.experienceYears.trim()) {
      const years = Number(form.experienceYears.trim());
      if (Number.isNaN(years) || years < 0 || years > 100) errs.experienceYears = "Enter valid years (0–100)";
    }
    if (form.fee.trim()) {
      const fee = Number(form.fee.trim());
      if (Number.isNaN(fee) || fee < 0) errs.fee = "Enter a valid consultation fee";
    }
    if (!form.username.trim()) errs.username = "Username is required";
    else if (form.username.trim().length < 3) errs.username = "Username must be at least 3 characters";
    if (!isEdit && !form.password) errs.password = "Password is required";
    else if (form.password && form.password.length < 8) errs.password = "Password must be at least 8 characters";
    if (form.password && form.confirmPassword !== form.password) errs.confirmPassword = "Passwords do not match";
    if (form.days.length === 0) errs.days = "Select at least one day";
    form.timeSlots.forEach((s, i) => {
      if (!s.start) errs[`slot-${i}-start`] = "Start time is required";
      else if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.start)) errs[`slot-${i}-start`] = "Invalid time";
      if (!s.end) errs[`slot-${i}-end`] = "End time is required";
      else if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.end)) errs[`slot-${i}-end`] = "Invalid time";
      if (s.start && s.end && s.end <= s.start) errs[`slot-${i}-end`] = "End must be after start";
    });
    return errs;
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error("Please fix the highlighted fields");
      return;
    }
    await onSave(form);
  }

  const inputBase = (key: string) =>
    `border ${
      errors[key] ? "border-red-500 focus:ring-red-500" : "border-blue-200 focus:ring-blue-400"
    }`;

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      {/* 1. PERSONAL INFORMATION */}
      <Card className="border-blue-200 bg-gradient-to-b from-blue-50/50 to-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-800">
            1. Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2 md:col-span-2">
            <Label className="text-sm font-medium text-gray-700">
              Full Name <RequiredStar />
            </Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Enter full name"
              className={inputBase("name")}
            />
            <FieldError message={errors.name} />
          </div>

          <div className="grid gap-2">
            <Label className="text-sm font-medium text-gray-700">
              Gender <RequiredStar />
            </Label>
            <Select value={form.gender} onValueChange={(v) => set("gender", v ?? "")}>
              <SelectTrigger className={`${inputBase("gender")} w-full`}>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <FieldError message={errors.gender} />
          </div>

          <div className="grid gap-2">
            <Label className="text-sm font-medium text-gray-700">Date of Birth</Label>
            <Input
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => set("dateOfBirth", e.target.value)}
              className={inputBase("dateOfBirth")}
            />
            <FieldError message={errors.dateOfBirth} />
          </div>

          <div className="grid gap-2">
            <Label className="text-sm font-medium text-gray-700">
              Phone Number <RequiredStar />
            </Label>
            <Input
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="Enter phone number"
              className={inputBase("phone")}
            />
            <FieldError message={errors.phone} />
          </div>

          <div className="grid gap-2">
            <Label className="text-sm font-medium text-gray-700">
              Email <RequiredStar />
            </Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="Enter email address"
              className={inputBase("email")}
            />
            <FieldError message={errors.email} />
          </div>

          <div className="grid gap-2">
            <Label className="text-sm font-medium text-gray-700">Nationality</Label>
            <Select value={form.nationality} onValueChange={(v) => set("nationality", v ?? "")}>
              <SelectTrigger className={`${inputBase("nationality")} w-full`}>
                <SelectValue placeholder="Select nationality" />
              </SelectTrigger>
              <SelectContent>
                {NATIONALITIES.map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.nationality} />
          </div>

          <div className="grid gap-2 md:col-span-2">
            <Label className="text-sm font-medium text-gray-700">Address</Label>
            <Input
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Enter full address"
              className={inputBase("address")}
            />
            <FieldError message={errors.address} />
          </div>
        </div>
      </CardContent>
      </Card>

      {/* 2. PROFESSIONAL INFORMATION */}
      <Card className="border-blue-200 bg-gradient-to-b from-blue-50/50 to-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-800">
            2. Professional Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label className="text-sm font-medium text-gray-700">
              Specialization <RequiredStar />
            </Label>
            <Input
              value={form.specialization}
              onChange={(e) => set("specialization", e.target.value)}
              placeholder="e.g. Cardiology"
              className={inputBase("specialization")}
            />
            <FieldError message={errors.specialization} />
          </div>

          <div className="grid gap-2">
            <Label className="text-sm font-medium text-gray-700">
              Qualification <RequiredStar />
            </Label>
            <Input
              value={form.qualification}
              onChange={(e) => set("qualification", e.target.value)}
              placeholder="e.g. MD, DM"
              className={inputBase("qualification")}
            />
            <FieldError message={errors.qualification} />
          </div>

          <div className="grid gap-2">
            <Label className="text-sm font-medium text-gray-700">Experience (Years)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={form.experienceYears}
              onChange={(e) => set("experienceYears", e.target.value)}
              placeholder="e.g. 10"
              className={inputBase("experienceYears")}
            />
            <FieldError message={errors.experienceYears} />
          </div>

          <div className="grid gap-2">
            <Label className="text-sm font-medium text-gray-700">License Number</Label>
            <Input
              value={form.licenseNo}
              onChange={(e) => set("licenseNo", e.target.value)}
              placeholder="e.g. MH-2024-013"
              className={inputBase("licenseNo")}
            />
            <FieldError message={errors.licenseNo} />
          </div>

          <div className="grid gap-2">
            <Label className="text-sm font-medium text-gray-700">Registration Number</Label>
            <Input
              value={form.registrationNo}
              onChange={(e) => set("registrationNo", e.target.value)}
              placeholder="e.g. MCI-123456"
              className={inputBase("registrationNo")}
            />
            <FieldError message={errors.registrationNo} />
          </div>

          <div className="grid gap-2">
            <Label className="text-sm font-medium text-gray-700">Issuing Authority</Label>
            <Input
              value={form.issuingAuthority}
              onChange={(e) => set("issuingAuthority", e.target.value)}
              placeholder="e.g. Medical Council of India"
              className={inputBase("issuingAuthority")}
            />
            <FieldError message={errors.issuingAuthority} />
          </div>

          <div className="grid gap-2">
            <Label className="text-sm font-medium text-gray-700">Consultation Fee (₹)</Label>
            <Input
              type="number"
              min="0"
              value={form.fee}
              onChange={(e) => set("fee", e.target.value)}
              placeholder="e.g. 1500"
              className={inputBase("fee")}
            />
            <FieldError message={errors.fee} />
          </div>

          <div className="grid gap-2">
            <Label className="text-sm font-medium text-gray-700">Department</Label>
            <Select value={form.department} onValueChange={(v) => set("department", v ?? "")}>
              <SelectTrigger className={`${inputBase("department")} w-full`}>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.department} />
          </div>
        </div>
      </CardContent>
      </Card>

      {/* 3. ACCOUNT & ACCESS */}
      <Card className="border-blue-200 bg-gradient-to-b from-blue-50/50 to-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-800">
            3. Account & Access
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label className="text-sm font-medium text-gray-700">
              Username <RequiredStar />
            </Label>
            <Input
              value={form.username}
              onChange={(e) => set("username", e.target.value)}
              placeholder="Enter username"
              className={inputBase("username")}
            />
            <FieldError message={errors.username} />
          </div>

          <div className="grid gap-2">
            <Label className="text-sm font-medium text-gray-700">
              Password <RequiredStar />
            </Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder="Enter password"
                className={`${inputBase("password")} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <FieldError message={errors.password} />
          </div>

          <div className="grid gap-2">
            <Label className="text-sm font-medium text-gray-700">
              Confirm Password <RequiredStar />
            </Label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={(e) => set("confirmPassword", e.target.value)}
                placeholder="Confirm password"
                className={`${inputBase("confirmPassword")} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((s) => !s)}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <FieldError message={errors.confirmPassword} />
          </div>

          <div className="grid gap-2">
            <Label className="text-sm font-medium text-gray-700">Role</Label>
            <Select value={form.role} onValueChange={(v) => set("role", v ?? "Doctor")}>
              <SelectTrigger className={`${inputBase("role")} w-full`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Doctor">Doctor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label className="text-sm font-medium text-gray-700">Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v ?? "active")}>
              <SelectTrigger className={`${inputBase("status")} w-full`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2 md:col-span-2">
            <Label className="text-sm font-medium text-gray-700">Allow Login</Label>
            <div className="mt-3 space-y-2">
              {(["yes", "no"] as const).map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-3 rounded-lg p-3 hover:bg-blue-50"
                >
                  <input
                    type="radio"
                    name="allow-login"
                    value={option}
                    checked={form.allowLogin === option}
                    onChange={() => set("allowLogin", option)}
                    className="h-4 w-4 border-blue-300 text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {option === "yes" ? "Yes, create login account" : "No, access only"}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              A login account is created with the doctor&apos;s email and password.
            </p>
          </div>
        </div>
      </CardContent>
      </Card>

      {/* 4. CONSULTATION SCHEDULE */}
      <Card className="border-blue-200 bg-gradient-to-b from-blue-50/50 to-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-800">
            4. Consultation Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-4">
            <Label className="mb-3 block text-sm font-medium text-slate-700">Select Days</Label>
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              {DAYS.map((day) => (
                <label
                  key={day.value}
                  className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"
                >
                  <Checkbox
                    checked={form.days.includes(day.value)}
                    onCheckedChange={(checked) => toggleDay(day.value, !!checked)}
                  />
                  {day.label}
                </label>
              ))}
            </div>
            <FieldError message={errors.days} />
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-4">
            <Label className="mb-3 block text-sm font-medium text-slate-700">Default Time Slot</Label>
            <div className="space-y-3">
              {form.timeSlots.map((slot, i) => (
                <div key={i} className="flex items-end gap-3">
                  <div className="grid gap-2">
                    <Label className="text-xs text-gray-500">Start time</Label>
                    <Input
                      type="time"
                      value={slot.start}
                      onChange={(e) => setSlot(i, { start: e.target.value })}
                      className={`${inputBase(`slot-${i}-start`)} w-32`}
                    />
                    <FieldError message={errors[`slot-${i}-start`]} />
                  </div>
                  <span className="pb-3 text-sm text-slate-500">to</span>
                  <div className="grid gap-2">
                    <Label className="text-xs text-gray-500">End time</Label>
                    <Input
                      type="time"
                      value={slot.end}
                      onChange={(e) => setSlot(i, { end: e.target.value })}
                      className={`${inputBase(`slot-${i}-end`)} w-32`}
                    />
                    <FieldError message={errors[`slot-${i}-end`]} />
                  </div>
                  {form.timeSlots.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSlot(i)}
                      aria-label="Remove time slot"
                      className="mb-0.5 h-9 w-9 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={addSlot}
              className="mt-4 h-10 w-full rounded-lg border-blue-300 bg-white text-blue-600 hover:bg-blue-50"
            >
              <Plus className="mr-1.5 size-4" />
              Add Another Time Slot
            </Button>
          </div>
        </div>
      </CardContent>
      </Card>

      {/* 5. ADDITIONAL INFORMATION */}
      <Card className="border-blue-200 bg-gradient-to-b from-blue-50/50 to-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-800">
            5. Additional Information (Optional)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label className="text-sm font-medium text-gray-700">About Doctor</Label>
            <textarea
              value={form.about}
              onChange={(e) => set("about", e.target.value)}
              placeholder="Briefly about the doctor"
              rows={4}
              className="w-full resize-none rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100"
            />
            <FieldError message={errors.about} />
          </div>

          <div className="grid gap-2">
            <Label className="text-sm font-medium text-gray-700">Languages Known</Label>
            <textarea
              value={form.languages}
              onChange={(e) => set("languages", e.target.value)}
              placeholder="e.g. English, Hindi, Tamil"
              rows={4}
              className="w-full resize-none rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100"
            />
            <FieldError message={errors.languages} />
          </div>

          <div className="grid gap-2">
            <Label className="text-sm font-medium text-gray-700">Profile Image</Label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-[104px] flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-blue-200 bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100"
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Profile preview"
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <Upload className="size-6" />
              )}
              <span className="text-sm font-medium">Upload Image</span>
              <span className="text-xs text-gray-500">JPG, PNG (Max 2MB)</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={(e) => {
                handleProfileImage(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
            {form.profileImage && (
              <p className="truncate text-xs text-gray-500">{form.profileImage.name}</p>
            )}
            <FieldError message={errors.profileImage} />
          </div>

          <div className="grid gap-2">
            <Label className="text-sm font-medium text-gray-700">Notes</Label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Any additional notes"
              rows={4}
              className="w-full resize-none rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100"
            />
            <FieldError message={errors.notes} />
          </div>
        </div>
      </CardContent>
      </Card>

      {/* BOTTOM ACTIONS */}
      <div className="flex gap-3 border-t border-blue-200 pt-8">
        <Button
          type="button"
          variant="outline"
          onClick={resetForm}
          disabled={saving}
          className="border-blue-300 text-blue-600 hover:bg-blue-50"
        >
          Reset
        </Button>
        <div className="flex-1" />
        <Button
          type="submit"
          onClick={submit}
          disabled={saving}
          className="bg-blue-600 text-white hover:bg-blue-700"
          size="lg"
        >
          {saving ? "Saving..." : "Save Doctor"}
        </Button>
      </div>
    </form>
  );
}