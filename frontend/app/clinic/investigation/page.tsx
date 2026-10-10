"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";

// Load odontogram + its CSS only when a chart screen opens — keeps the list
// view light and avoids CSS leaking into the clinic sidebar.
const OdontogramShell = dynamic(
  () => import("./odontogram-lazy").then((m) => m.OdontogramShell),
  { ssr: false, loading: () => <div className="h-[420px] animate-pulse rounded-xl bg-muted/40" /> }
);

async function odontogramApi() {
  return import("./odontogram-lazy");
}
import { useRequireRole, sessionCan } from "@/hooks/use-clinic-session";
import {
  type Investigation,
  type InvestigationCategory,
  type InvestigationStatus,
  type MedicineRecord,
  createInvestigation,
  deleteInvestigation,
  getInvestigation,
  listInvestigations,
  listRecords,
  updateInvestigation,
} from "@/lib/clinic-api";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { RowActions } from "@/components/ui/row-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Loader2,
  Plus,
  Search,
  Stethoscope,
} from "lucide-react";

const STATUS_OPTIONS: { value: InvestigationStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_BADGE: Record<InvestigationStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  "in-progress": "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-slate-100 text-slate-600",
};

const CATEGORY_OPTIONS: { value: InvestigationCategory; label: string }[] = [
  { value: "vital-test", label: "Vital Test" },
  { value: "x-ray", label: "X-Ray" },
  { value: "blood-report", label: "Blood Report" },
  { value: "biopsy", label: "Biopsy" },
  { value: "other", label: "Other" },
];

const CATEGORY_BADGE: Record<InvestigationCategory, string> = {
  "vital-test": "bg-rose-100 text-rose-800",
  "x-ray": "bg-indigo-100 text-indigo-800",
  "blood-report": "bg-red-100 text-red-800",
  biopsy: "bg-purple-100 text-purple-800",
  other: "bg-slate-100 text-slate-600",
};

function normalizeCategory(value: unknown): InvestigationCategory {
  return CATEGORY_OPTIONS.some((o) => o.value === value)
    ? (value as InvestigationCategory)
    : "other";
}

function categoryLabel(value: unknown): string {
  return CATEGORY_OPTIONS.find((o) => o.value === value)?.label ?? "Other";
}

const TITLE_PLACEHOLDERS: Record<InvestigationCategory, string> = {
  "vital-test": "e.g. Vitals — routine check",
  "x-ray": "e.g. IOPA — 46",
  "blood-report": "e.g. CBC + fasting sugar",
  biopsy: "e.g. Biopsy — left buccal mucosa",
  other: "e.g. Root canal assessment — 46",
};

interface CategoryField {
  key: string;
  label: string;
  placeholder: string;
}

/** Related form fields per report type (the odontogram stays for "Other"). */
const CATEGORY_FIELDS: Record<
  Exclude<InvestigationCategory, "other">,
  CategoryField[]
> = {
  "vital-test": [
    { key: "bloodPressure", label: "Blood pressure", placeholder: "e.g. 120/80 mmHg" },
    { key: "temperature", label: "Temperature", placeholder: "e.g. 98.6 °F" },
    { key: "pulse", label: "Pulse", placeholder: "e.g. 72 bpm" },
    { key: "respiratoryRate", label: "Respiratory rate", placeholder: "e.g. 16 /min" },
    { key: "spo2", label: "SpO₂", placeholder: "e.g. 98 %" },
    { key: "height", label: "Height", placeholder: "e.g. 170 cm" },
    { key: "weight", label: "Weight", placeholder: "e.g. 68 kg" },
    { key: "bloodSugar", label: "Blood sugar", placeholder: "e.g. 110 mg/dL (fasting)" },
  ],
  "x-ray": [
    { key: "xrayType", label: "X-ray type", placeholder: "e.g. IOPA, OPG, CBCT, Chest" },
    { key: "region", label: "Region / tooth", placeholder: "e.g. 46, upper arch" },
    { key: "findings", label: "Findings", placeholder: "Radiographic findings…" },
    { key: "impression", label: "Impression", placeholder: "Radiologist impression…" },
  ],
  "blood-report": [
    { key: "testPanel", label: "Test / panel", placeholder: "e.g. CBC, FBS, Lipid profile, HbA1c" },
    { key: "hemoglobin", label: "Hemoglobin", placeholder: "e.g. 13.5 g/dL" },
    { key: "wbc", label: "WBC count", placeholder: "e.g. 7,200 /µL" },
    { key: "platelets", label: "Platelet count", placeholder: "e.g. 2.4 L/µL" },
    { key: "esr", label: "ESR", placeholder: "e.g. 12 mm/hr" },
    { key: "fastingSugar", label: "Fasting sugar", placeholder: "e.g. 95 mg/dL" },
    { key: "ppSugar", label: "PP sugar", placeholder: "e.g. 130 mg/dL" },
    { key: "remarks", label: "Remarks", placeholder: "Pathologist remarks…" },
  ],
  biopsy: [
    { key: "biopsySite", label: "Biopsy site", placeholder: "e.g. left buccal mucosa" },
    { key: "specimenType", label: "Specimen type", placeholder: "e.g. Incisional, Excisional, Punch, FNAC" },
    { key: "clinicalDiagnosis", label: "Clinical diagnosis", placeholder: "Provisional clinical diagnosis…" },
    { key: "grossFindings", label: "Gross findings", placeholder: "Specimen description…" },
    { key: "labName", label: "Referred lab", placeholder: "Lab name…" },
  ],
};

/** Display label for a stored details key. */
function fieldLabel(cat: InvestigationCategory, key: string): string {
  if (cat === "other") return key;
  return CATEGORY_FIELDS[cat].find((f) => f.key === key)?.label ?? key;
}

/** Flatten stored details (unknown values) to editable strings. */
function detailsToStrings(details: Record<string, unknown> | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!details || typeof details !== "object") return out;
  for (const [k, v] of Object.entries(details)) {
    if (typeof v === "string") out[k] = v;
    else if (typeof v === "number" || typeof v === "boolean") out[k] = String(v);
  }
  return out;
}

type Screen =
  | { name: "table" }
  | { name: "form"; mode: "create" }
  | { name: "form"; mode: "edit"; record: Investigation }
  | { name: "form"; mode: "view"; record: Investigation };

interface FormState {
  patientId: string;
  title: string;
  category: InvestigationCategory;
  visitDate: string;
  status: InvestigationStatus;
  notes: string;
  medicalRecordId: string;
  details: Record<string, string>;
}

function emptyForm(): FormState {
  return {
    patientId: "",
    title: "",
    category: "vital-test",
    visitDate: todayISO(),
    status: "pending",
    notes: "",
    medicalRecordId: "",
    details: {},
  };
}

export default function InvestigationPage() {
  const session = useRequireRole("patient");
  const clinicId = session?.clinicId ?? "";
  const canManage = sessionCan(session, "doctor");
  const canDelete = sessionCan(session, "clinic_admin");

  const [screen, setScreen] = useState<Screen>({ name: "table" });
  const [items, setItems] = useState<Investigation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [form, setForm] = useState<FormState>(emptyForm());
  const [records, setRecords] = useState<MedicineRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Investigation | null>(null);
  // Row-level pending id for view/edit opens (list rows carry no chartData —
  // the full record is fetched on demand).
  const [pendingRowId, setPendingRowId] = useState<string | null>(null);
  // True while a charted record's chart is being fetched/hydrated.
  const [chartLoading, setChartLoading] = useState(false);

  // Remount the odontogram shell per opened record so every form starts from
  // a clean chart (the provider inits on mount / destroys on unmount).
  const shellKey =
    screen.name === "form"
      ? screen.mode === "create"
        ? "new"
        : screen.record.investigationId
      : "none";
  const chartData =
    screen.name === "form" && screen.mode !== "create"
      ? screen.record.chartData
      : null;
  const readOnly = screen.name === "form" && screen.mode === "view";

  const load = useCallback(() => {
    if (!clinicId) return;
    setLoading(true);
    listInvestigations(clinicId, { limit: 100 })
      .then((res) => {
        setItems(res.items ?? []);
        setTotal(res.total ?? 0);
      })
      .catch((e) =>
        toast.error(e instanceof Error ? e.message : "Failed to load investigations")
      )
      .finally(() => setLoading(false));
  }, [clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  // Load the selected patient's medical records for the link picker
  // (medical record connection).
  useEffect(() => {
    if (screen.name !== "form" || screen.mode === "view" || !clinicId) return;
    const patientId =
      screen.mode === "create" ? form.patientId : screen.record.patientId;
    if (!patientId) {
      setRecords([]);
      return;
    }
    setRecordsLoading(true);
    listRecords(clinicId, { patientId, limit: 50 })
      .then((res) => setRecords(res.items ?? []))
      .catch(() => setRecords([]))
      .finally(() => setRecordsLoading(false));
  }, [screen, form.patientId, clinicId]);

  // Hydrate a saved chart into the freshly mounted shell. The grid builds
  // asynchronously, so observe for it instead of polling — the chart imports
  // the moment the grid appears (with a 5s safety timeout).
  useEffect(() => {
    if (screen.name !== "form" || !chartData) return;
    let cancelled = false;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      if (!cancelled) setChartLoading(false);
    };
    const observer = new MutationObserver(() => {
      if (tryImport()) observer.disconnect();
    });
    const tryImport = () => {
      const grid = document.getElementById("toothGrid");
      if (grid && grid.childElementCount > 0) {
        observer.disconnect();
        void odontogramApi()
          .then(({ importStatus }) => {
            if (cancelled) return;
            try {
              importStatus(chartData as Record<string, unknown>);
            } catch (e) {
              toast.error(
                e instanceof Error ? e.message : "Failed to load saved chart"
              );
            } finally {
              finish();
            }
          })
          .catch((e) => {
            if (!cancelled) {
              toast.error(
                e instanceof Error ? e.message : "Failed to load saved chart"
              );
            }
            finish();
          });
        return true;
      }
      return false;
    };
    setChartLoading(true);
    if (!tryImport()) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
    const timer = setTimeout(() => {
      observer.disconnect();
      finish();
    }, 5000);
    return () => {
      cancelled = true;
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [screen, shellKey, chartData]);

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (categoryFilter !== "all" && normalizeCategory(item.category) !== categoryFilter) return false;
      if (!term) return true;
      return (
        item.title.toLowerCase().includes(term) ||
        item.patientName.toLowerCase().includes(term) ||
        categoryLabel(item.category).toLowerCase().includes(term) ||
        (item.notes ?? "").toLowerCase().includes(term)
      );
    });
  }, [items, searchTerm, statusFilter, categoryFilter]);

  function openCreate() {
    setForm(emptyForm());
    setPendingRowId(null);
    setChartLoading(false);
    setScreen({ name: "form", mode: "create" });
  }

  function openEdit(record: Investigation) {
    // List rows omit chartData for speed — fetch the full record first so the
    // chart is intact when the editor opens.
    setPendingRowId(record.investigationId);
    getInvestigation(clinicId, record.investigationId)
      .then((full) => {
        setForm({
          patientId: full.patientId,
          title: full.title,
          category: normalizeCategory(full.category),
          visitDate: full.visitDate,
          status: full.status,
          notes: full.notes ?? "",
          medicalRecordId: full.medicalRecordId ?? "",
          details: detailsToStrings(full.details),
        });
        setScreen({ name: "form", mode: "edit", record: full });
      })
      .catch((e) =>
        toast.error(e instanceof Error ? e.message : "Failed to open investigation")
      )
      .finally(() => setPendingRowId(null));
  }

  function openView(record: Investigation) {
    // Open instantly with the row data, then fetch the full record (with
    // chartData) in the background — the chart hydrates when it arrives.
    const hasChart = record.hasChart ?? record.chartData != null;
    setChartLoading(hasChart && record.chartData == null);
    setScreen({ name: "form", mode: "view", record });
    if (record.chartData != null) return;
    if (!hasChart) {
      setChartLoading(false);
      return;
    }
    getInvestigation(clinicId, record.investigationId)
      .then((full) => {
        setScreen((prev) =>
          prev.name === "form" &&
          prev.mode === "view" &&
          prev.record.investigationId === record.investigationId
            ? { name: "form", mode: "view", record: full }
            : prev
        );
      })
      .catch(() => setChartLoading(false));
  }

  async function handleSave() {
    if (screen.name !== "form" || screen.mode === "view") return;
    if (!form.patientId) {
      toast.error("Please select a patient");
      return;
    }
    if (form.title.trim().length < 2) {
      toast.error("Please enter a title");
      return;
    }
    setSaving(true);
    try {
      // The odontogram chart only applies to "Other" — clinical report types
      // use their related form (details) instead. On edit, an existing chart
      // is preserved untouched.
      let chartData: Record<string, unknown> | null = null;
      if (form.category === "other") {
        try {
          const { getStatusChart } = await odontogramApi();
          const chart = getStatusChart() as unknown;
          if (chart && typeof chart === "object") {
            chartData = chart as Record<string, unknown>;
          }
        } catch {
          chartData = null;
        }
      } else if (screen.mode === "edit") {
        chartData = screen.record.chartData ?? null;
      }
      const detailEntries = Object.entries(form.details).filter(
        ([, v]) => v.trim().length > 0
      );
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        category: form.category,
        details: detailEntries.length > 0 ? Object.fromEntries(detailEntries) : null,
        visitDate: form.visitDate,
        status: form.status,
        notes: form.notes.trim() || null,
        medicalRecordId: form.medicalRecordId || null,
        chartData,
      };
      if (screen.mode === "create") {
        payload.patientId = form.patientId;
        await createInvestigation(clinicId, payload);
        toast.success("Investigation created successfully");
      } else {
        await updateInvestigation(clinicId, screen.record.investigationId, payload);
        toast.success("Investigation updated successfully");
      }
      setScreen({ name: "table" });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save investigation");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteInvestigation(clinicId, deleteTarget.investigationId);
      toast.success("Investigation deleted successfully");
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete investigation");
    }
  }

  if (screen.name === "form") {
    const mode = screen.mode;
    const formCategory =
      mode === "view" ? normalizeCategory(screen.record.category) : form.category;
    const detailEntries =
      mode === "view"
        ? Object.entries(detailsToStrings(screen.record.details)).filter(
            ([, v]) => v.trim().length > 0
          )
        : [];
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setScreen({ name: "table" })}
          >
            <ArrowLeft className="size-4" />
            Back to investigations
          </Button>
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {mode === "create"
              ? "New Investigation"
              : mode === "edit"
                ? "Edit Investigation"
                : "View Investigation"}
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:mt-1 sm:text-sm">
            {mode === "view"
              ? "Read-only investigation record."
              : "Select the patient, pick the report type and fill in the related form."}
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
                    setForm((f) => ({
                      ...f,
                      patientId: v ?? "",
                      medicalRecordId: "",
                    }))
                  }
                  required
                />
              ) : (
                <Input
                  value={screen.record.patientName}
                  disabled
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-title">Title</Label>
              <Input
                id="inv-title"
                value={mode === "view" ? screen.record.title : form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder={
                  TITLE_PLACEHOLDERS[
                    mode === "view"
                      ? normalizeCategory(screen.record.category)
                      : form.category
                  ]
                }
                disabled={mode === "view"}
              />
            </div>
            <div className="space-y-2">
              <Label>Report type</Label>
              {mode === "view" ? (
                <div>
                  <Badge className={CATEGORY_BADGE[normalizeCategory(screen.record.category)]}>
                    {categoryLabel(screen.record.category)}
                  </Badge>
                </div>
              ) : (
                <Select
                  value={form.category}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      category: v as InvestigationCategory,
                      // Clear type-specific fields when switching report types.
                      details: {},
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-date">Visit date</Label>
              <Input
                id="inv-date"
                type="date"
                value={mode === "view" ? screen.record.visitDate : form.visitDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, visitDate: e.target.value }))
                }
                disabled={mode === "view"}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              {mode === "view" ? (
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
                      status: v as InvestigationStatus,
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
            <div className="space-y-2 sm:col-span-2">
              <Label>Linked medical record (optional)</Label>
              {mode === "view" ? (
                <Input
                  value={screen.record.medicalRecordId ?? "Not linked"}
                  disabled
                />
              ) : (
                <Select
                  value={form.medicalRecordId || "__none"}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      medicalRecordId: !v || v === "__none" ? "" : v,
                    }))
                  }
                  disabled={
                    recordsLoading ||
                    (!form.patientId && mode === "create")
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        mode === "create" && !form.patientId
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
              )}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="inv-notes">Notes</Label>
              <Textarea
                id="inv-notes"
                value={mode === "view" ? (screen.record.notes ?? "") : form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Clinical notes for this investigation…"
                disabled={mode === "view"}
              />
            </div>
          </CardContent>
        </Card>

        {formCategory !== "other" && (mode !== "view" || detailEntries.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>{categoryLabel(formCategory)} details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              {mode === "view"
                ? detailEntries.map(([key, value]) => (
                    <div key={key} className="space-y-2">
                      <Label>{fieldLabel(formCategory, key)}</Label>
                      <Input value={value} disabled />
                    </div>
                  ))
                : CATEGORY_FIELDS[formCategory].map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label htmlFor={`inv-${field.key}`}>{field.label}</Label>
                      <Input
                        id={`inv-${field.key}`}
                        value={form.details[field.key] ?? ""}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            details: { ...f.details, [field.key]: e.target.value },
                          }))
                        }
                        placeholder={field.placeholder}
                      />
                    </div>
                  ))}
            </CardContent>
          </Card>
        )}

        {formCategory === "other" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Dental odontogram
              {chartLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="isolate overflow-auto rounded-xl border bg-white">
              <OdontogramShell
                key={shellKey}
                language="en"
                readOnly={readOnly}
              />
            </div>
            {!chartData && !chartLoading && mode === "view" && (
              <p className="pt-2 text-sm text-muted-foreground">
                No chart was recorded for this investigation.
              </p>
            )}
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
              {mode === "create" ? "Save investigation" : "Save changes"}
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
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Investigations</h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:mt-1 sm:text-sm">
            Vital tests, X-rays, blood reports and biopsies
            {total > 0 ? ` — ${total} total` : ""}.
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate} className="w-full justify-center sm:w-auto">
            <Plus className="size-4" />
            New Investigation
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-2.5 p-4 sm:flex-row sm:gap-3 sm:p-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by type, title, patient or notes…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select
            value={categoryFilter}
            onValueChange={(v) => setCategoryFilter(v ?? "all")}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {CATEGORY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              <p className="font-medium">No investigations found</p>
              <p className="text-sm text-muted-foreground">
                {canManage
                  ? "Click “New Investigation” to chart the first one."
                  : "Investigations created for you will appear here."}
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
                    <TableHead>Category</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Chart</TableHead>
                    <TableHead>Medical record</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.investigationId}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(item.visitDate)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.patientName}
                      </TableCell>
                      <TableCell>
                        <Badge className={CATEGORY_BADGE[normalizeCategory(item.category)]}>
                          {categoryLabel(item.category)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-56 truncate">
                        {item.title}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_BADGE[item.status]}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(item.hasChart ?? item.chartData != null) ? (
                          <Badge variant="outline">Charted</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.medicalRecordId ? (
                          <Badge variant="outline">Linked</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <RowActions
                            onView={() => {
                              if (pendingRowId === item.investigationId) return;
                              openView(item);
                            }}
                            onEdit={
                              canManage
                                ? () => {
                                    if (pendingRowId === item.investigationId) return;
                                    openEdit(item);
                                  }
                                : undefined
                            }
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
                <div key={item.investigationId} className="rounded-xl border border-border bg-card p-3 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">
                      {item.patientName}
                    </p>
                    <Badge className={`${CATEGORY_BADGE[normalizeCategory(item.category)]} shrink-0 text-[10px]`}>
                      {categoryLabel(item.category)}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-xs font-medium text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
                    {formatDate(item.visitDate)}
                    {(item.hasChart ?? item.chartData != null) ? " · Charted" : ""}
                    {item.medicalRecordId ? " · Linked" : ""}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/60 pt-2">
                    <Badge className={`${STATUS_BADGE[item.status]} text-[11px]`}>
                      {item.status}
                    </Badge>
                    <RowActions
                      onView={() => {
                        if (pendingRowId === item.investigationId) return;
                        openView(item);
                      }}
                      onEdit={
                        canManage
                          ? () => {
                              if (pendingRowId === item.investigationId) return;
                              openEdit(item);
                            }
                          : undefined
                      }
                      onDelete={canDelete ? () => setDeleteTarget(item) : undefined}
                    />
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
        title="Delete investigation?"
        description={
          deleteTarget
            ? `“${deleteTarget.title}” for ${deleteTarget.patientName} will be permanently removed.`
            : undefined
        }
        onConfirm={handleDelete}
      />
    </div>
  );
}
