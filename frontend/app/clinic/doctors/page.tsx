"use client";

import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import { useDropdownOptions } from "@/lib/dropdown-options";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import {
  type Doctor,
  createDoctor,
  deleteDoctor,
  listDoctors,
  updateDoctor,
  createClinicUser,
  updateClinicUser,
  uploadAvatar,
} from "@/lib/clinic-api";
import { bustAvatarCache } from "@/components/clinic/person-avatar";
import { Button } from "@/components/ui/button";
import { TimePicker } from "@/components/ui/time-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PincodeLookup } from "@/components/clinic/pincode-lookup";
import {
  WhatsAppInput,
  isIndianMobile,
} from "@/components/clinic/whatsapp-input";
import {
  Plus,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  User,
  Camera,
  AlertCircle,
} from "lucide-react";
import dynamic from "next/dynamic";

const StatsGeneric = dynamic(() => import("@/components/stats-generic"), {
  loading: () => <div className="h-[270px]" aria-hidden="true" />,
});

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
import { Pagination } from "@/components/ui/pagination";
import { sessionCan } from "@/hooks/use-clinic-session";
import { PersonAvatar } from "@/components/clinic/person-avatar";

const DAYS = [
  { value: "Mon", label: "Monday" },
  { value: "Tue", label: "Tuesday" },
  { value: "Wed", label: "Wednesday" },
  { value: "Thu", label: "Thursday" },
  { value: "Fri", label: "Friday" },
  { value: "Sat", label: "Saturday" },
  { value: "Sun", label: "Sunday" },
];

interface DaySchedule {
  day: string;
  start: string;
  end: string;
}

interface DoctorFormState {
  // 1. Personal information
  name: string;
  gender: string;
  dateOfBirth: string;
  phone: string;
  whatsapp: string;
  email: string;
  nationality: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  // 2. Professional information
  specialization: string;
  qualification: string;
  experienceYears: string;
  // 2. Professional information
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
  schedule: DaySchedule[];
  // 5. Additional information
  about: string;
  languages: string;
  profileImage: File | null;
  notes: string;
}

const DEFAULT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const DEFAULT_SLOT = { start: "09:00", end: "17:00" } as const;

const EMPTY_FORM: DoctorFormState = {
  name: "",
  gender: "",
  dateOfBirth: "",
  phone: "",
  whatsapp: "",
  email: "",
  nationality: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
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
  schedule: DEFAULT_DAYS.map((day) => ({ day, ...DEFAULT_SLOT })),
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
  const slotForDay = new Map<string, { start: string; end: string }>();
  doctor.schedule.forEach((s) => {
    if (s.start && s.end && !slotForDay.has(s.day)) {
      slotForDay.set(s.day, { start: s.start, end: s.end });
    }
  });
  const schedule = days
    .map((day) => ({ day, ...(slotForDay.get(day) ?? DEFAULT_SLOT) }))
    .sort(
      (a, b) =>
        DAYS.findIndex((d) => d.value === a.day) - DAYS.findIndex((d) => d.value === b.day)
    );
  return {
    name: doctor.name,
    gender: doctor.gender ?? "",
    dateOfBirth: doctor.dateOfBirth ?? "",
    phone: doctor.phone ?? "",
    whatsapp: doctor.whatsapp ?? "",
    email: doctor.email ?? "",
    nationality: doctor.nationality ?? "",
    address: doctor.address ?? "",
    city: doctor.city ?? "",
    state: doctor.state ?? "",
    pincode: doctor.pincode ?? "",
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
    schedule:
      schedule.length > 0 ? schedule : DEFAULT_DAYS.map((day) => ({ day, ...DEFAULT_SLOT })),
    about: doctor.about ?? "",
    languages: doctor.languages ?? "",
    profileImage: null,
    notes: doctor.notes ?? "",
  };
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-1.5 text-sm text-destructive">
      <AlertCircle size={16} />
      {message}
    </div>
  );
}

function RequiredStar() {
  return <span className="text-destructive">*</span>;
}

export default function DoctorsPage() {
  const session = useRequireRole("patient");
  const clinicId = session?.clinicId ?? "";
  const { getOptions } = useDropdownOptions(clinicId);
  const nationalities = getOptions("nationalities");
  const departments = getOptions("doctor_departments");
  const [items, setItems] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Doctor | null>(null);
  const [viewing, setViewing] = useState<Doctor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Doctor | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Search, pagination & selection states
  const [q, setQ] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    if (!clinicId) return;
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

  const handleSearchChange = (v: string) => {
    setQ(v);
    setCurrentPage(1);
    setSelectedIds(new Set());
  };

  const [visibleColumns] = useState<Record<string, boolean>>({
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
        whatsapp: form.whatsapp.trim() || null,
        email: form.email.trim() || null,
        fee: form.fee.trim() ? Number(form.fee.trim()) : null,
        status: form.status === "active" ? "active" : "inactive",
        gender: form.gender || null,
        dateOfBirth: form.dateOfBirth || null,
        nationality: form.nationality || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        pincode: form.pincode.trim() || null,
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
        scheduleDays: form.schedule
          .filter((s) => s.start && s.end && s.end > s.start)
          .map((s) => s.day),
        schedule: form.schedule
          .filter((s) => s.start && s.end && s.end > s.start)
          .map((s) => ({ day: s.day, start: s.start, end: s.end })),
      };

      if (editing) {
        await updateDoctor(clinicId, editing.doctorId, payload);
        if (form.profileImage) {
          try {
            await uploadAvatar(clinicId, "doctor", editing.doctorId, form.profileImage);
            bustAvatarCache(clinicId, "doctor", editing.doctorId);
          } catch {
            toast.warning("Doctor updated, but the profile photo could not be uploaded");
          }
        }
        // Reset the login password when a new one was provided.
        if (form.password) {
          try {
            if (editing.userId) {
              await updateClinicUser(clinicId, editing.userId, {
                phone: form.phone.trim() || null,
                whatsapp: form.whatsapp.trim() || null,
                password: form.password,
              });
            } else if (form.email.trim()) {
              await createClinicUser(clinicId, {
                name: form.name.trim(),
                email: form.email.trim(),
                password: form.password,
                role: "doctor",
                phone: form.phone.trim() || null,
                whatsapp: form.whatsapp.trim() || null,
                doctorId: editing.doctorId,
              });
            }
            toast.success("Doctor updated — new login password sent via WhatsApp");
          } catch (e) {
            toast.error(
              `Doctor updated, but the password could not be reset: ${
                e instanceof Error ? e.message : "unknown error"
              }`
            );
          }
        } else {
          toast.success("Doctor updated");
        }
      } else {
        const created = await createDoctor(clinicId, payload);

        if (form.profileImage) {
          try {
            await uploadAvatar(clinicId, "doctor", created.doctorId, form.profileImage);
          } catch {
            toast.warning("Doctor saved, but the profile photo could not be uploaded");
          }
        }

        // Create the login account when Allow Login is enabled.
        if (form.allowLogin === "yes" && form.password && form.email.trim()) {
          try {
            await createClinicUser(clinicId, {
              name: form.name.trim(),
              email: form.email.trim(),
              password: form.password,
              role: "doctor",
              phone: form.phone.trim() || null,
              whatsapp: form.whatsapp.trim() || null,
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
    await deleteDoctor(clinicId, doctor.doctorId);
    toast.success("Doctor deleted");
    load();
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
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 border-b border-border bg-background">
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-start gap-4">
              <button
                onClick={() => setCreating(false)}
                className="mt-1 inline-flex items-center justify-center rounded-lg p-2 hover:bg-muted"
              >
                <ChevronLeft size={20} className="text-primary" />
              </button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Add Doctor</h1>
                <p className="mt-1 text-sm text-muted-foreground">
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
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 border-b border-border bg-background">
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-start gap-4">
              <button
                onClick={() => setEditing(null)}
                className="mt-1 inline-flex items-center justify-center rounded-lg p-2 hover:bg-muted"
              >
                <ChevronLeft size={20} className="text-primary" />
              </button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Edit Doctor</h1>
                <p className="mt-1 text-sm text-muted-foreground">
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
                <ChevronLeft size={20} className="text-primary" />
              </button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">View Doctor</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Doctor details, fee, and schedule
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <DoctorForm
              initial={doctorToForm(viewing)}
              isEdit={true}
              saving={false}
              readOnly={true}
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
            title="Doctor Analytics"
            description="Doctor specializations, roster availability, and shift insights."
            items={doctorStats}
            searchTerm={q}
            onSearchChange={handleSearchChange}
            searchPlaceholder="Search doctor, specialization, city..."
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
                  <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                    {visibleColumns.select && (
                      <TableHead className="w-12 pl-6">
                        <Checkbox
                          checked={selectedIds.size === paginatedItems.length && paginatedItems.length > 0}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all"
                        />
                      </TableHead>
                    )}
                    {visibleColumns.name && <TableHead>Name</TableHead>}
                    {visibleColumns.specialization && <TableHead>Specialization</TableHead>}
                    {visibleColumns.phone && <TableHead>Phone</TableHead>}
                    {visibleColumns.email && <TableHead>Email</TableHead>}
                    {visibleColumns.fee && <TableHead>Fee</TableHead>}
                    {visibleColumns.status && <TableHead>Status</TableHead>}
                    {canManage && <TableHead className="text-right pr-6">Actions</TableHead>}
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
                      {visibleColumns.name && (
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <PersonAvatar clinicId={clinicId} ownerType="doctor" ownerId={d.doctorId} name={d.name} />
                              <span className="font-medium text-foreground">{d.name}</span>
                            </div>
                          </TableCell>
                        )}
                      {visibleColumns.specialization && <TableCell className="text-muted-foreground">{d.specialization}</TableCell>}
                      {visibleColumns.phone && <TableCell className="text-muted-foreground">{d.phone ?? "—"}</TableCell>}
                      {visibleColumns.email && <TableCell className="text-muted-foreground">{d.email ?? "—"}</TableCell>}
                      {visibleColumns.fee && <TableCell className="text-muted-foreground font-medium">{d.fee != null ? `₹${d.fee}` : "—"}</TableCell>}
                      {visibleColumns.status && (
                        <TableCell>
                          <Badge
                            className={
                              d.status === "active"
                                ? "bg-success/10 text-success border-success/25 hover:bg-success/10"
                                : "bg-muted text-muted-foreground border-border hover:bg-muted"
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
                            <Button variant="ghost" size="sm" onClick={() => setViewing(d)}>View</Button>
                            <Button variant="ghost" size="sm" onClick={() => setEditing(d)}>Edit</Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteTarget(d)}
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
              {filteredItems.length > 0 && (
                <Pagination
                  page={currentPage}
                  pageSize={pageSize}
                  totalItems={filteredItems.length}
                  onPageChange={(p) => setCurrentPage(Math.max(1, Math.min(p, totalPages || 1)))}
                  itemLabel="results"
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`Delete doctor ${deleteTarget?.name ?? ""}?`}
        description="This will permanently remove the doctor and their clinic user account. This action cannot be undone."
        onConfirm={async () => {
          if (deleteTarget) await handleDelete(deleteTarget);
        }}
      />
    </div>
  );
}

function DoctorForm({
  initial,
  isEdit,
  saving,
  onSave,
  readOnly,
}: {
  initial: DoctorFormState;
  isEdit: boolean;
  saving: boolean;
  onSave?: (form: DoctorFormState) => Promise<void>;
  readOnly?: boolean;
}) {
  const [form, setForm] = useState<DoctorFormState>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const session = useRequireRole("patient");
  const { getOptions } = useDropdownOptions(session?.clinicId ?? "");
  const nationalities = getOptions("nationalities");
  const departments = getOptions("doctor_departments");

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
      schedule: checked
        ? Array.from(
            new Map([...f.schedule, { day, ...DEFAULT_SLOT }].map((s) => [s.day, s])).values()
          )
        : f.schedule.filter((s) => s.day !== day),
    }));
    setErrors((e) => {
      const next = { ...e };
      delete next.days;
      delete next[`slot-${day}-start`];
      delete next[`slot-${day}-end`];
      return next;
    });
  }

  function setDaySlot(day: string, patch: Partial<Pick<DaySchedule, "start" | "end">>) {
    setForm((f) => ({
      ...f,
      schedule: f.schedule.map((s) => (s.day === day ? { ...s, ...patch } : s)),
    }));
    setErrors((e) => {
      const next = { ...e };
      delete next[`slot-${day}-start`];
      delete next[`slot-${day}-end`];
      return next;
    });
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
    setForm({ ...initial, schedule: initial.schedule.map((s) => ({ ...s })) });
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
    if (form.whatsapp.trim() && !isIndianMobile(form.whatsapp)) {
      errs.whatsapp = "Enter a valid Indian WhatsApp number";
    }
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
    if (form.pincode.trim() && !/^[1-9]\d{5}$/.test(form.pincode.trim())) {
      errs.pincode = "Enter a valid Indian pincode";
    }
    if (form.schedule.length === 0) errs.days = "Select at least one day";
    form.schedule.forEach((s) => {
      if (!s.start) errs[`slot-${s.day}-start`] = "Start time is required";
      else if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.start)) errs[`slot-${s.day}-start`] = "Invalid time";
      if (!s.end) errs[`slot-${s.day}-end`] = "End time is required";
      else if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.end)) errs[`slot-${s.day}-end`] = "Invalid time";
      if (s.start && s.end && s.end <= s.start) errs[`slot-${s.day}-end`] = "End must be after start";
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
    if (onSave) await onSave(form);
  }

  const inputBase = (key: string) =>
    `border ${
      errors[key] ? "border-destructive focus:ring-destructive" : "border-border focus:ring-ring"
    }`;

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <fieldset disabled={readOnly} className="space-y-6 border-0 p-0 m-0">
      {/* 1. PERSONAL INFORMATION */}
      <Card className="border-border bg-gradient-to-b from-muted/50 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            1. Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Upload profile photo"
            className="relative shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Profile preview"
                className="size-20 rounded-full border border-border object-cover"
              />
            ) : (
              <span className="flex size-20 items-center justify-center rounded-full border border-border bg-accent text-primary">
                <User className="size-9" />
              </span>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 flex size-7 items-center justify-center rounded-full border border-border bg-background text-primary shadow-sm">
              <Camera className="size-3.5" />
            </span>
          </button>
          <div>
            <p className="text-sm font-medium text-foreground">Doctor Photo</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Click the avatar to upload a profile photo (JPG, PNG — Max 2MB)
            </p>
          </div>
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
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2 md:col-span-2">
            <Label className="text-sm font-medium text-foreground">
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
            <Label className="text-sm font-medium text-foreground">
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
            <Label className="text-sm font-medium text-foreground">Date of Birth</Label>
            <Input
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => set("dateOfBirth", e.target.value)}
              className={inputBase("dateOfBirth")}
            />
            <FieldError message={errors.dateOfBirth} />
          </div>

          <div className="grid gap-2">
            <Label className="text-sm font-medium text-foreground">
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
            <Label className="text-sm font-medium text-foreground">WhatsApp Number</Label>
            <WhatsAppInput
              id="whatsapp"
              value={form.whatsapp}
              onChange={(v) => set("whatsapp", v)}
              error={errors.whatsapp}
              helperText="10-digit Indian WhatsApp number"
            />
          </div>

          <div className="grid gap-2">
            <Label className="text-sm font-medium text-foreground">
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
            <Label className="text-sm font-medium text-foreground">Nationality</Label>
            <Select value={form.nationality} onValueChange={(v) => set("nationality", v ?? "")}>
              <SelectTrigger className={`${inputBase("nationality")} w-full`}>
                <SelectValue placeholder="Select nationality" />
              </SelectTrigger>
              <SelectContent>
                {nationalities.map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.nationality} />
          </div>

          <div className="grid gap-2 md:col-span-2">
            <PincodeLookup
              pincode={form.pincode}
              city={form.city}
              state={form.state}
              pincodeError={errors.pincode}
              onPincodeChange={(v) => set("pincode", v)}
              onCityChange={(v) => set("city", v)}
              onStateChange={(v) => set("state", v)}
            />
          </div>

          <div className="grid gap-2 md:col-span-2">
            <Label className="text-sm font-medium text-foreground">Address</Label>
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
      <Card className="border-border bg-gradient-to-b from-muted/50 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            2. Professional Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label className="text-sm font-medium text-foreground">
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
            <Label className="text-sm font-medium text-foreground">
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
            <Label className="text-sm font-medium text-foreground">Experience (Years)</Label>
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
            <Label className="text-sm font-medium text-foreground">License Number</Label>
            <Input
              value={form.licenseNo}
              onChange={(e) => set("licenseNo", e.target.value)}
              placeholder="e.g. MH-2024-013"
              className={inputBase("licenseNo")}
            />
            <FieldError message={errors.licenseNo} />
          </div>

          <div className="grid gap-2">
            <Label className="text-sm font-medium text-foreground">Registration Number</Label>
            <Input
              value={form.registrationNo}
              onChange={(e) => set("registrationNo", e.target.value)}
              placeholder="e.g. MCI-123456"
              className={inputBase("registrationNo")}
            />
            <FieldError message={errors.registrationNo} />
          </div>

          <div className="grid gap-2">
            <Label className="text-sm font-medium text-foreground">Issuing Authority</Label>
            <Input
              value={form.issuingAuthority}
              onChange={(e) => set("issuingAuthority", e.target.value)}
              placeholder="e.g. Medical Council of India"
              className={inputBase("issuingAuthority")}
            />
            <FieldError message={errors.issuingAuthority} />
          </div>

          <div className="grid gap-2">
            <Label className="text-sm font-medium text-foreground">Consultation Fee (₹)</Label>
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
            <Label className="text-sm font-medium text-foreground">Department</Label>
            <Select value={form.department} onValueChange={(v) => set("department", v ?? "")}>
              <SelectTrigger className={`${inputBase("department")} w-full`}>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
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
      <Card className="border-border bg-gradient-to-b from-muted/50 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            3. Account & Access
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label className="text-sm font-medium text-foreground">
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
            <Label className="text-sm font-medium text-foreground">
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <FieldError message={errors.password} />
          </div>

          <div className="grid gap-2">
            <Label className="text-sm font-medium text-foreground">
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
              >
                {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <FieldError message={errors.confirmPassword} />
          </div>

          <div className="grid gap-2">
            <Label className="text-sm font-medium text-foreground">Role</Label>
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
            <Label className="text-sm font-medium text-foreground">Status</Label>
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
            <Label className="text-sm font-medium text-foreground">Allow Login</Label>
            <div className="mt-3 space-y-2">
              {(["yes", "no"] as const).map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-3 rounded-lg p-3 hover:bg-accent"
                >
                  <input
                    type="radio"
                    name="allow-login"
                    value={option}
                    checked={form.allowLogin === option}
                    onChange={() => set("allowLogin", option)}
                    className="h-4 w-4 border-primary/30 text-primary"
                  />
                  <span className="text-sm font-medium text-foreground">
                    {option === "yes" ? "Yes, create login account" : "No, access only"}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              A login account is created with the doctor&apos;s email and password.
            </p>
          </div>
        </div>
      </CardContent>
      </Card>

      {/* 4. CONSULTATION SCHEDULE */}
      <Card className="border-border bg-gradient-to-b from-muted/50 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            4. Consultation Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

        <div className="rounded-lg border border-border bg-accent/40 p-4">
          <Label className="mb-3 block text-sm font-medium text-foreground">
            Consultation Schedule
          </Label>
          <div className="space-y-2">
            {DAYS.map((day) => {
              const slot = form.schedule.find((s) => s.day === day.value);
              const selected = !!slot;
              return (
                <div
                  key={day.value}
                  className={`flex flex-wrap items-center gap-3 rounded-lg border bg-background px-3 py-2 transition-colors ${
                    selected ? "border-border" : "border-border opacity-70"
                  }`}
                >
                  <label className="flex min-w-[150px] cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
                    <Checkbox
                      checked={selected}
                      onCheckedChange={(checked) => toggleDay(day.value, !!checked)}
                    />
                    {day.label}
                  </label>
                  {selected ? (
                    <>
                      <div className="flex items-end gap-2">
                        <div className="grid gap-1">
                          <Label className="text-xs text-muted-foreground">Start time</Label>
                          <TimePicker
                            value={slot.start}
                            onChange={(v) => setDaySlot(day.value, { start: v })}
                          />
                        </div>
                        <span className="pb-2.5 text-sm text-muted-foreground">to</span>
                        <div className="grid gap-1">
                          <Label className="text-xs text-muted-foreground">End time</Label>
                          <TimePicker
                            value={slot.end}
                            onChange={(v) => setDaySlot(day.value, { end: v })}
                          />
                        </div>
                      </div>
                      <div className="grid gap-1">
                        <FieldError message={errors[`slot-${day.value}-start`]} />
                        <FieldError message={errors[`slot-${day.value}-end`]} />
                      </div>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">Unavailable</span>
                  )}
                </div>
              );
            })}
            <FieldError message={errors.days} />
          </div>
        </div>
      </CardContent>
      </Card>

      {/* 5. ADDITIONAL INFORMATION */}
      <Card className="border-border bg-gradient-to-b from-muted/50 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            5. Additional Information (Optional)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label className="text-sm font-medium text-foreground">About Doctor</Label>
            <textarea
              value={form.about}
              onChange={(e) => set("about", e.target.value)}
              placeholder="Briefly about the doctor"
              rows={4}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            <FieldError message={errors.about} />
          </div>

          <div className="grid gap-2">
            <Label className="text-sm font-medium text-foreground">Languages Known</Label>
            <textarea
              value={form.languages}
              onChange={(e) => set("languages", e.target.value)}
              placeholder="e.g. English, Hindi, Tamil"
              rows={4}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            <FieldError message={errors.languages} />
          </div>

          <div className="grid gap-2">
            <Label className="text-sm font-medium text-foreground">Notes</Label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Any additional notes"
              rows={4}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            <FieldError message={errors.notes} />
          </div>
        </div>
      </CardContent>
      </Card>
      </fieldset>

      {/* BOTTOM ACTIONS */}
      {!readOnly && (
        <div className="flex gap-3 border-t border-border pt-8">
          <Button
            type="button"
            variant="outline"
            onClick={resetForm}
            disabled={saving}
            className="border-primary/30 text-primary hover:bg-accent"
          >
            Reset
          </Button>
          <div className="flex-1" />
          <Button
            type="submit"
            onClick={submit}
            disabled={saving}
            size="lg"
          >
            {saving ? "Saving..." : "Save Doctor"}
          </Button>
        </div>
      )}
    </form>
  );
}