"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  type Patient,
  assignPatient,
  createPatient,
  deletePatient,
  listPatients,
  updatePatient,
} from "@/lib/clinic-api";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Download, Trash, Columns, ChevronLeft, ChevronRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import StatsGeneric from "@/components/stats-generic";
import { sessionCan } from "@/hooks/use-clinic-session";

const COLUMN_LABELS: Record<string, string> = {
  select: "Select",
  name: "Name",
  mobile: "Mobile",
  email: "Email",
  doctor: "Assigned Doctor",
  status: "Status",
};

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
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
  allergies: string;
  notes: string;
  doctorId: string | null;
  password: string;
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
  allergies: "",
  notes: "",
  doctorId: null,
  password: "",
};

export default function PatientsPage() {
  const session = useRequireRole("doctor");
  const clinicId = session?.clinicId ?? "";
  const [items, setItems] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Patient | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Pagination & selection states
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    select: true,
    name: true,
    mobile: true,
    email: true,
    doctor: true,
    status: true,
  });

  const load = useCallback(() => {
    if (!clinicId) return;
    listPatients(clinicId, { limit: 500 })
      .then((res) => {
        setItems(res.items);
        setCurrentPage(1);
        setSelectedIds(new Set());
      })
      .catch(() => toast.error("Failed to load patients"))
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
        allergies: form.allergies
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
        notes: form.notes || null,
      };
      if (editing) {
        await updatePatient(clinicId, editing.patientId, payload);
        toast.success("Patient updated");
      } else {
        await createPatient(clinicId, { ...payload, password: form.password || undefined });
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
    if (!confirm(`Delete patient ${patient.fullName}?`)) return;
    try {
      await deletePatient(clinicId, patient.patientId);
      toast.success("Patient deleted");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete patient");
    }
  }

  const canManage = sessionCan(session, "clinic_admin");
  const isDoctor = session?.role === "doctor";

  // Stats calculations
  const totalPatients = items.length;
  const activePatients = items.filter((p) => p.status === "active").length;
  const femalePatients = items.filter((p) => p.gender === "female").length;
  const emailPatients = items.filter((p) => p.email).length;

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
      name: "Email Coverage",
      percentage: totalPatients ? Math.round((emailPatients / totalPatients) * 100) : 0,
      current: emailPatients,
      allowed: totalPatients,
      allowedLabel: "registered",
      fill: "var(--chart-4)",
    },
  ], [totalPatients, activePatients, femalePatients, emailPatients]);

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
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(null)}
            className="h-9 gap-1.5"
          >
            <ChevronLeft className="size-4" />
            Back to Patients
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Edit Patient</h1>
            <p className="text-sm text-muted-foreground">Modify patient demographics, status, or notes.</p>
          </div>
        </div>
        <Card className="border-border shadow-sm max-w-2xl">
          <CardHeader className="border-b border-border bg-muted/20 px-6 py-4">
            <CardTitle className="text-lg font-semibold">Patient Information</CardTitle>
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
                allergies: (editing.allergies ?? []).join(", "),
                notes: editing.notes ?? "",
                doctorId: editing.doctorId,
                password: "",
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
          </div>
        </div>
      )}

      {/* Main card containing listing */}
      <Card className="border-border shadow-sm">
        <CardHeader className="border-b border-border bg-muted/20 px-6 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-semibold text-foreground">
                Patients Listing
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {isDoctor
                  ? "Only patients assigned to you are listed here. Other patients are never visible."
                  : "Manage registered clinic patients, assign primary doctors, and view profile records."}
              </p>
            </div>
            <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:w-auto">
              <div className="relative mx-auto w-full max-w-md sm:w-72">
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
                  {Object.keys(COLUMN_LABELS)
                    .filter((colKey) => !(isDoctor && colKey === "doctor"))
                    .map((colKey) => (
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
                      {visibleColumns.name && <TableCell className="font-medium text-foreground">{p.fullName}</TableCell>}
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
                            className={
                              p.status === "active"
                                ? "bg-green-50 text-green-700 hover:bg-green-50 border-green-200"
                                : "bg-slate-50 text-slate-700 hover:bg-slate-50 border-slate-200"
                            }
                            variant="outline"
                          >
                            {p.status}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setEditing(p)}>Edit</Button>
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(p)}
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
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-muted/20">
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

function PatientForm({
  clinicId,
  initial,
  saving,
  onSave,
}: {
  clinicId: string;
  initial: PatientFormState;
  saving: boolean;
  onSave: (form: PatientFormState) => Promise<void>;
}) {
  const [form, setForm] = useState<PatientFormState>(initial);
  const set = <K extends keyof PatientFormState>(key: K, value: PatientFormState[K] | null) =>
    setForm((f) => ({ ...f, [key]: (value ?? "") as PatientFormState[K] }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await onSave(form);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3">
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
                {BLOOD_GROUPS.map((b) => (
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
      </div>
      <DialogFooter>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save patient"}
        </Button>
      </DialogFooter>
    </form>
  );
}