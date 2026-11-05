"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useRequireRole, sessionCan } from "@/hooks/use-clinic-session";
import {
  type Examination,
  type ExaminationStatus,
  createExamination,
  deleteExamination,
  listExaminations,
  updateExamination,
} from "@/lib/clinic-api";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { SectionCard } from "@/components/clinic/section-card";
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
  Loader2,
  Plus,
  Search,
  Stethoscope,
  Trash,
} from "lucide-react";
import { RowActions } from "@/components/ui/row-actions";

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


export interface ExaminationComplaintRow {
  complaint: string;
  duration: string;
  severity: string;
  notes: string;
}

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
  // Intra oral examination
  softTissueNote: string;
  hardTissueNote: string;
  // Medical history (moved here from patient registration).
  allergies: string;
  medicalConditions: string;
  previousSurgeries: string;
  currentMedications: string;
  patientHistory: string;
  familyHistory: string;
  habits: string;
  // History of presenting illness (moved here from patient registration).
  hpiPresentingComplaint: string;
  hpiOnset: string;
  hpiDurationValue: string;
  hpiDurationUnit: string;
  hpiProgression: string;
  hpiSymptoms: string;
  hpiAggravatingFactors: string;
  hpiRelievingFactors: string;
  hpiAssociatedSymptoms: string;
  hpiPreviousTreatment: string;
  hpiAdditionalNotes: string;
  // Chief complaints (moved here from patient registration).
  chiefComplaints: ExaminationComplaintRow[];
  // Vital signs (moved here from patient registration).
  bloodPressure: string;
  temperature: string;
  pulse: string;
  respiratoryRate: string;
  spo2: string;
}

function emptyForm(): FormState {
  return {
    patientId: "",
    visitDate: todayISO(),
    status: "pending",
    issueType: "",
    oralFindings: "",
    notes: "",
    softTissueNote: "",
    hardTissueNote: "",
    allergies: "",
    medicalConditions: "",
    previousSurgeries: "",
    currentMedications: "",
    patientHistory: "",
    familyHistory: "",
    habits: "",
    hpiPresentingComplaint: "",
    hpiOnset: "",
    hpiDurationValue: "",
    hpiDurationUnit: "",
    hpiProgression: "",
    hpiSymptoms: "",
    hpiAggravatingFactors: "",
    hpiRelievingFactors: "",
    hpiAssociatedSymptoms: "",
    hpiPreviousTreatment: "",
    hpiAdditionalNotes: "",
    chiefComplaints: [{ complaint: "", duration: "", severity: "", notes: "" }],
    bloodPressure: "",
    temperature: "",
    pulse: "",
    respiratoryRate: "",
    spo2: "",
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
  // Dropdown filters were removed; statusFilter stays pinned to "all".
  const [statusFilter] = useState<string>("all");

  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Examination | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    if (!clinicId) return;
    setLoading(true);
    listExaminations(clinicId, { limit: 100 })
      .then((res) => {
        setItems(res.items ?? []);
        setTotal(res.total ?? 0);
        setSelectedIds(new Set());
      })
      .catch((e) =>
        toast.error(e instanceof Error ? e.message : "Failed to load examinations")
      )
      .finally(() => setLoading(false));
  }, [clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!term) return true;
      return (
        item.patientName.toLowerCase().includes(term) ||
        item.oralFindings.toLowerCase().includes(term) ||
        (item.notes ?? "").toLowerCase().includes(term) ||
        (item.softTissueNote ?? "").toLowerCase().includes(term) ||
        (item.hardTissueNote ?? "").toLowerCase().includes(term)
      );
    });
  }, [items, searchTerm, statusFilter]);

  function openCreate() {
    setForm(emptyForm());
    setScreen({ name: "form", mode: "create" });
  }

  function formFromRecord(record: Examination): FormState {
    return {
      ...emptyForm(),
      patientId: record.patientId,
      visitDate: record.visitDate,
      status: record.status,
      issueType: record.issueType,
      oralFindings: record.oralFindings,
      notes: record.notes ?? "",
      softTissueNote: record.softTissueNote ?? "",
      hardTissueNote: record.hardTissueNote ?? "",
      allergies: record.allergies ?? "",
      medicalConditions: record.medicalConditions ?? "",
      previousSurgeries: record.previousSurgeries ?? "",
      currentMedications: record.currentMedications ?? "",
      patientHistory: record.patientHistory ?? "",
      familyHistory: record.familyHistory ?? "",
      habits: record.habits ?? "",
      hpiPresentingComplaint: record.hpi?.presentingComplaint ?? "",
      hpiOnset: record.hpi?.onset ?? "",
      hpiDurationValue: record.hpi?.durationValue ?? "",
      hpiDurationUnit: record.hpi?.durationUnit ?? "",
      hpiProgression: record.hpi?.progression ?? "",
      hpiSymptoms: record.hpi?.symptoms ?? "",
      hpiAggravatingFactors: record.hpi?.aggravatingFactors ?? "",
      hpiRelievingFactors: record.hpi?.relievingFactors ?? "",
      hpiAssociatedSymptoms: record.hpi?.associatedSymptoms ?? "",
      hpiPreviousTreatment: record.hpi?.previousTreatment ?? "",
      hpiAdditionalNotes: record.hpi?.additionalNotes ?? "",
      chiefComplaints:
        record.chiefComplaints && record.chiefComplaints.length > 0
          ? record.chiefComplaints.map((c) => ({
              complaint: c.complaint ?? "",
              duration: c.duration ?? "",
              severity: c.severity ?? "",
              notes: c.notes ?? "",
            }))
          : [{ complaint: "", duration: "", severity: "", notes: "" }],
      bloodPressure: record.bloodPressure ?? "",
      temperature: record.temperature ?? "",
      pulse: record.pulse ?? "",
      respiratoryRate: record.respiratoryRate ?? "",
      spo2: record.spo2 ?? "",
    };
  }

  function openEdit(record: Examination) {
    setForm(formFromRecord(record));
    setScreen({ name: "form", mode: "edit", record });
  }

  function openView(record: Examination) {
    // Populate the form too so read-only rows render counts correctly.
    setForm(formFromRecord(record));
    setScreen({ name: "form", mode: "view", record });
  }

  async function handleSave() {
    if (screen.name !== "form" || screen.mode === "view") return;
    if (!form.patientId) {
      toast.error("Please select a patient");
      return;
    }
    let issueType = form.issueType;
    if (!issueType) {
      if (form.softTissueNote.trim() && !form.hardTissueNote.trim()) {
        issueType = "soft";
      } else if (form.hardTissueNote.trim() && !form.softTissueNote.trim()) {
        issueType = "hard";
      } else if (form.softTissueNote.trim() || form.hardTissueNote.trim()) {
        issueType = "soft";
      }
    }
    if (!issueType) {
      toast.error("Please select the issue type (Hard / Soft)");
      return;
    }

    const effectiveOral =
      form.oralFindings.trim() ||
      [
        form.softTissueNote.trim() ? `Soft tissue: ${form.softTissueNote.trim()}` : "",
        form.hardTissueNote.trim() ? `Hard tissue: ${form.hardTissueNote.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n");

    if (effectiveOral.length < 2) {
      toast.error("Please enter the oral findings or intra oral examination notes");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        visitDate: form.visitDate,
        status: form.status,
        issueType,
        oralFindings: effectiveOral,
        softTissueNote: form.softTissueNote.trim() || null,
        hardTissueNote: form.hardTissueNote.trim() || null,
        notes: form.notes.trim() || null,
        allergies: form.allergies.trim() || null,
        medicalConditions: form.medicalConditions.trim() || null,
        previousSurgeries: form.previousSurgeries.trim() || null,
        currentMedications: form.currentMedications.trim() || null,
        patientHistory: form.patientHistory.trim() || null,
        familyHistory: form.familyHistory.trim() || null,
        habits: form.habits.trim() || null,
        hpi: {
          presentingComplaint: form.hpiPresentingComplaint.trim() || null,
          onset: form.hpiOnset || null,
          durationValue: form.hpiDurationValue.trim() || null,
          durationUnit: form.hpiDurationUnit || null,
          progression: form.hpiProgression || null,
          symptoms: form.hpiSymptoms.trim() || null,
          aggravatingFactors: form.hpiAggravatingFactors.trim() || null,
          relievingFactors: form.hpiRelievingFactors.trim() || null,
          associatedSymptoms: form.hpiAssociatedSymptoms.trim() || null,
          previousTreatment: form.hpiPreviousTreatment.trim() || null,
          additionalNotes: form.hpiAdditionalNotes.trim() || null,
        },
        chiefComplaints: form.chiefComplaints
          .map((c) => ({
            complaint: c.complaint.trim() || null,
            duration: c.duration.trim() || null,
            severity: c.severity || null,
            notes: c.notes.trim() || null,
          }))
          .filter((c) => c.complaint || c.duration || c.severity || c.notes),
        bloodPressure: form.bloodPressure.trim() || null,
        temperature: form.temperature.trim() || null,
        pulse: form.pulse.trim() || null,
        respiratoryRate: form.respiratoryRate.trim() || null,
        spo2: form.spo2.trim() || null,
      };
      if (screen.mode === "create") {
        payload.patientId = form.patientId;
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

  const toggleSelectRow = (examinationId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(examinationId)) next.delete(examinationId);
      else next.add(examinationId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredItems.map((item) => item.examinationId)));
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => deleteExamination(clinicId, id))
      );
      toast.success(`Deleted ${selectedIds.size} examinations`);
      setSelectedIds(new Set());
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete selected examinations");
      load();
    } finally {
      setBulkDeleteOpen(false);
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

        <SectionCard
          title="1. Details"
          description="Select the patient, visit date, status and issue type"
        >
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
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
              <Label htmlFor="exam-chief-complaint">Chief Complaint</Label>
              <Textarea
                id="exam-chief-complaint"
                value={
                  readOnly
                    ? (screen.record.chiefComplaints?.[0]?.complaint ?? "")
                    : (form.chiefComplaints[0]?.complaint ?? "")
                }
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    chiefComplaints:
                      f.chiefComplaints.length > 0
                        ? f.chiefComplaints.map((row, i) =>
                            i === 0 ? { ...row, complaint: e.target.value } : row
                          )
                        : [
                            {
                              complaint: e.target.value,
                              duration: "",
                              severity: "",
                              notes: "",
                            },
                          ],
                  }))
                }
                placeholder="Enter the patient's chief complaint…"
                disabled={readOnly}
              />
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
          </div>
        </SectionCard>

        <SectionCard title="2. Intra Oral Examination">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="exam-soft-tissue">Soft tissue note</Label>
              <Textarea
                id="exam-soft-tissue"
                value={
                  readOnly
                    ? (screen.record.softTissueNote ?? "")
                    : form.softTissueNote
                }
                onChange={(e) =>
                  setForm((f) => ({ ...f, softTissueNote: e.target.value }))
                }
                placeholder="Enter soft tissue notes…"
                rows={4}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exam-hard-tissue">Hard tissue note</Label>
              <Textarea
                id="exam-hard-tissue"
                value={
                  readOnly
                    ? (screen.record.hardTissueNote ?? "")
                    : form.hardTissueNote
                }
                onChange={(e) =>
                  setForm((f) => ({ ...f, hardTissueNote: e.target.value }))
                }
                placeholder="Enter hard tissue notes…"
                rows={4}
                disabled={readOnly}
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="3. Medical Information">
          <div className="space-y-2">
            <Label htmlFor="exam-medical-info">Medical Information</Label>
            <Textarea
              id="exam-medical-info"
              value={readOnly ? (screen.record.medicalConditions ?? "") : form.medicalConditions}
              onChange={(e) =>
                setForm((f) => ({ ...f, medicalConditions: e.target.value }))
              }
              placeholder="Enter the patient's medical information…"
              rows={5}
              disabled={readOnly}
            />
          </div>
        </SectionCard>

        <SectionCard title="4. History of Presenting Illness">
          <div className="space-y-2">
            <Label htmlFor="exam-hpi-complaint">Presenting complaint</Label>
            <Textarea
              id="exam-hpi-complaint"
              value={readOnly ? (screen.record.hpi?.presentingComplaint ?? "") : form.hpiPresentingComplaint}
              onChange={(e) =>
                setForm((f) => ({ ...f, hpiPresentingComplaint: e.target.value }))
              }
              placeholder="Describe the history of presenting illness…"
              rows={5}
              disabled={readOnly}
            />
          </div>
        </SectionCard>


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

      <SectionCard title="1. Search & Filters">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by patient, findings or notes…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </SectionCard>

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
          {canDelete && (
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
      )}

      <SectionCard title="2. Examinations">
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
                    <TableHead className="w-12 pl-4">
                      <Checkbox
                        checked={selectedIds.size === filteredItems.length && filteredItems.length > 0}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Issues</TableHead>
                    <TableHead>Oral findings</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.examinationId}>
                      <TableCell className="pl-4">
                        <Checkbox
                          checked={selectedIds.has(item.examinationId)}
                          onCheckedChange={() => toggleSelectRow(item.examinationId)}
                          aria-label={`Select examination for ${item.patientName}`}
                        />
                      </TableCell>
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
                        <div className="flex justify-end">
                          <RowActions
                            onView={() => openView(item)}
                            onEdit={canManage ? () => openEdit(item) : undefined}
                            onDelete={canDelete ? () => setDeleteTarget(item) : undefined}
                          />
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
                    <Checkbox
                      checked={selectedIds.has(item.examinationId)}
                      onCheckedChange={() => toggleSelectRow(item.examinationId)}
                      aria-label={`Select examination for ${item.patientName}`}
                    />
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
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/60 pt-2">
                    <Badge className={`${STATUS_BADGE[item.status]} text-[11px]`}>
                      {item.status}
                    </Badge>
                    <div className="flex items-center gap-1.5">
                      <RowActions
                        onView={() => openView(item)}
                        onEdit={canManage ? () => openEdit(item) : undefined}
                        onDelete={canDelete ? () => setDeleteTarget(item) : undefined}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            </>
          )}
        </SectionCard>

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

      <ConfirmDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => {
          if (!open) setBulkDeleteOpen(false);
        }}
        title="Delete selected examinations?"
        description={`This will permanently delete all ${selectedIds.size} selected examinations. This action cannot be undone.`}
        confirmLabel="Delete All"
        onConfirm={handleBulkDelete}
      />
    </div>
  );
}
