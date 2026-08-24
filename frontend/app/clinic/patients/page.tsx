"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  type Appointment,
  type Patient,
  assignPatient,
  createPatient,
  deletePatient,
  listAppointments,
  listPatients,
  resendPatientCredentials,
  updatePatient,
  uploadAvatar,
} from "@/lib/clinic-api";
import { bustAvatarCache, PersonAvatar } from "@/components/clinic/person-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PincodeLookup } from "@/components/clinic/pincode-lookup";
import { WhatsAppInput } from "@/components/clinic/whatsapp-input";
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
import { DoctorSelect } from "@/components/clinic/pickers";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { useDropdownOptions } from "@/lib/dropdown-options";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Download, Trash, ChevronLeft, ChevronRight, KeyRound, Mail, Pencil, Eye } from "lucide-react";
import dynamic from "next/dynamic";
import { sessionCan } from "@/hooks/use-clinic-session";
import { patientStatusTone } from "@/lib/status-styles";

const StatsGeneric = dynamic(() => import("@/components/stats-generic"), {
  loading: () => <div className="h-[270px]" aria-hidden="true" />,
});


const GENDERS = ["male", "female", "other"];

interface PatientFormState {
  fullName: string;
  mobile: string;
  whatsapp: string;
  email: string;
  gender: string;
  dateOfBirth: string;
  bloodGroup: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  height: string;
  weight: string;
  occupation: string;
  maritalStatus: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactMobile: string;
  allergies: string;
  medicalConditions: string;
  previousSurgeries: string;
  currentMedications: string;
  idType: string;
  idNumber: string;
  insuranceProvider: string;
  insurancePolicyNumber: string;
  insurancePolicyHolderName: string;
  insuranceValidTill: string;
  referredBy: string;
  howDidYouHear: string;
  notes: string;
  status: string;
  doctorId: string | null;
  password: string;
  profileImage: File | null;
  patientId: string;
}

const EMPTY_FORM: PatientFormState = {
  fullName: "",
  mobile: "",
  whatsapp: "",
  email: "",
  gender: "",
  dateOfBirth: "",
  bloodGroup: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  height: "",
  weight: "",
  occupation: "",
  maritalStatus: "",
  emergencyContactName: "",
  emergencyContactRelationship: "",
  emergencyContactMobile: "",
  allergies: "",
  medicalConditions: "",
  previousSurgeries: "",
  currentMedications: "",
  idType: "",
  idNumber: "",
  insuranceProvider: "",
  insurancePolicyNumber: "",
  insurancePolicyHolderName: "",
  insuranceValidTill: "",
  referredBy: "",
  howDidYouHear: "",
  notes: "",
  status: "active",
  doctorId: null,
  password: "",
  profileImage: null,
  patientId: "",
};

export default function PatientsPage() {
  const session = useRequireRole("doctor");
  const clinicId = session?.clinicId ?? "";
  const { getOptions } = useDropdownOptions(clinicId);
  const bloodGroups = getOptions("blood_groups");
  const [items, setItems] = useState<Patient[]>([]);
  const [apptItems, setApptItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Patient | null>(null);
  const [viewing, setViewing] = useState<Patient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [credentials, setCredentials] = useState<{ patientName: string; email: string; password: string } | null>(null);
  const [resending, setResending] = useState(false);

  // Pagination & selection states
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleColumns] = useState<Record<string, boolean>>({
    select: true,
    name: true,
    mobile: true,
    email: true,
    doctor: true,
    status: true,
  });

  const load = useCallback(() => {
    if (!clinicId) return;
    Promise.allSettled([
      listPatients(clinicId, { limit: 50 }),
      listAppointments(clinicId, { limit: 50 }),
    ])
      .then(([patientRes, apptRes]) => {
        if (patientRes.status === "fulfilled") setItems(patientRes.value.items);
        else toast.error("Failed to load patients");
        if (apptRes.status === "fulfilled") setApptItems(apptRes.value.items);
        setCurrentPage(1);
        setSelectedIds(new Set());
      })
      .finally(() => setLoading(false));
  }, [clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(form: PatientFormState) {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        fullName: form.fullName,
        mobile: form.mobile,
        whatsapp: form.whatsapp || null,
        email: form.email || null,
        gender: form.gender || null,
        dateOfBirth: form.dateOfBirth || null,
        bloodGroup: form.bloodGroup || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        pincode: form.pincode || null,
        height: form.height || null,
        weight: form.weight || null,
        occupation: form.occupation || null,
        maritalStatus: form.maritalStatus || null,
        emergencyContactName: form.emergencyContactName || null,
        emergencyContactRelationship: form.emergencyContactRelationship || null,
        emergencyContactMobile: form.emergencyContactMobile || null,
        allergies: form.allergies
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
        medicalConditions: form.medicalConditions || null,
        previousSurgeries: form.previousSurgeries || null,
        currentMedications: form.currentMedications || null,
        idType: form.idType || null,
        idNumber: form.idNumber || null,
        insuranceProvider: form.insuranceProvider || null,
        insurancePolicyNumber: form.insurancePolicyNumber || null,
        insurancePolicyHolderName: form.insurancePolicyHolderName || null,
        insuranceValidTill: form.insuranceValidTill || null,
        referredBy: form.referredBy || null,
        howDidYouHear: form.howDidYouHear || null,
        notes: form.notes || null,
        doctorId: form.doctorId || null,
      };
      if (editing) {
        payload.status = form.status === "inactive" ? "inactive" : "active";
        await updatePatient(clinicId, editing.patientId, payload);
        if (form.profileImage) {
          try {
            await uploadAvatar(clinicId, "patient", editing.patientId, form.profileImage);
            bustAvatarCache(clinicId, "patient", editing.patientId);
          } catch {
            toast.warning("Patient updated, but the profile photo could not be uploaded");
          }
        }
        toast.success("Patient updated");
      } else {
        const created = await createPatient(clinicId, { ...payload, password: form.password || undefined });
        if (form.profileImage) {
          try {
            await uploadAvatar(clinicId, "patient", created.patientId, form.profileImage);
          } catch {
            toast.warning("Patient created, but the profile photo could not be uploaded");
          }
        }
        toast.success("Patient created");
      }
      setEditing(null);
      setCreating(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save patient");
    } finally {
      setSaving(false);
    }
  }

  async function handleAssign(patient: Patient, doctorId: string | null) {
    try {
      await assignPatient(clinicId, patient.patientId, doctorId);
      toast.success("Patient reassigned");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to assign patient");
    }
  }

  async function handleDelete(patient: Patient) {
    await deletePatient(clinicId, patient.patientId);
    toast.success("Patient deleted");
    load();
  }

  async function handleResendCredentials(patient: Patient) {
    setResending(true);
    try {
      const result = await resendPatientCredentials(clinicId, patient.patientId);
      setCredentials({ patientName: patient.fullName, email: result.email, password: result.password });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to resend credentials");
    } finally {
      setResending(false);
    }
  }

  const canManage = sessionCan(session, "clinic_admin");
  const isDoctor = session?.role === "doctor";

  // Stats calculations
  const totalPatients = items.length;
  const activePatients = items.filter((p) => p.status === "active").length;
  const femalePatients = items.filter((p) => p.gender === "female").length;
  const today = new Date().toISOString().slice(0, 10);
  const upcomingAppointments = apptItems.filter(
    (a) => a.status === "scheduled" && a.date >= today
  ).length;

  const patientStats = useMemo(() => [
    {
      name: "Total Patients",
      percentage: Math.min(100, Math.round((totalPatients / 500) * 100)),
      current: totalPatients,
      allowed: 500,
      allowedLabel: "target",
      fill: "var(--chart-1)",
    },
    {
      name: "Active Patients",
      percentage: totalPatients ? Math.round((activePatients / totalPatients) * 100) : 0,
      current: activePatients,
      allowed: totalPatients,
      allowedLabel: "registered",
      fill: "var(--chart-2)",
    },
    {
      name: "Female Patients",
      percentage: totalPatients ? Math.round((femalePatients / totalPatients) * 100) : 0,
      current: femalePatients,
      allowed: totalPatients,
      allowedLabel: "registered",
      fill: "var(--chart-3)",
    },
    {
      name: "Upcoming Appointments",
      percentage: totalPatients ? Math.min(100, Math.round((upcomingAppointments / totalPatients) * 100)) : 0,
      current: upcomingAppointments,
      allowed: totalPatients,
      allowedLabel: "patients",
      fill: "var(--chart-4)",
    },
  ], [totalPatients, activePatients, femalePatients, upcomingAppointments]);

  // Bulk actions helper
  const handleBulkExport = () => {
    const selectedPatients = items.filter((p) => selectedIds.has(p.patientId));
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selectedPatients, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `patients_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success(`Exported ${selectedPatients.length} patients to JSON.`);
  };

  const handleBulkDelete = async () => {
    try {
      setLoading(true);
      await Promise.all(
        Array.from(selectedIds).map((id) => deletePatient(clinicId, id))
      );
      toast.success(`Successfully deleted ${selectedIds.size} patients.`);
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
        toast.error("Failed to delete selected patients.");
      }
      load();
    } finally {
      setLoading(false);
      setBulkDeleteOpen(false);
    }
  };

  // Client-side search filtering
  const filteredItems = useMemo(() => {
    if (!q) return items;
    const lower = q.toLowerCase();
    return items.filter((p) => {
      return (
        p.fullName.toLowerCase().includes(lower) ||
        (p.email && p.email.toLowerCase().includes(lower)) ||
        p.mobile.includes(lower) ||
        (p.city && p.city.toLowerCase().includes(lower))
      );
    });
  }, [items, q]);

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
      setSelectedIds(new Set(paginatedItems.map((p) => p.patientId)));
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
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreating(false)}
            className="h-9 gap-1.5"
          >
            <ChevronLeft className="size-4" />
            Back to Patients
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">New Patient</h1>
            <p className="text-sm text-muted-foreground">Register a new patient profile at this clinic.</p>
          </div>
        </div>
        <Card className="border-border shadow-sm max-w-2xl">
          <CardHeader className="border-b border-border bg-muted/20 px-6 py-4">
            <CardTitle className="text-lg font-semibold">Patient Information</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <PatientForm
              clinicId={clinicId}
              initial={EMPTY_FORM}
              saving={saving}
              onSave={async (form) => {
                await handleSave(form);
                setCreating(false);
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-6">
        <Card className="border-border shadow-sm">
          <CardHeader className="border-b border-border bg-muted/20 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditing(null)}
                  aria-label="Back to patients"
                  className="size-8"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <CardTitle className="text-lg font-semibold">Patient Information</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setViewing(editing)}
              >
                <Eye className="size-4" />
                View
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <PatientForm
              clinicId={clinicId}
              initial={{
                fullName: editing.fullName,
                mobile: editing.mobile,
                whatsapp: editing.whatsapp ?? "",
                email: editing.email ?? "",
                gender: editing.gender ?? "",
                dateOfBirth: editing.dateOfBirth ?? "",
                bloodGroup: editing.bloodGroup ?? "",
                address: editing.address ?? "",
                city: editing.city ?? "",
                state: editing.state ?? "",
                pincode: editing.pincode ?? "",
                height: editing.height ?? "",
                weight: editing.weight ?? "",
                occupation: editing.occupation ?? "",
                maritalStatus: editing.maritalStatus ?? "",
                emergencyContactName: editing.emergencyContactName ?? "",
                emergencyContactRelationship: editing.emergencyContactRelationship ?? "",
                emergencyContactMobile: editing.emergencyContactMobile ?? "",
                allergies: (editing.allergies ?? []).join(", "),
                medicalConditions: editing.medicalConditions ?? "",
                previousSurgeries: editing.previousSurgeries ?? "",
                currentMedications: editing.currentMedications ?? "",
                idType: editing.idType ?? "",
                idNumber: editing.idNumber ?? "",
                insuranceProvider: editing.insuranceProvider ?? "",
                insurancePolicyNumber: editing.insurancePolicyNumber ?? "",
                insurancePolicyHolderName: editing.insurancePolicyHolderName ?? "",
                insuranceValidTill: editing.insuranceValidTill ?? "",
                referredBy: editing.referredBy ?? "",
                howDidYouHear: editing.howDidYouHear ?? "",
                notes: editing.notes ?? "",
                status: editing.status ?? "active",
                doctorId: editing.doctorId,
                password: "",
                profileImage: null,
                patientId: editing.patientId,
              }}
              saving={saving}
              onSave={async (form) => {
                await handleSave(form);
                setEditing(null);
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (viewing) {
    return (
      <div className="flex flex-col gap-6">
        <Card className="border-border shadow-sm">
          <CardHeader className="border-b border-border bg-muted/20 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewing(null)}
                  aria-label="Back to patients"
                  className="size-8"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <CardTitle className="text-lg font-semibold">Patient Information</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setEditing(viewing)}
              >
                <Pencil className="size-4" />
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <PatientForm
              clinicId={clinicId}
              initial={{
                fullName: viewing.fullName,
                mobile: viewing.mobile,
                whatsapp: viewing.whatsapp ?? "",
                email: viewing.email ?? "",
                gender: viewing.gender ?? "",
                dateOfBirth: viewing.dateOfBirth ?? "",
                bloodGroup: viewing.bloodGroup ?? "",
                address: viewing.address ?? "",
                city: viewing.city ?? "",
                state: viewing.state ?? "",
                pincode: viewing.pincode ?? "",
                height: viewing.height ?? "",
                weight: viewing.weight ?? "",
                occupation: viewing.occupation ?? "",
                maritalStatus: viewing.maritalStatus ?? "",
                emergencyContactName: viewing.emergencyContactName ?? "",
                emergencyContactRelationship: viewing.emergencyContactRelationship ?? "",
                emergencyContactMobile: viewing.emergencyContactMobile ?? "",
                allergies: (viewing.allergies ?? []).join(", "),
                medicalConditions: viewing.medicalConditions ?? "",
                previousSurgeries: viewing.previousSurgeries ?? "",
                currentMedications: viewing.currentMedications ?? "",
                idType: viewing.idType ?? "",
                idNumber: viewing.idNumber ?? "",
                insuranceProvider: viewing.insuranceProvider ?? "",
                insurancePolicyNumber: viewing.insurancePolicyNumber ?? "",
                insurancePolicyHolderName: viewing.insurancePolicyHolderName ?? "",
                insuranceValidTill: viewing.insuranceValidTill ?? "",
                referredBy: viewing.referredBy ?? "",
                howDidYouHear: viewing.howDidYouHear ?? "",
                notes: viewing.notes ?? "",
                status: viewing.status ?? "active",
                doctorId: viewing.doctorId,
                password: "",
                profileImage: null,
                patientId: viewing.patientId,
              }}
              saving={false}
              readOnly={true}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stats Section with action slot */}
      {!loading && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <StatsGeneric
            title="Patient Directory"
            description={
              isDoctor
                ? "Real-time analytics on patients assigned to you. You can only see patients assigned to your care."
                : "Real-time analytics on patient demographics, engagement, and registrations."
            }
            items={patientStats}
            action={
              !isDoctor && (
                <Link href="/clinic/patients/new">
                  <Button className="flex items-center gap-1.5 shadow-sm">
                    <Plus className="size-4" />
                    New Patient
                  </Button>
                </Link>
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
            {canManage && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBulkDeleteOpen(true)}
                className="h-8 gap-1.5 shadow-sm"
              >
                <Trash className="size-3.5" />
                Delete Selected
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Search Controls - Centered Outside Card */}
      <div className="flex justify-center">
        <div className="relative w-full max-w-md sm:w-72">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search patients..."
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setCurrentPage(1);
            }}
            className="h-9 w-full pl-9"
          />
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
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No patients found.
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
                    {visibleColumns.mobile && <TableHead>Mobile</TableHead>}
                    {visibleColumns.email && <TableHead>Email</TableHead>}
                    {visibleColumns.doctor && !isDoctor && <TableHead>Doctor</TableHead>}
                    {visibleColumns.status && <TableHead>Status</TableHead>}
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((p) => (
                    <TableRow
                      key={p.patientId}
                      className={`hover:bg-muted/30 border-b border-border last:border-0 ${selectedIds.has(p.patientId) ? "bg-muted/30" : ""}`}
                    >
                      {visibleColumns.select && (
                        <TableCell className="pl-6">
                          <Checkbox
                            checked={selectedIds.has(p.patientId)}
                            onCheckedChange={() => toggleSelectRow(p.patientId)}
                            aria-label={`Select ${p.fullName}`}
                          />
                        </TableCell>
                      )}
                      {visibleColumns.name && (
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <PersonAvatar clinicId={clinicId} ownerType="patient" ownerId={p.patientId} name={p.fullName} />
                            <span className="font-medium text-foreground">{p.fullName}</span>
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.mobile && <TableCell className="text-muted-foreground">{p.mobile}</TableCell>}
                      {visibleColumns.email && <TableCell className="text-muted-foreground">{p.email ?? "—"}</TableCell>}
                      {visibleColumns.doctor && !isDoctor && (
                        <TableCell>
                          <DoctorSelect
                            clinicId={clinicId}
                            value={p.doctorId}
                            onChange={(v) => handleAssign(p, v)}
                            allowEmpty
                          />
                        </TableCell>
                      )}
                      {visibleColumns.status && (
                        <TableCell>
                          <Badge
                            className={patientStatusTone(p.status)}
                            variant="outline"
                          >
                            {p.status}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setViewing(p)}>View</Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditing(p)}>Edit</Button>
                          {canManage && p.userId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={resending}
                              onClick={() => handleResendCredentials(p)}
                            >
                              Resend
                            </Button>
                          )}
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteTarget(p)}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </TableCell>
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
        title={`Delete patient ${deleteTarget?.fullName ?? ""}?`}
        description="This will permanently delete the patient and their medical records. This action cannot be undone."
        onConfirm={async () => {
          if (deleteTarget) await handleDelete(deleteTarget);
        }}
      />

      <ConfirmDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => {
          if (!open) setBulkDeleteOpen(false);
        }}
        title="Delete selected patients?"
        description="This will permanently delete all selected patients and their medical records. This action cannot be undone."
        confirmLabel="Delete All"
        onConfirm={handleBulkDelete}
      />

      <Dialog
        open={credentials !== null}
        onOpenChange={(open) => {
          if (!open) setCredentials(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/10">
              <KeyRound className="size-7 text-success" />
            </div>
            <DialogTitle className="text-center text-lg">Credentials Sent</DialogTitle>
            <DialogDescription className="text-center">
              New portal login for {credentials?.patientName} has been sent via WhatsApp. Share these details securely.
            </DialogDescription>
          </DialogHeader>

          {credentials && (
            <div className="rounded-xl border bg-accent/40 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Mail className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Portal Login (Email)</p>
                  <p className="truncate text-sm font-medium text-foreground">{credentials.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <KeyRound className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">New Password</p>
                  <p className="text-sm font-medium text-foreground">{credentials.password}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button className="w-full" onClick={() => setCredentials(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PatientForm({
  clinicId,
  initial,
  saving,
  onSave,
  readOnly,
}: {
  clinicId: string;
  initial: PatientFormState;
  saving: boolean;
  onSave?: (form: PatientFormState) => Promise<void>;
  readOnly?: boolean;
}) {
  const [form, setForm] = useState<PatientFormState>(initial);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { getOptions } = useDropdownOptions(clinicId);
  const bloodGroups = getOptions("blood_groups");
  const set = <K extends keyof PatientFormState>(key: K, value: PatientFormState[K] | null) =>
    setForm((f) => ({ ...f, [key]: (value ?? "") as PatientFormState[K] }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (onSave) await onSave(form);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <fieldset disabled={readOnly} className="grid gap-3 border-0 p-0 m-0">
        <div className="flex items-center gap-3">
          {form.profileImage && previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Patient photo preview"
              className="size-12 shrink-0 rounded-full border border-border object-cover"
            />
          ) : (
            <PersonAvatar
              clinicId={clinicId}
              ownerType="patient"
              ownerId={form.patientId || "none"}
              name={form.fullName || "?"}
              className="size-12 text-sm"
            />
          )}
          <div className="min-w-0 flex-1">
            <Label>Patient Photo</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              JPG or PNG, max 2MB
            </p>
          </div>
          <input
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            id="patient-photo-input"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              e.target.value = "";
              if (!file) return;
              if (!["image/jpeg", "image/png"].includes(file.type)) {
                toast.error("Only JPG or PNG images are allowed");
                return;
              }
              if (file.size > 2 * 1024 * 1024) {
                toast.error("Image must be smaller than 2MB");
                return;
              }
              if (previewUrl) URL.revokeObjectURL(previewUrl);
              setPreviewUrl(URL.createObjectURL(file));
              set("profileImage", file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => document.getElementById("patient-photo-input")?.click()}
          >
            {form.profileImage ? "Change Photo" : "Upload Photo"}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Full name</Label>
            <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} required minLength={2} />
          </div>
          <div className="grid gap-2">
            <Label>Mobile</Label>
            <Input value={form.mobile} onChange={(e) => set("mobile", e.target.value)} required minLength={8} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>WhatsApp Number</Label>
            <WhatsAppInput value={form.whatsapp} onChange={(v) => set("whatsapp", v)} />
          </div>
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Gender</Label>
            <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {GENDERS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Date of birth</Label>
            <Input type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Blood group</Label>
            <Select value={form.bloodGroup} onValueChange={(v) => set("bloodGroup", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {bloodGroups.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <PincodeLookup
          pincode={form.pincode}
          city={form.city}
          state={form.state}
          onPincodeChange={(v) => set("pincode", v)}
          onCityChange={(v) => set("city", v)}
          onStateChange={(v) => set("state", v)}
        />
        <div className="grid gap-2">
          <Label>Address</Label>
          <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Allergies (comma separated)</Label>
          <Input value={form.allergies} onChange={(e) => set("allergies", e.target.value)} placeholder="Penicillin, Dust" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Height (cm)</Label>
            <Input value={form.height} onChange={(e) => set("height", e.target.value)} placeholder="170" />
          </div>
          <div className="grid gap-2">
            <Label>Weight (kg)</Label>
            <Input value={form.weight} onChange={(e) => set("weight", e.target.value)} placeholder="65" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Occupation</Label>
            <Input value={form.occupation} onChange={(e) => set("occupation", e.target.value)} placeholder="Software Engineer" />
          </div>
          <div className="grid gap-2">
            <Label>Marital status</Label>
            <Select value={form.maritalStatus} onValueChange={(v) => set("maritalStatus", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {getOptions("marital_statuses").map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Record status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="grid gap-2">
            <Label>Emergency contact</Label>
            <Input value={form.emergencyContactName} onChange={(e) => set("emergencyContactName", e.target.value)} placeholder="Name" />
          </div>
          <div className="grid gap-2">
            <Label>Relationship</Label>
            <Input value={form.emergencyContactRelationship} onChange={(e) => set("emergencyContactRelationship", e.target.value)} placeholder="Spouse" />
          </div>
          <div className="grid gap-2">
            <Label>Mobile</Label>
            <Input value={form.emergencyContactMobile} onChange={(e) => set("emergencyContactMobile", e.target.value)} placeholder="98765 43210" />
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Medical conditions</Label>
          <Input value={form.medicalConditions} onChange={(e) => set("medicalConditions", e.target.value)} placeholder="Diabetes, hypertension" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Previous surgeries</Label>
            <Input value={form.previousSurgeries} onChange={(e) => set("previousSurgeries", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Current medications</Label>
            <Input value={form.currentMedications} onChange={(e) => set("currentMedications", e.target.value)} placeholder="Metformin 500mg" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>ID type</Label>
            <Select value={form.idType} onValueChange={(v) => set("idType", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {getOptions("id_proof_types").map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>ID number</Label>
            <Input value={form.idNumber} onChange={(e) => set("idNumber", e.target.value)} placeholder="Aadhaar / PAN" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Insurance provider</Label>
            <Input value={form.insuranceProvider} onChange={(e) => set("insuranceProvider", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Policy number</Label>
            <Input value={form.insurancePolicyNumber} onChange={(e) => set("insurancePolicyNumber", e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Policy holder name</Label>
            <Input value={form.insurancePolicyHolderName} onChange={(e) => set("insurancePolicyHolderName", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Valid till</Label>
            <Input type="date" value={form.insuranceValidTill} onChange={(e) => set("insuranceValidTill", e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Referred by</Label>
            <Input value={form.referredBy} onChange={(e) => set("referredBy", e.target.value)} placeholder="Dr. Sharma" />
          </div>
          <div className="grid gap-2">
            <Label>How did you hear about us?</Label>
            <Select value={form.howDidYouHear} onValueChange={(v) => set("howDidYouHear", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {getOptions("how_did_you_hear").map((h) => (
                  <SelectItem key={h} value={h}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Doctor</Label>
          <DoctorSelect
            clinicId={clinicId}
            value={form.doctorId}
            onChange={(v) => set("doctorId", v)}
            allowEmpty
          />
        </div>
        {!initial.fullName && (
          <div className="grid gap-2">
            <Label>Portal password (creates patient login)</Label>
            <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} minLength={8} placeholder="min. 8 characters" />
          </div>
        )}
        <div className="grid gap-2">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
        </div>
      </fieldset>
      {!readOnly && (
        <DialogFooter>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save patient"}
          </Button>
        </DialogFooter>
      )}
    </form>
  );
}