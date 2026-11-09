"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type ColumnDef,
  type ColumnVisibilityState,
  type RowSelectionState,
  type SortingState,
  columnVisibilityFeature,
  createPaginatedRowModel,
  createSortedRowModel,
  flexRender,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_datetime,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
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
import { PersonAvatar } from "@/components/clinic/person-avatar";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { RowActions } from "@/components/ui/row-actions";
import { TableShell } from "@/components/ui/table-shell";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format-time";
import { todayISO } from "@/lib/datetime";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Columns,
  Loader2,
  Plus,
  Search,
  Stethoscope,
  Trash,
} from "lucide-react";

const TABLE_FEATURES = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  columnVisibilityFeature,
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortFns: {
    datetime: sortFn_datetime,
  },
});

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

const STATUS_LABEL: Record<ExaminationStatus, string> = {
  pending: "Pending",
  "in-progress": "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_VARIANT: Record<
  ExaminationStatus,
  "default" | "secondary" | "outline"
> = {
  pending: "outline",
  "in-progress": "secondary",
  completed: "default",
  cancelled: "outline",
};

const ISSUE_VARIANT: Record<IssueType, "destructive" | "secondary"> = {
  hard: "destructive",
  soft: "secondary",
};

const COLUMN_LABELS: Record<string, string> = {
  patientName: "Patient",
  issueType: "Issues",
  oralFindings: "Oral findings",
  status: "Status",
  visitDate: "Date",
};

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc")
    return <ArrowUp className="size-3.5" aria-hidden="true" />;
  if (sorted === "desc")
    return <ArrowDown className="size-3.5" aria-hidden="true" />;
  return (
    <ChevronsUpDown
      className="size-3.5 text-muted-foreground/60"
      aria-hidden="true"
    />
  );
}


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
  const [sorting, setSorting] = useState<SortingState>([
    { id: "visitDate", desc: true },
  ]);
  const [columnVisibility, setColumnVisibility] =
    useState<ColumnVisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const selectedIds = useMemo(() => new Set(Object.keys(rowSelection)), [rowSelection]);

  const load = useCallback(() => {
    if (!clinicId) return;
    setLoading(true);
    listExaminations(clinicId, { limit: 100 })
      .then((res) => {
        setItems(res.items ?? []);
        setTotal(res.total ?? 0);
        setRowSelection({});
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

  const openEdit = useCallback((record: Examination) => {
    setForm(formFromRecord(record));
    setScreen({ name: "form", mode: "edit", record });
  }, []);

  const openView = useCallback((record: Examination) => {
    // Populate the form too so read-only rows render counts correctly.
    setForm(formFromRecord(record));
    setScreen({ name: "form", mode: "view", record });
  }, []);

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

  const columns = useMemo<ColumnDef<typeof TABLE_FEATURES, Examination>[]>(
    () => [
      {
        id: "select",
        enableSorting: false,
        enableHiding: false,
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={
              table.getIsSomePageRowsSelected() &&
              !table.getIsAllPageRowsSelected()
            }
            onCheckedChange={(checked) =>
              table.toggleAllPageRowsSelected(checked === true)
            }
            aria-label="Select all examinations on this page"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(checked) => row.toggleSelected(checked === true)}
            aria-label={`Select examination for ${row.original.patientName}`}
          />
        ),
      },
      {
        accessorKey: "patientName",
        header: ({ column }) => (
          <button
            type="button"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-mx-1 inline-flex items-center gap-1 rounded-md px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground"
          >
            Patient
            <SortIcon sorted={column.getIsSorted()} />
          </button>
        ),
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex min-w-0 items-center gap-3">
              <PersonAvatar
                clinicId={clinicId}
                ownerType="patient"
                ownerId={item.patientId}
                name={item.patientName}
                size="sm"
                className="border border-border"
              />
              <div className="min-w-0">
                <p className="truncate text-sm leading-tight font-medium">
                  {item.patientName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {item.createdByName
                    ? `Recorded by ${item.createdByName}`
                    : "Examination"}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "issueType",
        enableSorting: false,
        header: () => (
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Issues
          </span>
        ),
        cell: ({ row }) => (
          <Badge
            variant={ISSUE_VARIANT[row.original.issueType]}
            className="text-xs capitalize"
          >
            {row.original.issueType}
          </Badge>
        ),
      },
      {
        accessorKey: "oralFindings",
        enableSorting: false,
        header: () => (
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Oral findings
          </span>
        ),
        cell: ({ row }) => (
          <p className="max-w-[22rem] truncate text-xs text-muted-foreground">
            {row.original.oralFindings || "—"}
          </p>
        ),
      },
      {
        accessorKey: "status",
        enableSorting: false,
        header: () => (
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Status
          </span>
        ),
        cell: ({ row }) => (
          <Badge
            variant={STATUS_VARIANT[row.original.status]}
            className={cn(
              "text-xs",
              row.original.status === "cancelled" && "text-muted-foreground"
            )}
          >
            {STATUS_LABEL[row.original.status]}
          </Badge>
        ),
      },
      {
        accessorKey: "visitDate",
        sortFn: "datetime",
        header: ({ column }) => (
          <button
            type="button"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-mx-1 ml-auto inline-flex items-center gap-1 rounded-md px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground"
          >
            Date
            <SortIcon sorted={column.getIsSorted()} />
          </button>
        ),
        cell: ({ row }) => (
          <span className="block text-right text-xs text-muted-foreground tabular-nums">
            {formatDate(row.original.visitDate)}
          </span>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        enableHiding: false,
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <RowActions
              onView={() => openView(row.original)}
              onEdit={canManage ? () => openEdit(row.original) : undefined}
              onDelete={
                canDelete ? () => setDeleteTarget(row.original) : undefined
              }
            />
          </div>
        ),
      },
    ],
    [canDelete, canManage, clinicId, openEdit, openView]
  );

  const table = useTable({
    features: TABLE_FEATURES,
    data: filteredItems,
    columns,
    getRowId: (row) => row.examinationId,
    state: { sorting, columnVisibility, rowSelection },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
  });

  const totalCount = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();

  const handleBulkDelete = async () => {
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => deleteExamination(clinicId, id))
      );
      toast.success(`Deleted ${selectedIds.size} examinations`);
      setRowSelection({});
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
                value={form.visitDate}
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
          </div>
        </SectionCard>

        <SectionCard title="2. Chief Complaint">
          <div className="space-y-2">
            <Label htmlFor="exam-chief-complaint">Chief Complaint</Label>
            <Textarea
              id="exam-chief-complaint"
              value={form.chiefComplaints[0]?.complaint ?? ""}
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
              rows={3}
              disabled={readOnly}
            />
          </div>
        </SectionCard>

        <SectionCard title="3. History of Presenting Illness">
          <div className="space-y-2">
            <Label htmlFor="exam-hpi-complaint">
              History of Presenting Illness
            </Label>
            <Textarea
              id="exam-hpi-complaint"
              value={form.hpiPresentingComplaint}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  hpiPresentingComplaint: e.target.value,
                }))
              }
              placeholder="Describe the history of presenting illness…"
              rows={4}
              disabled={readOnly}
            />
          </div>
        </SectionCard>

        <SectionCard title="4. Medical History">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="exam-medical-info">Medical Information</Label>
              <Textarea
                id="exam-medical-info"
                value={form.medicalConditions}
                onChange={(e) =>
                  setForm((f) => ({ ...f, medicalConditions: e.target.value }))
                }
                placeholder="Enter the patient's medical information…"
                rows={3}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exam-dental-history">Dental History</Label>
              <Textarea
                id="exam-dental-history"
                value={form.patientHistory}
                onChange={(e) =>
                  setForm((f) => ({ ...f, patientHistory: e.target.value }))
                }
                placeholder="Past dental treatments, extractions, braces…"
                rows={3}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exam-habits">Habits</Label>
              <Textarea
                id="exam-habits"
                value={form.habits}
                onChange={(e) =>
                  setForm((f) => ({ ...f, habits: e.target.value }))
                }
                placeholder="Smoking, alcohol, tobacco, diet…"
                rows={2}
                disabled={readOnly}
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="5. Oral Findings">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="exam-oral">Extra Oral</Label>
              <Textarea
                id="exam-oral"
                value={form.oralFindings}
                onChange={(e) =>
                  setForm((f) => ({ ...f, oralFindings: e.target.value }))
                }
                placeholder="Extra oral examination findings…"
                rows={3}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exam-intra-oral">Intra Oral</Label>
              <Textarea
                id="exam-intra-oral"
                value={form.softTissueNote}
                onChange={(e) =>
                  setForm((f) => ({ ...f, softTissueNote: e.target.value }))
                }
                placeholder="Intra oral examination findings…"
                rows={3}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exam-notes">Notes</Label>
              <Textarea
                id="exam-notes"
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Additional notes for this examination…"
                rows={3}
                disabled={readOnly}
              />
            </div>
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground">
            <Stethoscope className="size-4" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-heading text-lg leading-tight font-semibold tracking-tight">
              Examinations
            </h1>
            <p className="text-sm text-muted-foreground">
              {total > 0
                ? `${total} examination${total === 1 ? "" : "s"} on record`
                : "Clinical examinations with oral findings"}
            </p>
          </div>
        </div>
        <div className="relative w-full lg:w-80">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search examinations..."
            className="h-7 w-full pl-8 text-sm"
            aria-label="Search examinations by patient, findings or notes"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm" aria-label="Toggle columns">
                  <Columns className="size-3.5" aria-hidden="true" />
                  View
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={column.getIsVisible()}
                      onCheckedChange={(checked) =>
                        column.toggleVisibility(checked === true)
                      }
                      closeOnClick={false}
                    >
                      {COLUMN_LABELS[column.id] ?? column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          {canManage && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1 size-3.5" aria-hidden="true" />
              New Examination
            </Button>
          )}
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground tabular-nums">
              {selectedIds.size} Selected
            </span>
            <Button
              variant="ghost"
              size="xs"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => table.resetRowSelection()}
            >
              Clear
            </Button>
          </div>
          {canDelete && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash className="size-3.5" aria-hidden="true" />
              Delete
            </Button>
          )}
        </div>
      )}

      <TableShell>
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
            <Stethoscope className="size-8 text-muted-foreground" />
            <p className="font-medium">No examinations found</p>
            <p className="text-sm text-muted-foreground">
              {searchTerm.trim()
                ? "No examinations match your search."
                : canManage
                  ? "Click “New Examination” to record the first one."
                  : "Examinations created for you will appear here."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table — hidden on mobile */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow
                      key={headerGroup.id}
                      className="border-b border-border bg-muted/40 hover:bg-muted/40"
                    >
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className={cn(
                            "h-9",
                            header.column.id === "select" && "w-10 pl-4",
                            header.column.id === "patientName" && "pl-1",
                            header.column.id === "visitDate" && "text-right",
                            header.column.id === "actions" && "w-10 pr-4"
                          )}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() ? "selected" : undefined}
                        className="border-b border-border transition-colors duration-100 last:border-b-0 hover:bg-muted/30"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className={cn(
                              "py-3",
                              cell.column.id === "select" && "pl-4",
                              cell.column.id === "patientName" && "pl-1",
                              cell.column.id === "actions" && "pr-4"
                            )}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={table.getVisibleLeafColumns().length}
                        className="h-24 text-center text-sm text-muted-foreground"
                      >
                        No examinations match your search.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile card list — visible only on small screens */}
            <div className="space-y-2.5 bg-muted/40 p-3 md:hidden">
              {table.getRowModel().rows.map((row) => {
                const item = row.original;
                return (
                  <div
                    key={row.id}
                    className="rounded-xl border border-border bg-card p-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(checked) =>
                          row.toggleSelected(checked === true)
                        }
                        aria-label={`Select examination for ${item.patientName}`}
                      />
                      <PersonAvatar
                        clinicId={clinicId}
                        ownerType="patient"
                        ownerId={item.patientId}
                        name={item.patientName}
                        size="sm"
                        className="border border-border"
                      />
                      <p className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">
                        {item.patientName}
                      </p>
                      <Badge
                        variant={ISSUE_VARIANT[item.issueType]}
                        className="shrink-0 text-[10px] capitalize"
                      >
                        {item.issueType}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {item.oralFindings}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
                      {formatDate(item.visitDate)}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/60 pt-2">
                      <Badge
                        variant={STATUS_VARIANT[item.status]}
                        className={cn(
                          "text-[11px]",
                          item.status === "cancelled" && "text-muted-foreground"
                        )}
                      >
                        {STATUS_LABEL[item.status]}
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
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-border bg-muted/20 px-4 py-2.5">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{totalCount}</span>{" "}
                {totalCount === 1 ? "Result" : "Results"}
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-7"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-3.5" aria-hidden="true" />
                </Button>
                <span className="px-1 text-xs text-muted-foreground tabular-nums">
                  Page {table.state.pagination.pageIndex + 1} of{" "}
                  {Math.max(pageCount, 1)}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-7"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  aria-label="Next page"
                >
                  <ChevronRight className="size-3.5" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </>
        )}
      </TableShell>

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
