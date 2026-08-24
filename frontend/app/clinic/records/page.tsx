"use client";

import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import { useDropdownOptions } from "@/lib/dropdown-options";
import {
  SuggestionInput,
  MedicineNameInput,
  DOSAGE_SUGGESTIONS,
  FREQUENCY_SUGGESTIONS,
  DURATION_SUGGESTIONS,
} from "@/components/clinic/medicine-input";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { PersonAvatar } from "@/components/clinic/person-avatar";
import {
  type MedicineRecord,
  type Doctor,
  type Patient,
  type Appointment,
  createRecord,
  deleteRecord,
  listRecords,
  updateRecord,
  listPatients,
  listDoctors,
  listAppointments,
  listPrescriptions,
  createPrescription,
  uploadMedicalRecordFile,
} from "@/lib/clinic-api";
import { formatTime } from "@/lib/format-time";
import { Button } from "@/components/ui/button";
import { TimePicker } from "@/components/ui/time-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Trash2,
} from "lucide-react";
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
import dynamic from "next/dynamic";

const StatsGeneric = dynamic(() => import("@/components/stats-generic"), {
  loading: () => <div className="h-[270px]" aria-hidden="true" />,
});
import {
  AttachmentUploader,
  makeAttachmentFile,
  type AttachmentFile,
} from "@/components/clinic/attachment-uploader";


function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

interface MedicineEntry {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface RecordFormState {
  patientId: string;
  doctorId: string;
  visitDate: string;
  visitTime: string;
  visitType: "new" | "followup";
  appointmentId: string | null;
  followUpDate: string;
  chiefComplaint: string;
  symptoms: string;
  diagnosis: string;
  icdCode: string;
  medicines: MedicineEntry[];
  treatment: string;
  advice: string;
  nextReviewDate: string;
  referral: string;
  vitals: {
    bp: string;
    temperature: string;
    pulse: string;
  };
  allergies: string;
  labTests: string;
  internalNotes: string;
  attachments: AttachmentFile[];
}

const EMPTY_FORM: RecordFormState = {
  patientId: "",
  doctorId: "",
  visitDate: today(),
  visitTime: "",
  visitType: "new",
  appointmentId: null,
  followUpDate: "",
  chiefComplaint: "",
  symptoms: "",
  diagnosis: "",
  icdCode: "",
  medicines: [],
  treatment: "",
  advice: "",
  nextReviewDate: "",
  referral: "",
  vitals: { bp: "", temperature: "", pulse: "" },
  allergies: "",
  labTests: "",
  internalNotes: "",
  attachments: [],
};

const EMPTY_MEDICINE: MedicineEntry = {
  name: "",
  dosage: "",
  frequency: "",
  duration: "",
  instructions: "",
};

/**
 * Searchable dropdown/autocomplete for entity picks (patient, doctor,
 * appointment). Free typing filters options; click to select.
 */
function SearchableSelect({
  value,
  onChange,
  options,
  getLabel,
  getSearchText,
  placeholder,
  searchPlaceholder,
  allowEmpty,
  emptyLabel,
  disabled,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  options: { value: string; label: string }[];
  getLabel?: (value: string | null) => string;
  getSearchText?: (value: string) => string;
  placeholder?: string;
  searchPlaceholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggleOpen = () => {
    if (!open) {
      // Flip the panel upward when there is no room below (e.g. fields near a
      // card's bottom edge, where overflow-hidden would clip the list).
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const spaceBelow = window.innerHeight - rect.bottom;
        setDropUp(spaceBelow < 280 && rect.top > 280);
      } else {
        setDropUp(false);
      }
      setQuery("");
      setOpen(true);
      requestAnimationFrame(() => searchRef.current?.focus());
    } else {
      setOpen(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      const text = (getSearchText ? getSearchText(o.value) : o.label).toLowerCase();
      return text.includes(q);
    });
  }, [options, query, getSearchText]);

  const displayLabel = getLabel
    ? getLabel(value)
    : selected?.label ?? "";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={toggleOpen}
        aria-expanded={open}
        className={`flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 text-left text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60 ${
          displayLabel ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        <span className="truncate">{displayLabel || placeholder || "Select..."}</span>
        <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className={`absolute left-0 right-0 z-50 overflow-hidden rounded-xl border border-border bg-background shadow-lg ${
            dropUp ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder || "Search..."}
                className="h-9 rounded-lg border-border bg-accent/50 pl-8 text-sm"
              />
            </div>
          </div>
          <div role="listbox" className="max-h-56 overflow-y-auto p-1">
            {allowEmpty && (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-muted-foreground hover:bg-accent"
              >
                {emptyLabel || "None"}
              </button>
            )}
            {filtered.length === 0 && (
              <div className="px-2.5 py-4 text-center text-sm text-muted-foreground">
                No matches found
              </div>
            )}
            {filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-accent ${
                  o.value === value ? "bg-accent font-medium text-foreground" : "text-foreground"
                }`}
              >
                <span className="truncate">{o.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RecordsPage() {
  const session = useRequireRole("patient");
  const clinicId = session?.clinicId ?? "";
  const searchParams = useSearchParams();
  const appointmentParam = searchParams.get("appointmentId");

  const [items, setItems] = useState<MedicineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<MedicineRecord | null>(null);
  const [viewing, setViewing] = useState<MedicineRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MedicineRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [patientLookup, setPatientLookup] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    if (!clinicId) return;
    Promise.all([
      listPatients(clinicId, { limit: 50 }),
      listRecords(clinicId, { limit: 50 }),
    ])
      .then(([patientRes, recordRes]) => {
        const map: Record<string, string> = {};
        patientRes.items.forEach((p) => {
          map[p.patientId] = p.fullName;
        });

        setPatientLookup(map);
        setItems(recordRes.items);
        setCurrentPage(1);
        setSelectedIds(new Set());
      })
      .catch(() => {
        toast.error("Failed to load medicine records");
      })
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
    visitDate: true,
    patient: true,
    diagnosis: true,
    symptoms: true,
    treatment: true,
  });

  function serializeMetadata(form: RecordFormState): string {
    const metadata = {
      visitType: form.visitType,
      visitTime: form.visitTime || null,
      appointmentId: form.appointmentId,
      followUpDate: form.followUpDate || null,
      chiefComplaint: form.chiefComplaint,
      icdCode: form.icdCode || null,
      advice: form.advice,
      nextReviewDate: form.nextReviewDate || null,
      referral: form.referral || null,
      vitals: form.vitals,
      allergies: form.allergies,
      labTests: form.labTests,
      internalNotes: form.internalNotes,
      attachmentDetails: form.attachments.map((a) => ({
        documentType: a.documentType,
        description: a.description,
      })),
    };
    return JSON.stringify(metadata);
  }

  function recordToForm(record: MedicineRecord): RecordFormState {
    let meta: Record<string, unknown> = {};
    if (record.notes) {
      try {
        meta = JSON.parse(record.notes) as Record<string, unknown>;
      } catch {
        meta = {};
      }
    }
    const str = (v: unknown): string => (typeof v === "string" ? v : "");
    const attachmentDetails = Array.isArray(meta.attachmentDetails)
      ? (meta.attachmentDetails as { documentType?: string; description?: string }[])
      : [];
    return {
      patientId: record.patientId,
      doctorId: record.doctorId,
      visitDate: record.visitDate,
      visitTime: str(meta.visitTime),
      visitType: meta.visitType === "followup" ? "followup" : "new",
      appointmentId: str(meta.appointmentId) || null,
      followUpDate: str(meta.followUpDate),
      chiefComplaint: str(meta.chiefComplaint),
      symptoms: record.symptoms ?? "",
      diagnosis: record.diagnosis,
      icdCode: str(meta.icdCode),
      medicines: [],
      treatment: record.treatment ?? "",
      advice: str(meta.advice),
      nextReviewDate: str(meta.nextReviewDate),
      referral: str(meta.referral),
      vitals: {
        bp: str((meta.vitals as { bp?: string } | undefined)?.bp),
        temperature: str((meta.vitals as { temperature?: string } | undefined)?.temperature),
        pulse: str((meta.vitals as { pulse?: string } | undefined)?.pulse),
      },
      allergies: str(meta.allergies),
      labTests: str(meta.labTests),
      internalNotes: str(meta.internalNotes),
      attachments: record.attachments.map((a, i) =>
        makeAttachmentFile(null, {
          documentType: attachmentDetails[i]?.documentType ?? "",
          description: attachmentDetails[i]?.description ?? a.name,
          name: a.name,
          mimeType: a.mimeType,
          url: a.url,
          fileId: a.fileId ?? null,
        })
      ),
    };
  }

  async function handleSave(form: RecordFormState) {
    setSaving(true);
    try {
      const uploadedAttachments: { name: string; url: string | null; mimeType: string | null; fileId?: string | null }[] =
        [];
      for (const a of form.attachments.filter((a) => a.file)) {
        try {
          const uploaded = await uploadMedicalRecordFile(
            clinicId,
            form.patientId,
            a.file!,
            "medicine"
          );
          uploadedAttachments.push({
            name: a.file!.name,
            url: null,
            mimeType: a.file!.type || null,
            fileId: uploaded.fileId,
          });
        } catch (err) {
          toast.error(
            `Failed to upload ${a.file!.name}${err instanceof Error ? `: ${err.message}` : ""}`
          );
        }
      }
      for (const a of form.attachments.filter((a) => !a.file && a.fileId)) {
        uploadedAttachments.push({
          name: a.name,
          url: a.url,
          mimeType: a.mimeType,
          fileId: a.fileId,
        });
      }

      const recordPayload: Record<string, unknown> = {
        patientId: form.patientId,
        doctorId: form.doctorId || undefined,
        diagnosis: form.diagnosis,
        symptoms: form.symptoms || null,
        treatment: form.treatment || null,
        notes: serializeMetadata(form),
        visitDate: form.visitDate,
        attachments: uploadedAttachments,
      };

      if (editing) {
        await updateRecord(clinicId, editing.recordId, recordPayload);
        toast.success("Medicine record updated");
      } else {
        await createRecord(clinicId, recordPayload);

        if (form.medicines.length > 0) {
          await createPrescription(clinicId, {
            patientId: form.patientId,
            doctorId: form.doctorId || null,
            visitDate: form.visitDate,
            diagnosis: form.diagnosis,
            medicines: form.medicines,
            notes: form.advice || null,
          });
          toast.success("Medicine record and prescription saved");
        } else {
          toast.success("Medicine record saved");
        }
      }

      setCreating(false);
      setEditing(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save record");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(record: MedicineRecord) {
    await deleteRecord(clinicId, record.recordId);
    toast.success("Record deleted");
    load();
  }

  const canManage = sessionCan(session, "clinic_admin");

  const filteredItems = useMemo(() => {
    if (!q) return items;
    const lower = q.toLowerCase();
    return items.filter((r) => {
      const pName = (patientLookup[r.patientId] || "").toLowerCase();
      return (
        pName.includes(lower) ||
        r.patientId.toLowerCase().includes(lower) ||
        r.diagnosis.toLowerCase().includes(lower) ||
        (r.symptoms && r.symptoms.toLowerCase().includes(lower)) ||
        (r.treatment && r.treatment.toLowerCase().includes(lower))
      );
    });
  }, [items, q, patientLookup]);

  const totalCount = items.length;
  const uniquePatients = new Set(items.map((i) => i.patientId)).size;
  const thisMonthRecords = items.filter((i) => {
    const recordDate = new Date(i.visitDate);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return recordDate >= thirtyDaysAgo;
  }).length;
  const withTreatmentCount = items.filter((i) => i.treatment).length;

  const recordsStats = useMemo(
    () => [
      {
        name: "Total Medicines",
        percentage: Math.min(100, Math.round((totalCount / 500) * 100)),
        current: totalCount,
        allowed: 500,
        allowedLabel: "target limit",
        fill: "var(--chart-1)",
      },
      {
        name: "Unique Patients Visited",
        percentage: totalCount ? Math.round((uniquePatients / totalCount) * 100) : 0,
        current: uniquePatients,
        allowed: totalCount,
        allowedLabel: "total patients",
        fill: "var(--chart-2)",
      },
      {
        name: "Recent Visits (30d)",
        percentage: totalCount ? Math.round((thisMonthRecords / totalCount) * 100) : 0,
        current: thisMonthRecords,
        allowed: totalCount,
        allowedLabel: "total records",
        fill: "var(--chart-3)",
      },
      {
        name: "Treatment Coverage",
        percentage: totalCount ? Math.round((withTreatmentCount / totalCount) * 100) : 0,
        current: withTreatmentCount,
        allowed: totalCount,
        allowedLabel: "documented",
        fill: "var(--chart-4)",
      },
    ],
    [totalCount, uniquePatients, thisMonthRecords, withTreatmentCount]
  );

  const handleBulkExport = () => {
    const selected = items.filter((r) => selectedIds.has(r.recordId));
    const mappedSelected = selected.map((r) => ({
      ...r,
      patientName: patientLookup[r.patientId] || "Unknown",
    }));
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(mappedSelected, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `medicine_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success(`Exported ${selected.length} medicine records to JSON.`);
  };

  const totalPages = Math.ceil(filteredItems.length / pageSize);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredItems.slice(startIndex, startIndex + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedItems.map((r) => r.recordId)));
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
                <h1 className="text-2xl font-bold text-foreground">New Medicine Record</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Record a patient visit with diagnosis and medicines in one place
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <RecordForm
              clinicId={clinicId}
              doctorId={session?.doctorId ?? ""}
              initial={EMPTY_FORM}
              appointmentParam={appointmentParam}
              saving={saving}
              onSave={async (form) => {
                await handleSave(form);
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
                <h1 className="text-2xl font-bold text-foreground">Medicine Record</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Saved record details — review or update the visit information
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <RecordForm
              clinicId={clinicId}
              doctorId={session?.doctorId ?? ""}
              initial={recordToForm(editing)}
              appointmentParam={null}
              restoreMedicines
              saving={saving}
              onSave={async (form) => {
                await handleSave(form);
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
                <h1 className="text-2xl font-bold text-foreground">View Medicine Record</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Read-only view of the visit information
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <RecordForm
              clinicId={clinicId}
              doctorId={session?.doctorId ?? ""}
              initial={recordToForm(viewing)}
              appointmentParam={null}
              restoreMedicines
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
      {!loading && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <StatsGeneric
            title="Medical Record Analytics"
            description="Clinical visits, patient diagnoses, and treatment documentation insights."
            items={recordsStats}
            searchTerm={q}
            onSearchChange={handleSearchChange}
            searchPlaceholder="Search patient, diagnosis, treatment..."
            action={
              <Button className="flex items-center gap-1.5 shadow-sm" onClick={() => setCreating(true)}>
                <Plus className="size-4" />
                New Medicine
              </Button>
            }
          />
        </div>
      )}

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
              No medicine records found.
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
                    {visibleColumns.visitDate && (
                      <TableHead>Visit date</TableHead>
                    )}
                    {visibleColumns.patient && (
                      <TableHead>Patient</TableHead>
                    )}
                    {visibleColumns.diagnosis && (
                      <TableHead>Diagnosis</TableHead>
                    )}
                    {visibleColumns.symptoms && (
                      <TableHead>Symptoms</TableHead>
                    )}
                    {visibleColumns.treatment && (
                      <TableHead>Treatment</TableHead>
                    )}
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((r) => (
                    <TableRow
                      key={r.recordId}
                      className={`hover:bg-muted/30 border-b border-border last:border-0 ${
                        selectedIds.has(r.recordId) ? "bg-muted/30" : ""
                      }`}
                    >
                      {visibleColumns.select && (
                        <TableCell className="pl-6">
                          <Checkbox
                            checked={selectedIds.has(r.recordId)}
                            onCheckedChange={() => toggleSelectRow(r.recordId)}
                            aria-label={`Select record for ${patientLookup[r.patientId] || r.patientId}`}
                          />
                        </TableCell>
                      )}
                      {visibleColumns.visitDate && (
                        <TableCell className="text-muted-foreground">{formatDate(r.visitDate)}</TableCell>
                      )}
                      {visibleColumns.patient && (
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <PersonAvatar clinicId={clinicId} ownerType="patient" ownerId={r.patientId} name={patientLookup[r.patientId] || r.patientId} />
                            <span className="font-medium text-foreground">
                              {patientLookup[r.patientId] || r.patientId}
                            </span>
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.diagnosis && (
                        <TableCell className="max-w-48 truncate font-medium text-foreground">
                          {r.diagnosis}
                        </TableCell>
                      )}
                      {visibleColumns.symptoms && (
                        <TableCell className="max-w-40 truncate text-muted-foreground">
                          {r.symptoms ?? "—"}
                        </TableCell>
                      )}
                      {visibleColumns.treatment && (
                        <TableCell className="max-w-40 truncate text-muted-foreground">
                          {r.treatment ?? "—"}
                        </TableCell>
                      )}
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setViewing(r)}>
                            View
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditing(r)}>
                            Edit
                          </Button>
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteTarget(r)}
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
        title="Delete medicine record?"
        description={
          deleteTarget
            ? `Delete the medicine record for patient ${
                patientLookup[deleteTarget.patientId] ?? deleteTarget.patientId
              }?`
            : undefined
        }
        onConfirm={async () => {
          if (deleteTarget) await handleDelete(deleteTarget);
        }}
      />
    </div>
  );
}

function RecordForm({
  clinicId,
  doctorId: initialDoctorId,
  initial,
  appointmentParam,
  restoreMedicines,
  saving,
  onSave,
  readOnly,
}: {
  clinicId: string;
  doctorId: string;
  initial: RecordFormState;
  appointmentParam: string | null;
  restoreMedicines?: boolean;
  saving: boolean;
  onSave?: (form: RecordFormState) => Promise<void>;
  readOnly?: boolean;
}) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingMasters, setLoadingMasters] = useState(true);
  const { getOptions } = useDropdownOptions(clinicId);
  const [form, setForm] = useState<RecordFormState>({
    ...initial,
    doctorId: initial.doctorId || initialDoctorId,
  });
  const savingRef = useRef(false);

  const set = <K extends keyof RecordFormState>(key: K, value: RecordFormState[K] | null) =>
    setForm((f) => ({ ...f, [key]: (value ?? "") as RecordFormState[K] }));

  const setVital = (key: keyof RecordFormState["vitals"], value: string) => {
    setForm((f) => ({
      ...f,
      vitals: { ...f.vitals, [key]: value },
    }));
  };

  const addMedicine = () => {
    setForm((f) => ({
      ...f,
      medicines: [...f.medicines, { ...EMPTY_MEDICINE }],
    }));
  };

  const removeMedicine = (index: number) => {
    setForm((f) => ({
      ...f,
      medicines: f.medicines.filter((_, i) => i !== index),
    }));
  };

  const setMedicine = (index: number, patch: Partial<MedicineEntry>) => {
    setForm((f) => ({
      ...f,
      medicines: f.medicines.map((m, i) => (i === index ? { ...m, ...patch } : m)),
    }));
  };

  const resetForm = () => {
    setForm({ ...initial, doctorId: initial.doctorId || initialDoctorId });
  };

  const applyAppointment = (appt: Appointment) => {
    setForm((f) => ({
      ...f,
      patientId: appt.patientId,
      doctorId: appt.doctorId || f.doctorId,
      visitDate: appt.date,
      visitTime: appt.time || f.visitTime,
      visitType: "new",
      appointmentId: appt.appointmentId,
    }));
  };

  useEffect(() => {
    const loadMasters = async () => {
      if (!clinicId) return;
      setLoadingMasters(true);
      try {
        const [pRes, dRes, aRes] = await Promise.all([
          listPatients(clinicId, { limit: 50 }),
          listDoctors(clinicId, { limit: 50 }),
          listAppointments(clinicId, { limit: 50 }),
        ]);
        setPatients(pRes.items);
        setDoctors(dRes.items);
        setAppointments(aRes.items);
      } catch {
        toast.error("Failed to load patient/doctor lists");
      } finally {
        setLoadingMasters(false);
      }
    };
    loadMasters();
  }, [clinicId]);

  // Auto-fill the record when opened from an appointment (?appointmentId=...).
  useEffect(() => {
    if (!appointmentParam || form.appointmentId) return;
    const appt = appointments.find((a) => a.appointmentId === appointmentParam);
    if (appt) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      applyAppointment(appt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments, appointmentParam]);

  // Restore medicines saved alongside the record (stored as a prescription).
  useEffect(() => {
    if (!restoreMedicines || !clinicId || !form.patientId || form.medicines.length > 0) return;
    let active = true;
    listPrescriptions(clinicId, { patientId: form.patientId, limit: 10 })
      .then((res) => {
        if (!active) return;
        const match =
          res.items.find((p) => p.visitDate === form.visitDate) ?? res.items[0];
        if (!match || match.medicines.length === 0) return;
        setForm((f) => ({
          ...f,
          medicines: match.medicines.map((m) => ({
            name: m.name,
            dosage: m.dosage ?? "",
            frequency: m.frequency ?? "",
            duration: m.duration ?? "",
            instructions: m.instructions ?? "",
          })),
        }));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoreMedicines, clinicId, form.patientId, form.visitDate]);

  const patientOptions = useMemo(
    () =>
      patients.map((p) => ({
        value: p.patientId,
        label: `${p.fullName}${p.mobile ? ` (${p.mobile})` : ""}`,
      })),
    [patients]
  );

  const doctorOptions = useMemo(
    () =>
      doctors.map((d) => ({
        value: d.doctorId,
        label: `${d.name}${d.specialization ? ` (${d.specialization})` : ""}`,
      })),
    [doctors]
  );

  const appointmentOptions = useMemo(() => {
    const pName = (id: string) => patients.find((p) => p.patientId === id)?.fullName ?? "Unknown";
    const dName = (id: string) => doctors.find((d) => d.doctorId === id)?.name ?? "";
    return appointments.map((a) => ({
      value: a.appointmentId,
      label: `${pName(a.patientId)} — ${formatDate(a.date)}, ${formatTime(a.time)}${dName(a.doctorId) ? ` · ${dName(a.doctorId)}` : ""}`,
    }));
  }, [appointments, patients, doctors]);

  const selectedPatient = patients.find((p) => p.patientId === form.patientId);
  const selectedDoctor = doctors.find((d) => d.doctorId === form.doctorId);

  const validateForm = (): string | null => {
    if (!form.patientId) return "Patient is required";
    if (!form.visitDate) return "Visit date is required";
    if (!form.doctorId) return "Doctor is required";
    if (!form.visitType) return "Visit type is required";
    if (!form.chiefComplaint.trim()) return "Chief complaint / reason for visit is required";
    if (!form.diagnosis.trim()) return "Diagnosis is required";
    if (form.medicines.length === 0) return "At least one medicine is required";

    for (let i = 0; i < form.medicines.length; i++) {
      const m = form.medicines[i];
      if (!m.name.trim()) return `Medicine ${i + 1}: Name is required`;
      if (!m.dosage.trim()) return `Medicine ${i + 1}: Dosage is required`;
      if (!m.frequency.trim()) return `Medicine ${i + 1}: Frequency is required`;
      if (!m.duration.trim()) return `Medicine ${i + 1}: Duration is required`;
    }
    return null;
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving || savingRef.current) return;
    const error = validateForm();
    if (error) {
      toast.error(error);
      return;
    }
    savingRef.current = true;
    try {
      if (onSave) await onSave(form);
    } finally {
      savingRef.current = false;
    }
  }

  if (loadingMasters) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Loading form data...</div>;
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <fieldset disabled={readOnly} className="space-y-6 border-0 p-0 m-0">

      {/* 1. VISIT INFORMATION */}
      <Card className="border-border bg-gradient-to-b from-muted/50 to-transparent overflow-visible">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            1. Visit Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2 md:col-span-2">
            <Label className="text-sm font-medium text-foreground">Patient *</Label>
            <SearchableSelect
              value={form.patientId || null}
              onChange={(v) => set("patientId", v)}
              options={patientOptions}
              placeholder="Search patient by name or mobile..."
              searchPlaceholder="Search patient..."
              getSearchText={(id) => {
                const p = patients.find((x) => x.patientId === id);
                return p ? `${p.fullName} ${p.mobile}` : id;
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-sm font-medium text-foreground">Visit date *</Label>
            <Input
              type="date"
              value={form.visitDate}
              onChange={(e) => set("visitDate", e.target.value)}
              className="h-11 rounded-xl border border-border bg-background focus:ring-ring"
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-sm font-medium text-foreground">Visit time</Label>
            <TimePicker
              value={form.visitTime}
              onChange={(v) => set("visitTime", v)}
            />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label className="text-sm font-medium text-foreground">Doctor *</Label>
            <SearchableSelect
              value={form.doctorId || null}
              onChange={(v) => set("doctorId", v)}
              options={doctorOptions}
              placeholder="Search doctor..."
              searchPlaceholder="Search doctor..."
              getSearchText={(id) => {
                const d = doctors.find((x) => x.doctorId === id);
                return d ? `${d.name} ${d.specialization}` : id;
              }}
            />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label className="text-sm font-medium text-foreground">Appointment</Label>
            <SearchableSelect
              value={form.appointmentId}
              onChange={(v) => {
                if (v) {
                  const appt = appointments.find((a) => a.appointmentId === v);
                  if (appt) applyAppointment(appt);
                } else {
                  set("appointmentId", null);
                }
              }}
              options={appointmentOptions}
              placeholder="Link to an appointment (optional)..."
              searchPlaceholder="Search appointment..."
              allowEmpty
              emptyLabel="No appointment"
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-sm font-medium text-foreground">Visit type *</Label>
            <Select value={form.visitType} onValueChange={(v) => set("visitType", v as "new" | "followup")}>
              <SelectTrigger className="h-11 rounded-xl border border-border bg-background focus:ring-ring">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New Visit</SelectItem>
                <SelectItem value="followup">Follow-up</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label className="text-sm font-medium text-foreground">Follow-up date</Label>
            <Input
              type="date"
              value={form.followUpDate}
              onChange={(e) => set("followUpDate", e.target.value)}
              className="h-11 rounded-xl border border-border bg-background focus:ring-ring"
            />
          </div>
        </div>
      </CardContent>
      </Card>

      {/* 2. CLINICAL INFORMATION */}
      <Card className="border-border bg-gradient-to-b from-muted/50 to-transparent overflow-visible">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            2. Clinical Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="grid gap-2">
            <Label className="text-sm font-medium text-foreground">Chief complaint / Reason for visit *</Label>
            <Textarea
              value={form.chiefComplaint}
              onChange={(e) => set("chiefComplaint", e.target.value)}
              className="min-h-20 rounded-xl border border-border bg-background focus:ring-ring"
              placeholder="Describe the chief complaint..."
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-sm font-medium text-foreground">Symptoms</Label>
            <Textarea
              value={form.symptoms}
              onChange={(e) => set("symptoms", e.target.value)}
              className="min-h-20 rounded-xl border border-border bg-background focus:ring-ring"
              placeholder="Document observed symptoms..."
            />
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <Label className="text-sm font-medium text-foreground">Diagnosis *</Label>
              <Input
                value={form.diagnosis}
                onChange={(e) => set("diagnosis", e.target.value)}
                className="h-11 rounded-xl border border-border bg-background focus:ring-ring"
                placeholder="Primary diagnosis"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-sm font-medium text-foreground">ICD Code</Label>
              <Input
                value={form.icdCode}
                onChange={(e) => set("icdCode", e.target.value)}
                className="h-11 rounded-xl border border-border bg-background focus:ring-ring"
                placeholder="e.g., I10"
              />
            </div>
          </div>
        </div>
      </CardContent>
      </Card>

      {/* 3. MEDICINES */}
      <Card className="border-border bg-gradient-to-b from-muted/50 to-transparent overflow-visible">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold text-foreground">
              3. Medicines *
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addMedicine}
              className="h-8 border-primary/30 text-primary hover:bg-accent"
            >
              <Plus className="size-3.5" />
              Add Another Medicine
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
        <div className="space-y-3">
          {form.medicines.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">
                No medicines added yet. At least one medicine is required.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMedicine}
                className="mt-3 h-9 rounded-lg border-primary/30 text-primary hover:bg-accent"
              >
                <Plus className="size-4" />
                Add Medicine
              </Button>
            </div>
          ) : (
            form.medicines.map((medicine, i) => (
              <div key={i} className="space-y-2 rounded-lg border border-border bg-background p-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="grid gap-2 md:col-span-3">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                      Medicine name *
                    </Label>
                    <MedicineNameInput
                      clinicId={clinicId}
                      value={medicine.name}
                      onChange={(v) => setMedicine(i, { name: v })}
                      placeholder="Search or type medicine name..."
                      className="h-10 rounded-xl border border-border bg-background focus:ring-ring"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Dosage *</Label>
                    <SuggestionInput
                      value={medicine.dosage}
                      onChange={(v) => setMedicine(i, { dosage: v })}
                      options={DOSAGE_SUGGESTIONS}
                      placeholder="e.g., 500mg"
                      className="h-10 rounded-xl border border-border bg-background focus:ring-ring"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Frequency *</Label>
                    <SuggestionInput
                      value={medicine.frequency}
                      onChange={(v) => setMedicine(i, { frequency: v })}
                      options={FREQUENCY_SUGGESTIONS}
                      placeholder="e.g., Twice daily"
                      className="h-10 rounded-xl border border-border bg-background focus:ring-ring"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Duration *</Label>
                    <SuggestionInput
                      value={medicine.duration}
                      onChange={(v) => setMedicine(i, { duration: v })}
                      options={DURATION_SUGGESTIONS}
                      placeholder="e.g., 7 days"
                      className="h-10 rounded-xl border border-border bg-background focus:ring-ring"
                    />
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Instructions</Label>
                    <SuggestionInput
                      value={medicine.instructions}
                      onChange={(v) => setMedicine(i, { instructions: v })}
                      options={getOptions("medicine_instructions")}
                      placeholder="e.g., Before food"
                      className="h-10 rounded-xl border border-border bg-background focus:ring-ring"
                    />
                  </div>
                  <div className="flex items-end justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeMedicine(i)}
                      className="h-10 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
      </Card>

      {/* 4. TREATMENT & ADVICE */}
      <Card className="border-border bg-gradient-to-b from-muted/50 to-transparent overflow-visible">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            4. Treatment & Advice
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="grid gap-2">
            <Label className="text-sm font-medium text-foreground">Treatment / Procedures</Label>
            <Textarea
              value={form.treatment}
              onChange={(e) => set("treatment", e.target.value)}
              className="min-h-20 rounded-xl border border-border bg-background focus:ring-ring"
              placeholder="Describe treatment procedures..."
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-sm font-medium text-foreground">Advice to patient</Label>
            <Textarea
              value={form.advice}
              onChange={(e) => set("advice", e.target.value)}
              className="min-h-20 rounded-xl border border-border bg-background focus:ring-ring"
              placeholder="Lifestyle advice, precautions, etc."
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <Label className="text-sm font-medium text-foreground">Next review date</Label>
              <Input
                type="date"
                value={form.nextReviewDate}
                onChange={(e) => set("nextReviewDate", e.target.value)}
                className="h-11 rounded-xl border border-border bg-background focus:ring-ring"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-sm font-medium text-foreground">Referral</Label>
              <Input
                value={form.referral}
                onChange={(e) => set("referral", e.target.value)}
                className="h-11 rounded-xl border border-border bg-background focus:ring-ring"
                placeholder="Referred to specialist..."
              />
            </div>
          </div>
        </div>
      </CardContent>
      </Card>

      {/* 5. ADDITIONAL INFORMATION */}
      <Card className="border-border bg-gradient-to-b from-muted/50 to-transparent overflow-visible">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            5. Additional Information (Optional)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-2 block text-sm font-medium text-foreground">Vitals</Label>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">BP (mmHg)</Label>
                <Input
                  value={form.vitals.bp}
                  onChange={(e) => setVital("bp", e.target.value)}
                  className="h-10 rounded-xl border border-border bg-background focus:ring-ring"
                  placeholder="120/80"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">Temperature (°C)</Label>
                <Input
                  value={form.vitals.temperature}
                  onChange={(e) => setVital("temperature", e.target.value)}
                  className="h-10 rounded-xl border border-border bg-background focus:ring-ring"
                  placeholder="98.6"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">Pulse (bpm)</Label>
                <Input
                  value={form.vitals.pulse}
                  onChange={(e) => setVital("pulse", e.target.value)}
                  className="h-10 rounded-xl border border-border bg-background focus:ring-ring"
                  placeholder="72"
                />
              </div>
            </div>
          </div>
          <div className="grid gap-2">
            <Label className="text-sm font-medium text-foreground">Allergies</Label>
            <Textarea
              value={form.allergies}
              onChange={(e) => set("allergies", e.target.value)}
              className="min-h-16 rounded-xl border border-border bg-background focus:ring-ring"
              placeholder="Known allergies..."
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-sm font-medium text-foreground">Lab tests</Label>
            <Textarea
              value={form.labTests}
              onChange={(e) => set("labTests", e.target.value)}
              className="min-h-16 rounded-xl border border-border bg-background focus:ring-ring"
              placeholder="Blood tests, X-rays, etc."
            />
          </div>
          <div className="grid gap-2">
            <Label className="mb-1 flex items-center gap-2 text-sm font-medium text-foreground">
              Internal notes
              <span className="inline-flex rounded-full border border-warning/25 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                Visible only to authorized clinic staff
              </span>
            </Label>
            <Textarea
              value={form.internalNotes}
              onChange={(e) => set("internalNotes", e.target.value)}
              className="min-h-16 rounded-xl border-warning/25 bg-warning/5"
              placeholder="Internal observations..."
            />
          </div>
      </CardContent>
      </Card>

      {/* 6. ATTACHMENTS */}
      <Card className="border-border bg-gradient-to-b from-muted/50 to-transparent overflow-visible">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            6. Attachments (Optional)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AttachmentUploader
            files={form.attachments}
            onChange={(files) => setForm((f) => ({ ...f, attachments: files }))}
            description="Upload medical reports, lab reports, images, videos, or PDF documents. Supports PDF, PNG, JPG, MP4, MOV, WEBM up to 25 MB."
          />
        </CardContent>
      </Card>

      {/* SUMMARY */}
      <Card className="border-border bg-gradient-to-b from-muted/50 to-transparent overflow-visible">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            7. Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <p className="text-xs text-muted-foreground">Patient</p>
            <p className="mt-0.5 truncate font-medium text-foreground">
              {selectedPatient?.fullName || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Doctor</p>
            <p className="mt-0.5 truncate font-medium text-foreground">
              {selectedDoctor?.name || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Visit date</p>
            <p className="mt-0.5 font-medium text-foreground">
              {form.visitDate ? formatDate(form.visitDate) : "—"}
              {form.visitTime ? `, ${formatTime(form.visitTime)}` : ""}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Visit type</p>
            <p className="mt-0.5 font-medium capitalize text-foreground">
              {form.visitType === "new" ? "New Visit" : "Follow-up"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total medicines</p>
            <p className="mt-0.5 font-semibold text-foreground">{form.medicines.length}</p>
          </div>
        </div>
      </CardContent>
      </Card>
      </fieldset>

      {/* ACTIONS */}
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
            {saving ? "Saving..." : "Save Record"}
          </Button>
        </div>
      )}
    </form>
  );
}