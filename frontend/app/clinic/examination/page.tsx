"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  OdontogramShell,
  getStatusChart,
} from "react-advanced-odontogram";
import "../investigation/odontogram.css";
import { useRequireRole, sessionCan } from "@/hooks/use-clinic-session";
import {
  type Examination,
  type ExaminationStatus,
  type MedicineRecord,
  createExamination,
  createInvestigation,
  deleteExamination,
  getInvestigation,
  listExaminations,
  listRecords,
  updateExamination,
} from "@/lib/clinic-api";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { PatientSelect } from "@/components/clinic/pickers";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format-time";
import { todayISO } from "@/lib/datetime";
import {
  ArrowLeft,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Search,
  Stethoscope,
  Trash,
} from "lucide-react";

const STATUS_OPTIONS: { value: ExaminationStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_BADGE: Record<ExaminationStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  "in-progress": "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-slate-100 text-slate-600",
};

type IssueType = "hard" | "soft";

const ISSUE_OPTIONS: { value: IssueType; label: string }[] = [
  { value: "hard", label: "Hard" },
  { value: "soft", label: "Soft" },
];

const ISSUE_BADGE: Record<IssueType, string> = {
  hard: "bg-red-100 text-red-800",
  soft: "bg-sky-100 text-sky-800",
};

type Screen =
  | { name: "table" }
  | { name: "form"; mode: "create" }
  | { name: "form"; mode: "edit"; record: Examination }
  | { name: "form"; mode: "view"; record: Examination };

interface FormState {
  patientId: string;
  visitDate: string;
  status: ExaminationStatus;
  issueType: IssueType | "";
  oralFindings: string;
  notes: string;
  // Medical history (moved here from patient registration).
  allergies: string;
  medicalConditions: string;
  previousSurgeries: string;
  currentMedications: string;
  patientHistory: string;
  familyHistory: string;
  habits: string;
  // Embedded investigation form (create mode only).
  includeInvestigation: boolean;
  showInvestigation: boolean;
  invTitle: string;
  invVisitDate: string;
  invStatus: ExaminationStatus;
  invNotes: string;
  invMedicalRecordId: string;
}

function emptyForm(): FormState {
  return {
    patientId: "",
    visitDate: todayISO(),
    status: "pending",
    issueType: "",
    oralFindings: "",
    notes: "",
    allergies: "",
    medicalConditions: "",
    previousSurgeries: "",
    currentMedications: "",
    patientHistory: "",
    familyHistory: "",
    habits: "",
    includeInvestigation: true,
    showInvestigation: true,
    invTitle: "",
    invVisitDate: todayISO(),
    invStatus: "pending",
    invNotes: "",
    invMedicalRecordId: "",
  };
}

export default function ExaminationPage() {
  const session = useRequireRole("patient");
  const clinicId = session?.clinicId ?? "";
  const canManage = sessionCan(session, "doctor");
  const canDelete = sessionCan(session, "clinic_admin");

  const [screen, setScreen] = useState<Screen>({ name: "table" });
  const [items, setItems] = useState<Examination[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [form, setForm] = useState<FormState>(emptyForm());
  const [records, setRecords] = useState<MedicineRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Examination | null>(null);
  const [linkedInvTitle, setLinkedInvTitle] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!clinicId) return;
    setLoading(true);
    listExaminations(clinicId, { limit: 100 })
      .then((res) => {
        setItems(res.items ?? []);
        setTotal(res.total ?? 0);
      })
      .catch((e) =>
        toast.error(e instanceof Error ? e.message : "Failed to load examinations")
      )
      .finally(() => setLoading(false));
  }, [clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  // Medical records of the selected patient for the embedded
  // investigation's link picker (create mode only).
  useEffect(() => {
    if (screen.name !== "form" || screen.mode !== "create" || !clinicId) return;
    if (!form.patientId) {
      setRecords([]);
      return;
    }
    setRecordsLoading(true);
    listRecords(clinicId, { patientId: form.patientId, limit: 50 })
      .then((res) => setRecords(res.items ?? []))
      .catch(() => setRecords([]))
      .finally(() => setRecordsLoading(false));
  }, [screen, form.patientId, clinicId]);

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!term) return true;
      return (
        item.patientName.toLowerCase().includes(term) ||
        item.oralFindings.toLowerCase().includes(term) ||
        (item.notes ?? "").toLowerCase().includes(term)
      );
    });
  }, [items, searchTerm, statusFilter]);

  function openCreate() {
    setForm(emptyForm());
    setScreen({ name: "form", mode: "create" });
  }

  function openEdit(record: Examination) {
    setForm({
      ...emptyForm(),
      patientId: record.patientId,
      visitDate: record.visitDate,
      status: record.status,
      issueType: record.issueType,
      oralFindings: record.oralFindings,
      notes: record.notes ?? "",
      allergies: record.allergies ?? "",
      medicalConditions: record.medicalConditions ?? "",
      previousSurgeries: record.previousSurgeries ?? "",
      currentMedications: record.currentMedications ?? "",
      patientHistory: record.patientHistory ?? "",
      familyHistory: record.familyHistory ?? "",
      habits: record.habits ?? "",
      includeInvestigation: false,
    });
    setLinkedInvTitle(null);
    setScreen({ name: "form", mode: "edit", record });
    if (record.investigationId) {
      getInvestigation(clinicId, record.investigationId)
        .then((inv) => setLinkedInvTitle(inv.title))
        .catch(() => setLinkedInvTitle(null));
    }
  }

  function openView(record: Examination) {
    setLinkedInvTitle(null);
    setScreen({ name: "form", mode: "view", record });
    if (record.investigationId) {
      getInvestigation(clinicId, record.investigationId)
        .then((inv) => setLinkedInvTitle(inv.title))
        .catch(() => setLinkedInvTitle(null));
    }
  }

  async function handleSave() {
    if (screen.name !== "form" || screen.mode === "view") return;
    if (!form.patientId) {
      toast.error("Please select a patient");
      return;
    }
    if (!form.issueType) {
      toast.error("Please select the issue type (Hard / Soft)");
      return;
    }
    if (form.oralFindings.trim().length < 2) {
      toast.error("Please enter the oral findings");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        visitDate: form.visitDate,
        status: form.status,
        issueType: form.issueType,
        oralFindings: form.oralFindings.trim(),
        notes: form.notes.trim() || null,
        allergies: form.allergies.trim() || null,
        medicalConditions: form.medicalConditions.trim() || null,
        previousSurgeries: form.previousSurgeries.trim() || null,
        currentMedications: form.currentMedications.trim() || null,
        patientHistory: form.patientHistory.trim() || null,
        familyHistory: form.familyHistory.trim() || null,
        habits: form.habits.trim() || null,
      };
      if (screen.mode === "create") {
        payload.patientId = form.patientId;
        // Create the embedded investigation first so its id can be linked.
        if (form.includeInvestigation) {
          if (form.invTitle.trim().length < 2) {
            toast.error("Please enter the investigation title");
            setSaving(false);
            return;
          }
          let chartData: Record<string, unknown> | null = null;
          try {
            const chart = getStatusChart() as unknown;
            if (chart && typeof chart === "object") {
              chartData = chart as Record<string, unknown>;
            }
          } catch {
            chartData = null;
          }
          const inv = await createInvestigation(clinicId, {
            patientId: form.patientId,
            title: form.invTitle.trim(),
            visitDate: form.invVisitDate,
            status: form.invStatus,
            notes: form.invNotes.trim() || null,
            medicalRecordId: form.invMedicalRecordId || null,
            chartData,
          });
          payload.investigationId = inv.investigationId;
        }
        await createExamination(clinicId, payload);
        toast.success("Examination created successfully");
      } else {
        await updateExamination(clinicId, screen.record.examinationId, payload);
        toast.success("Examination updated successfully");
      }
      setScreen({ name: "table" });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save examination");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteExamination(clinicId, deleteTarget.examinationId);
      toast.success("Examination deleted successfully");
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete examination");
    }
  }

  if (screen.name === "form") {
    const mode = screen.mode;
    const readOnly = mode === "view";
    const patientName =
      mode === "create" ? "" : screen.record.patientName;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setScreen({ name: "table" })}
          >
            <ArrowLeft className="size-4" />
            Back to examinations
          </Button>
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {mode === "create"
              ? "New Examination"
              : mode === "edit"
                ? "Edit Examination"
                : "View Examination"}
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:mt-1 sm:text-sm">
            {mode === "view"
              ? "Read-only examination record."
              : "Select the patient and record the oral findings."}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            <div className="space-y-2">
              <Label>Patient</Label>
              {mode === "create" ? (
                <PatientSelect
                  clinicId={clinicId}
                  value={form.patientId || null}
                  onChange={(v) =>
                    setForm((f) => ({ ...f, patientId: v ?? "" }))
                  }
                  required
                />
              ) : (
                <Input value={patientName} disabled />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="exam-date">Visit date</Label>
              <Input
                id="exam-date"
                type="date"
                value={mode === "view" ? screen.record.visitDate : form.visitDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, visitDate: e.target.value }))
                }
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              {readOnly ? (
                <div>
                  <Badge className={STATUS_BADGE[screen.record.status]}>
                    {screen.record.status}
                  </Badge>
                </div>
              ) : (
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      status: v as ExaminationStatus,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Issues</Label>
              {readOnly ? (
                <div>
                  <Badge className={ISSUE_BADGE[screen.record.issueType]}>
                    {screen.record.issueType}
                  </Badge>
                </div>
              ) : (
                <Select
                  value={form.issueType || "__none"}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      issueType: (v === "__none" ? "" : v) as IssueType | "",
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select issue type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ISSUE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="exam-oral">Oral findings</Label>
              <Textarea
                id="exam-oral"
                value={readOnly ? (screen.record.oralFindings ?? "") : form.oralFindings}
                onChange={(e) =>
                  setForm((f) => ({ ...f, oralFindings: e.target.value }))
                }
                placeholder="Describe the oral examination findings…"
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="exam-notes">Notes</Label>
              <Textarea
                id="exam-notes"
                value={readOnly ? (screen.record.notes ?? "") : form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Additional notes for this examination…"
                disabled={readOnly}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Medical Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="exam-allergies">Known allergies</Label>
              <Input
                id="exam-allergies"
                value={readOnly ? (screen.record.allergies ?? "") : form.allergies}
                onChange={(e) =>
                  setForm((f) => ({ ...f, allergies: e.target.value }))
                }
                placeholder="Penicillin, Nuts (comma-separated)"
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exam-conditions">Medical conditions</Label>
              <Textarea
                id="exam-conditions"
                value={readOnly ? (screen.record.medicalConditions ?? "") : form.medicalConditions}
                onChange={(e) =>
                  setForm((f) => ({ ...f, medicalConditions: e.target.value }))
                }
                placeholder="Diabetes, Hypertension…"
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exam-surgeries">Previous surgeries / hospitalizations</Label>
              <Textarea
                id="exam-surgeries"
                value={readOnly ? (screen.record.previousSurgeries ?? "") : form.previousSurgeries}
                onChange={(e) =>
                  setForm((f) => ({ ...f, previousSurgeries: e.target.value }))
                }
                placeholder="Appendectomy (2015)…"
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exam-meds">Current medications</Label>
              <Textarea
                id="exam-meds"
                value={readOnly ? (screen.record.currentMedications ?? "") : form.currentMedications}
                onChange={(e) =>
                  setForm((f) => ({ ...f, currentMedications: e.target.value }))
                }
                placeholder="Aspirin 500mg (daily)…"
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exam-history">Patient history</Label>
              <Textarea
                id="exam-history"
                value={readOnly ? (screen.record.patientHistory ?? "") : form.patientHistory}
                onChange={(e) =>
                  setForm((f) => ({ ...f, patientHistory: e.target.value }))
                }
                placeholder="Past illnesses, treatments, hospitalizations…"
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exam-family">Family history</Label>
              <Textarea
                id="exam-family"
                value={readOnly ? (screen.record.familyHistory ?? "") : form.familyHistory}
                onChange={(e) =>
                  setForm((f) => ({ ...f, familyHistory: e.target.value }))
                }
                placeholder="Diabetes, heart disease in family…"
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exam-habits">Habits</Label>
              <Textarea
                id="exam-habits"
                value={readOnly ? (screen.record.habits ?? "") : form.habits}
                onChange={(e) =>
                  setForm((f) => ({ ...f, habits: e.target.value }))
                }
                placeholder="Smoking, alcohol, diet, exercise…"
                disabled={readOnly}
              />
            </div>
          </CardContent>
        </Card>

        {mode === "create" && (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                <CardTitle className="text-base sm:text-lg">Investigation</CardTitle>
                <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end sm:gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-medium sm:text-sm">
                    <Checkbox
                      checked={form.includeInvestigation}
                      onCheckedChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          includeInvestigation: v === true,
                        }))
                      }
                    />
                    Include investigation
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        showInvestigation: !f.showInvestigation,
                      }))
                    }
                  >
                    {form.showInvestigation ? "Hide" : "Show"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            {form.showInvestigation && (
              <CardContent className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="exam-inv-title">Title</Label>
                  <Input
                    id="exam-inv-title"
                    value={form.invTitle}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, invTitle: e.target.value }))
                    }
                    placeholder="e.g. Root canal assessment — 46"
                    disabled={!form.includeInvestigation}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exam-inv-date">Visit date</Label>
                  <Input
                    id="exam-inv-date"
                    type="date"
                    value={form.invVisitDate}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, invVisitDate: e.target.value }))
                    }
                    disabled={!form.includeInvestigation}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.invStatus}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        invStatus: v as ExaminationStatus,
                      }))
                    }
                    disabled={!form.includeInvestigation}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Linked medical record (optional)</Label>
                  <Select
                    value={form.invMedicalRecordId || "__none"}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        invMedicalRecordId: !v || v === "__none" ? "" : v,
                      }))
                    }
                    disabled={
                      !form.includeInvestigation ||
                      recordsLoading ||
                      !form.patientId
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          !form.patientId
                            ? "Select a patient first"
                            : recordsLoading
                              ? "Loading records…"
                              : "No linked record"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">No linked record</SelectItem>
                      {records.map((r) => (
                        <SelectItem key={r.recordId} value={r.recordId}>
                          {r.visitDate} — {r.diagnosis}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="exam-inv-notes">Notes</Label>
                  <Textarea
                    id="exam-inv-notes"
                    value={form.invNotes}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, invNotes: e.target.value }))
                    }
                    placeholder="Clinical notes for this investigation…"
                    disabled={!form.includeInvestigation}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Dental odontogram</Label>
                  <div className="isolate overflow-auto rounded-xl border bg-white">
                    <OdontogramShell
                      key="exam-new-investigation"
                      language="en"
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {mode !== "create" && screen.record.investigationId && (
          <Card>
            <CardHeader>
              <CardTitle>Linked investigation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                <p className="min-w-0 flex-1 truncate text-sm font-medium">
                  {linkedInvTitle ?? screen.record.investigationId}
                </p>
                <Button variant="outline" size="sm" className="w-full justify-center sm:w-auto" render={<a href="/clinic/investigation" />}>
                  <Eye className="size-4" />
                  Open investigations
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {mode !== "view" && (
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" className="w-full justify-center sm:w-auto" onClick={() => setScreen({ name: "table" })}>
              Cancel
            </Button>
            <Button className="w-full justify-center sm:w-auto" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {mode === "create" ? "Save examination" : "Save changes"}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Examinations</h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:mt-1 sm:text-sm">
            Clinical examinations with oral findings
            {total > 0 ? ` — ${total} total` : ""}.
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate} className="w-full justify-center sm:w-auto">
            <Plus className="size-4" />
            New Examination
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-2.5 p-4 sm:flex-row sm:gap-3 sm:p-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by patient, findings or notes…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v ?? "all")}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
              <Stethoscope className="size-8 text-muted-foreground" />
              <p className="font-medium">No examinations found</p>
              <p className="text-sm text-muted-foreground">
                {canManage
                  ? "Click “New Examination” to record the first one."
                  : "Examinations created for you will appear here."}
              </p>
            </div>
          ) : (
            <>
            {/* Desktop table — hidden on mobile */}
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Issues</TableHead>
                    <TableHead>Oral findings</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Investigation</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.examinationId}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(item.visitDate)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.patientName}
                      </TableCell>
                      <TableCell>
                        <Badge className={ISSUE_BADGE[item.issueType]}>
                          {item.issueType}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-56 truncate">
                        {item.oralFindings}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_BADGE[item.status]}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.investigationId ? (
                          <Badge variant="outline">Linked</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="View"
                            onClick={() => openView(item)}
                          >
                            <Eye className="size-4" />
                          </Button>
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Edit"
                              onClick={() => openEdit(item)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Delete"
                              onClick={() => setDeleteTarget(item)}
                            >
                              <Trash className="size-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {/* Mobile card list — visible only on small screens */}
            <div className="space-y-2.5 bg-muted/40 p-3 md:hidden">
              {filteredItems.map((item) => (
                <div key={item.examinationId} className="rounded-xl border border-border bg-card p-3 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">
                      {item.patientName}
                    </p>
                    <Badge className={`${ISSUE_BADGE[item.issueType]} shrink-0 text-[10px]`}>
                      {item.issueType}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.oralFindings}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
                    {formatDate(item.visitDate)}
                    {item.investigationId ? " · Linked investigation" : ""}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/60 pt-2">
                    <Badge className={`${STATUS_BADGE[item.status]} text-[11px]`}>
                      {item.status}
                    </Badge>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-9 rounded-xl text-muted-foreground"
                        aria-label="View"
                        onClick={() => openView(item)}
                      >
                        <Eye className="size-4" />
                      </Button>
                      {canManage && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-9 rounded-xl border-primary/20 bg-primary/5 text-primary"
                          aria-label="Edit"
                          onClick={() => openEdit(item)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-9 rounded-xl border-destructive/20 bg-destructive/5 text-destructive"
                          aria-label="Delete"
                          onClick={() => setDeleteTarget(item)}
                        >
                          <Trash className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete examination?"
        description={
          deleteTarget
            ? `The examination for ${deleteTarget.patientName} will be permanently removed.`
            : undefined
        }
        onConfirm={handleDelete}
      />
    </div>
  );
}
