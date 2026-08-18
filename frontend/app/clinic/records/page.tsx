"use client";

import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  type MedicalRecord,
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
} from "@/lib/clinic-api";
import { formatTime } from "@/lib/format-time";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Search,
  Download,
  Columns,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Trash2,
  X,
  Loader2,
  Paperclip,
  FileText,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
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
import { Skeleton } from "@/components/ui/skeleton";
import { sessionCan } from "@/hooks/use-clinic-session";
import StatsGeneric from "@/components/stats-generic";

const COLUMN_LABELS: Record<string, string> = {
  select: "Select",
  visitDate: "Visit Date",
  patient: "Patient",
  diagnosis: "Diagnosis",
  symptoms: "Symptoms",
  treatment: "Treatment",
};

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

interface AttachmentEntry {
  file: File | null;
  documentType: string;
  description: string;
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
  attachments: AttachmentEntry[];
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

const EMPTY_ATTACHMENT: AttachmentEntry = {
  file: null,
  documentType: "",
  description: "",
};

const ATTACHMENT_TYPES = [
  "Medical Report",
  "Lab Report",
  "Image",
  "PDF Document",
  "Other",
];

const INSTRUCTION_SUGGESTIONS = [
  "Before food",
  "After food",
  "With food",
  "Empty stomach",
  "Before breakfast",
  "After breakfast",
  "At bedtime",
  "As needed",
];

/** Curated common-medicines list used to power the medicine autocomplete. */
const COMMON_MEDICINES = [
  "Paracetamol 500mg",
  "Paracetamol Syrup (Pediatric)",
  "Ibuprofen 400mg",
  "Diclofenac 50mg",
  "Aceclofenac 100mg",
  "Amoxicillin 500mg",
  "Amoxicillin + Clavulanic Acid 625mg",
  "Azithromycin 500mg",
  "Cefixime 200mg",
  "Cefuroxime 500mg",
  "Ciprofloxacin 500mg",
  "Ofloxacin 200mg",
  "Levofloxacin 500mg",
  "Doxycycline 100mg",
  "Metronidazole 400mg",
  "Nitrofurantoin 100mg",
  "Omeprazole 20mg",
  "Pantoprazole 40mg",
  "Rabeprazole 20mg",
  "Domperidone 10mg",
  "Ondansetron 4mg",
  "Ranitidine 150mg",
  "Cetirizine 10mg",
  "Levocetirizine 5mg",
  "Loratadine 10mg",
  "Pheniramine 22.75mg/5ml",
  "Montelukast 10mg",
  "Salbutamol (Asthalin) Inhaler",
  "Budesonide Inhaler",
  "Ambroxol 30mg",
  "Dextromethorphan Syrup",
  "Cough Syrup (Chlorpheniramine + Dextromethorphan)",
  "ORS Powder",
  "Zinc Tablets",
  "Vitamin D3 60K",
  "Vitamin B12 1500mcg",
  "Folic Acid 5mg",
  "Iron + Folic Acid",
  "Calcium + Vitamin D3",
  "Metformin 500mg",
  "Glimepiride 1mg",
  "Sitagliptin 100mg",
  "Insulin Mixtard 30/70",
  "Atorvastatin 10mg",
  "Rosuvastatin 10mg",
  "Amlodipine 5mg",
  "Telmisartan 40mg",
  "Losartan 50mg",
  "Metoprolol 25mg",
  "Aspirin 75mg",
  "Clopidogrel 75mg",
  "Furosemide 40mg",
  "Spironolactone 25mg",
  "Tamsulosin 0.4mg",
  "Finasteride 5mg",
  "Levothyroxine 25mcg",
  "Betamethasone Cream",
  "Clotrimazole Cream",
  "Hydrocortisone Cream",
  "Mupirocin Ointment",
];

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
        className={`flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-sky-200 bg-white px-3 text-left text-sm outline-none transition-colors focus-visible:border-sky-400 focus-visible:ring-2 focus-visible:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-60 ${
          displayLabel ? "text-slate-900" : "text-slate-400"
        }`}
      >
        <span className="truncate">{displayLabel || placeholder || "Select..."}</span>
        <ChevronDown className={`size-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-sky-200 bg-white shadow-lg">
          <div className="border-b border-sky-100 p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder || "Search..."}
                className="h-9 rounded-lg border-sky-200 bg-sky-50/40 pl-8 text-sm"
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
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-slate-500 hover:bg-sky-50"
              >
                {emptyLabel || "None"}
              </button>
            )}
            {filtered.length === 0 && (
              <div className="px-2.5 py-4 text-center text-sm text-slate-400">
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
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-sky-50 ${
                  o.value === value ? "bg-sky-50 font-medium text-sky-800" : "text-slate-700"
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

/** Autocomplete medicine-name input with suggestions; free text is allowed. */
function MedicineNameInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return COMMON_MEDICINES.slice(0, 8);
    return COMMON_MEDICINES.filter((m) => m.toLowerCase().includes(q)).slice(0, 8);
  }, [value]);

  const exactMatch = COMMON_MEDICINES.some(
    (m) => m.toLowerCase() === value.trim().toLowerCase()
  );

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder || "Search medicine..."}
        className="h-10 rounded-xl border-sky-200 bg-white"
      />
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-sky-200 bg-white shadow-lg">
          {suggestions.length > 0 && (
            <div className="max-h-56 overflow-y-auto p-1">
              {suggestions.map((m) => (
                <button
                  key={m}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(m);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-sky-50 ${
                    m.toLowerCase() === value.trim().toLowerCase()
                      ? "bg-sky-50 font-medium text-sky-800"
                      : "text-slate-700"
                  }`}
                >
                  <span className="truncate">{m}</span>
                </button>
              ))}
            </div>
          )}
          {!exactMatch && value.trim() && (
            <div className="border-t border-sky-100 px-2.5 py-2 text-xs text-slate-400">
              {`"${value.trim()}" will be saved as a new medicine name.`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RecordsPage() {
  const session = useRequireRole("doctor");
  const clinicId = session?.clinicId ?? "";
  const searchParams = useSearchParams();
  const appointmentParam = searchParams.get("appointmentId");

  const [items, setItems] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<MedicalRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [patientLookup, setPatientLookup] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      const [patientRes, recordRes] = await Promise.all([
        listPatients(clinicId, { limit: 500 }),
        listRecords(clinicId, { limit: 200 }),
      ]);

      const map: Record<string, string> = {};
      patientRes.items.forEach((p) => {
        map[p.patientId] = p.fullName;
      });

      setPatientLookup(map);
      setItems(recordRes.items);
      setCurrentPage(1);
      setSelectedIds(new Set());
    } catch {
      toast.error("Failed to load medical records");
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [q]);

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
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

  function recordToForm(record: MedicalRecord): RecordFormState {
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
      attachments: record.attachments.map((a, i) => ({
        file: null,
        documentType: attachmentDetails[i]?.documentType ?? "",
        description: attachmentDetails[i]?.description ?? a.name,
      })),
    };
  }

  async function handleSave(form: RecordFormState) {
    setSaving(true);
    try {
      const recordPayload: Record<string, unknown> = {
        patientId: form.patientId,
        doctorId: form.doctorId || undefined,
        diagnosis: form.diagnosis,
        symptoms: form.symptoms || null,
        treatment: form.treatment || null,
        notes: serializeMetadata(form),
        visitDate: form.visitDate,
        attachments: form.attachments
          .filter((a) => a.file)
          .map((a) => ({
            name: a.file!.name,
            url: null,
            mimeType: a.file!.type || null,
          })),
      };

      let savedRecord: MedicalRecord;
      if (editing) {
        const updated = await updateRecord(clinicId, editing.recordId, recordPayload);
        savedRecord = { ...updated, notes: recordPayload.notes as string };
        toast.success("Medical record updated");
      } else {
        const newRecord = await createRecord(clinicId, recordPayload);
        savedRecord = { ...newRecord, notes: recordPayload.notes as string };

        if (form.medicines.length > 0) {
          await createPrescription(clinicId, {
            patientId: form.patientId,
            doctorId: form.doctorId || null,
            visitDate: form.visitDate,
            diagnosis: form.diagnosis,
            medicines: form.medicines,
            notes: form.advice || null,
          });
          toast.success("Medical record and prescription saved");
        } else {
          toast.success("Medical record saved");
        }
      }

      setCreating(false);
      load();
      // Open the saved medical record for review.
      setEditing(savedRecord);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save record");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(record: MedicalRecord) {
    const patientName = patientLookup[record.patientId] || record.patientId;
    if (!confirm(`Delete medical record for patient ${patientName}?`)) return;
    try {
      await deleteRecord(clinicId, record.recordId);
      toast.success("Record deleted");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete record");
    }
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
        name: "Total Records",
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
    downloadAnchor.setAttribute("download", `medical_records_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success(`Exported ${selected.length} medical records to JSON.`);
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
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreating(false)}
              className="h-9 gap-1.5 border-sky-200 bg-white text-sky-700 hover:bg-sky-50"
            >
              <ChevronLeft className="size-4" />
              Back to Records
            </Button>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold text-slate-900">New Medical Record</h1>
            <p className="text-sm text-slate-500">
              Record a patient visit with diagnosis and medicines in one place.
            </p>
          </div>
        </div>

        <div className="rounded-[28px] border border-sky-200 bg-sky-50/80 p-4 shadow-sm">
          <div className="rounded-[24px] border border-sky-100 bg-white p-5 sm:p-6">
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
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(null)}
              className="h-9 gap-1.5 border-sky-200 bg-white text-sky-700 hover:bg-sky-50"
            >
              <ChevronLeft className="size-4" />
              Back to Records
            </Button>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold text-slate-900">Medical Record</h1>
            <p className="text-sm text-slate-500">
              Saved record details — review or update the visit information.
            </p>
          </div>
        </div>

        <div className="rounded-[28px] border border-sky-200 bg-sky-50/80 p-4 shadow-sm">
          <div className="rounded-[24px] border border-sky-100 bg-white p-5 sm:p-6">
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

  return (
    <div className="flex flex-col gap-6">
      {!loading && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <StatsGeneric
            title="Medical Records"
            description="Real-time insights on diagnoses, symptom records, and treatment documentation."
            items={recordsStats}
            action={
              <Button className="flex items-center gap-1.5 shadow-sm" onClick={() => setCreating(true)}>
                <Plus className="size-4" />
                New Record
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
        <CardHeader className="border-b border-border bg-muted/20 px-6 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-semibold text-foreground">
                Medical Records Listing
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Search and manage patient consultation history, diagnosis reports, and prescribed treatments.
              </p>
            </div>
            <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:w-auto">
              <div className="relative mx-auto w-full max-w-md sm:w-72">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search records..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="h-9 w-full pl-9"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="outline" size="sm" className="h-9 gap-1.5">
                      <Columns className="size-4" />
                      Columns
                    </Button>
                  }
                />
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
              No medical records found.
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
                    {visibleColumns.visitDate && (
                      <TableHead className="font-semibold text-foreground">Visit date</TableHead>
                    )}
                    {visibleColumns.patient && (
                      <TableHead className="font-semibold text-foreground">Patient</TableHead>
                    )}
                    {visibleColumns.diagnosis && (
                      <TableHead className="font-semibold text-foreground">Diagnosis</TableHead>
                    )}
                    {visibleColumns.symptoms && (
                      <TableHead className="font-semibold text-foreground">Symptoms</TableHead>
                    )}
                    {visibleColumns.treatment && (
                      <TableHead className="font-semibold text-foreground">Treatment</TableHead>
                    )}
                    <TableHead className="text-right pr-6 font-semibold text-foreground">Actions</TableHead>
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
                        <TableCell className="font-medium text-foreground">
                          {patientLookup[r.patientId] || r.patientId}
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
                          <Button variant="ghost" size="sm" onClick={() => setEditing(r)}>
                            Edit
                          </Button>
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(r)}
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

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-muted/10">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Showing{" "}
                      <span className="font-medium">
                        {filteredItems.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
                      </span>{" "}
                      to{" "}
                      <span className="font-medium">{Math.min(currentPage * pageSize, filteredItems.length)}</span> of{" "}
                      <span className="font-medium">{filteredItems.length}</span> results
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

function RecordForm({
  clinicId,
  doctorId: initialDoctorId,
  initial,
  appointmentParam,
  restoreMedicines,
  saving,
  onSave,
}: {
  clinicId: string;
  doctorId: string;
  initial: RecordFormState;
  appointmentParam: string | null;
  restoreMedicines?: boolean;
  saving: boolean;
  onSave: (form: RecordFormState) => Promise<void>;
}) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingMasters, setLoadingMasters] = useState(true);
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

  const addAttachment = () => {
    setForm((f) => ({
      ...f,
      attachments: [...f.attachments, { ...EMPTY_ATTACHMENT }],
    }));
  };

  const removeAttachment = (index: number) => {
    setForm((f) => ({
      ...f,
      attachments: f.attachments.filter((_, i) => i !== index),
    }));
  };

  const setAttachment = (index: number, patch: Partial<AttachmentEntry>) => {
    setForm((f) => ({
      ...f,
      attachments: f.attachments.map((a, i) => (i === index ? { ...a, ...patch } : a)),
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
          listPatients(clinicId, { limit: 500 }),
          listDoctors(clinicId, { limit: 100 }),
          listAppointments(clinicId, { limit: 200 }),
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
      await onSave(form);
    } finally {
      savingRef.current = false;
    }
  }

  if (loadingMasters) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Loading form data...</div>;
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="flex items-center justify-between gap-3 border-b border-sky-100 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-600">Medical Visit</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Patient record</h2>
        </div>
      </div>

      {/* 1. VISIT INFORMATION */}
      <section className="rounded-2xl border border-sky-100 bg-sky-50/40 p-4">
        <div className="mb-4 flex items-center gap-2">
          <span className="inline-flex size-2 rounded-full bg-sky-500" />
          <h3 className="text-sm font-semibold text-sky-800">Visit information</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2 md:col-span-2">
            <Label className="text-sm font-medium text-slate-700">Patient *</Label>
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
            <Label className="text-sm font-medium text-slate-700">Visit date *</Label>
            <Input
              type="date"
              value={form.visitDate}
              onChange={(e) => set("visitDate", e.target.value)}
              className="h-11 rounded-xl border-sky-200 bg-white"
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-sm font-medium text-slate-700">Visit time</Label>
            <Input
              type="time"
              value={form.visitTime}
              onChange={(e) => set("visitTime", e.target.value)}
              className="h-11 rounded-xl border-sky-200 bg-white"
            />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label className="text-sm font-medium text-slate-700">Doctor *</Label>
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
            <Label className="text-sm font-medium text-slate-700">Appointment</Label>
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
            <Label className="text-sm font-medium text-slate-700">Visit type *</Label>
            <Select value={form.visitType} onValueChange={(v) => set("visitType", v as "new" | "followup")}>
              <SelectTrigger className="h-11 rounded-xl border-sky-200 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New Visit</SelectItem>
                <SelectItem value="followup">Follow-up</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label className="text-sm font-medium text-slate-700">Follow-up date</Label>
            <Input
              type="date"
              value={form.followUpDate}
              onChange={(e) => set("followUpDate", e.target.value)}
              className="h-11 rounded-xl border-sky-200 bg-white"
            />
          </div>
        </div>
      </section>

      {/* 2. CLINICAL INFORMATION */}
      <section className="rounded-2xl border border-sky-100 bg-sky-50/40 p-4">
        <div className="mb-4 flex items-center gap-2">
          <span className="inline-flex size-2 rounded-full bg-violet-500" />
          <h3 className="text-sm font-semibold text-violet-800">Clinical information</h3>
        </div>
        <div className="space-y-3">
          <div className="grid gap-2">
            <Label className="text-sm font-medium text-slate-700">Chief complaint / Reason for visit *</Label>
            <Textarea
              value={form.chiefComplaint}
              onChange={(e) => set("chiefComplaint", e.target.value)}
              className="min-h-20 rounded-xl border-sky-200 bg-white"
              placeholder="Describe the chief complaint..."
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-sm font-medium text-slate-700">Symptoms</Label>
            <Textarea
              value={form.symptoms}
              onChange={(e) => set("symptoms", e.target.value)}
              className="min-h-20 rounded-xl border-sky-200 bg-white"
              placeholder="Document observed symptoms..."
            />
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <Label className="text-sm font-medium text-slate-700">Diagnosis *</Label>
              <Input
                value={form.diagnosis}
                onChange={(e) => set("diagnosis", e.target.value)}
                className="h-11 rounded-xl border-sky-200 bg-white"
                placeholder="Primary diagnosis"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-sm font-medium text-slate-700">ICD Code</Label>
              <Input
                value={form.icdCode}
                onChange={(e) => set("icdCode", e.target.value)}
                className="h-11 rounded-xl border-sky-200 bg-white"
                placeholder="e.g., I10"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. MEDICINES */}
      <section className="rounded-2xl border border-sky-100 bg-sky-50/40 p-4">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-2 rounded-full bg-emerald-500" />
            <h3 className="text-sm font-semibold text-emerald-800">Medicines *</h3>
          </div>
          {form.medicines.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addMedicine}
              className="h-8 rounded-lg border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
            >
              <Plus className="size-3.5" />
              Add Another Medicine
            </Button>
          )}
        </div>
        <div className="space-y-3">
          {form.medicines.length === 0 ? (
            <div className="rounded-xl border border-dashed border-sky-200 px-4 py-6 text-center">
              <p className="text-sm text-slate-600">
                No medicines added yet. At least one medicine is required.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMedicine}
                className="mt-3 h-9 rounded-lg border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
              >
                <Plus className="size-4" />
                Add Medicine
              </Button>
            </div>
          ) : (
            form.medicines.map((medicine, i) => (
              <div key={i} className="space-y-2 rounded-xl border border-sky-100 bg-white p-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="grid gap-2 md:col-span-3">
                    <Label className="text-xs uppercase tracking-wide text-slate-500">
                      Medicine name *
                    </Label>
                    <MedicineNameInput
                      value={medicine.name}
                      onChange={(v) => setMedicine(i, { name: v })}
                      placeholder="Search or type medicine name..."
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs uppercase tracking-wide text-slate-500">Dosage *</Label>
                    <Input
                      value={medicine.dosage}
                      onChange={(e) => setMedicine(i, { dosage: e.target.value })}
                      className="h-10 rounded-xl border-sky-200 bg-white"
                      placeholder="e.g., 500mg"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs uppercase tracking-wide text-slate-500">Frequency *</Label>
                    <Input
                      value={medicine.frequency}
                      onChange={(e) => setMedicine(i, { frequency: e.target.value })}
                      className="h-10 rounded-xl border-sky-200 bg-white"
                      placeholder="e.g., Twice daily"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs uppercase tracking-wide text-slate-500">Duration *</Label>
                    <Input
                      value={medicine.duration}
                      onChange={(e) => setMedicine(i, { duration: e.target.value })}
                      className="h-10 rounded-xl border-sky-200 bg-white"
                      placeholder="e.g., 7 days"
                    />
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label className="text-xs uppercase tracking-wide text-slate-500">Instructions</Label>
                    <Input
                      value={medicine.instructions}
                      onChange={(e) => setMedicine(i, { instructions: e.target.value })}
                      list="medicine-instruction-suggestions"
                      className="h-10 rounded-xl border-sky-200 bg-white"
                      placeholder="e.g., Before food"
                    />
                    <datalist id="medicine-instruction-suggestions">
                      {INSTRUCTION_SUGGESTIONS.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>
                  <div className="flex items-end justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeMedicine(i)}
                      className="h-10 text-red-600 hover:bg-red-50 hover:text-red-700"
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
      </section>

      {/* 4. TREATMENT & ADVICE */}
      <section className="rounded-2xl border border-sky-100 bg-sky-50/40 p-4">
        <div className="mb-4 flex items-center gap-2">
          <span className="inline-flex size-2 rounded-full bg-amber-500" />
          <h3 className="text-sm font-semibold text-amber-800">Treatment & advice</h3>
        </div>
        <div className="space-y-3">
          <div className="grid gap-2">
            <Label className="text-sm font-medium text-slate-700">Treatment / Procedures</Label>
            <Textarea
              value={form.treatment}
              onChange={(e) => set("treatment", e.target.value)}
              className="min-h-20 rounded-xl border-sky-200 bg-white"
              placeholder="Describe treatment procedures..."
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-sm font-medium text-slate-700">Advice to patient</Label>
            <Textarea
              value={form.advice}
              onChange={(e) => set("advice", e.target.value)}
              className="min-h-20 rounded-xl border-sky-200 bg-white"
              placeholder="Lifestyle advice, precautions, etc."
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <Label className="text-sm font-medium text-slate-700">Next review date</Label>
              <Input
                type="date"
                value={form.nextReviewDate}
                onChange={(e) => set("nextReviewDate", e.target.value)}
                className="h-11 rounded-xl border-sky-200 bg-white"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-sm font-medium text-slate-700">Referral</Label>
              <Input
                value={form.referral}
                onChange={(e) => set("referral", e.target.value)}
                className="h-11 rounded-xl border-sky-200 bg-white"
                placeholder="Referred to specialist..."
              />
            </div>
          </div>
        </div>
      </section>

      {/* 5. ADDITIONAL INFORMATION */}
      <details className="group rounded-2xl border border-sky-100 bg-sky-50/40 p-4">
        <summary className="mb-4 cursor-pointer font-semibold text-slate-700 group-open:mb-4">
          <span className="mr-2 inline-flex size-2 rounded-full bg-rose-500 align-middle" />
          <span>Additional information</span>
          <span className="ml-2 text-xs font-normal text-slate-400">(optional)</span>
        </summary>
        <div className="space-y-3 border-t border-sky-100 pt-3">
          <div>
            <Label className="mb-2 block text-sm font-medium text-slate-700">Vitals</Label>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="grid gap-2">
                <Label className="text-xs text-slate-600">BP (mmHg)</Label>
                <Input
                  value={form.vitals.bp}
                  onChange={(e) => setVital("bp", e.target.value)}
                  className="h-10 rounded-xl border-sky-200 bg-white"
                  placeholder="120/80"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs text-slate-600">Temperature (°C)</Label>
                <Input
                  value={form.vitals.temperature}
                  onChange={(e) => setVital("temperature", e.target.value)}
                  className="h-10 rounded-xl border-sky-200 bg-white"
                  placeholder="98.6"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs text-slate-600">Pulse (bpm)</Label>
                <Input
                  value={form.vitals.pulse}
                  onChange={(e) => setVital("pulse", e.target.value)}
                  className="h-10 rounded-xl border-sky-200 bg-white"
                  placeholder="72"
                />
              </div>
            </div>
          </div>
          <div className="grid gap-2">
            <Label className="text-sm font-medium text-slate-700">Allergies</Label>
            <Textarea
              value={form.allergies}
              onChange={(e) => set("allergies", e.target.value)}
              className="min-h-16 rounded-xl border-sky-200 bg-white"
              placeholder="Known allergies..."
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-sm font-medium text-slate-700">Lab tests</Label>
            <Textarea
              value={form.labTests}
              onChange={(e) => set("labTests", e.target.value)}
              className="min-h-16 rounded-xl border-sky-200 bg-white"
              placeholder="Blood tests, X-rays, etc."
            />
          </div>
          <div className="grid gap-2">
            <Label className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
              Internal notes
              <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                Visible only to authorized clinic staff
              </span>
            </Label>
            <Textarea
              value={form.internalNotes}
              onChange={(e) => set("internalNotes", e.target.value)}
              className="min-h-16 rounded-xl border-rose-200 bg-rose-50/20"
              placeholder="Internal observations..."
            />
          </div>
        </div>
      </details>

      {/* 6. ATTACHMENTS */}
      <details className="group rounded-2xl border border-sky-100 bg-sky-50/40 p-4">
        <summary className="mb-4 cursor-pointer font-semibold text-slate-700 group-open:mb-4">
          <span className="mr-2 inline-flex size-2 rounded-full bg-teal-500 align-middle" />
          <span>Attachments</span>
          <span className="ml-2 text-xs font-normal text-slate-400">(optional)</span>
        </summary>
        <div className="space-y-3 border-t border-sky-100 pt-3">
          <p className="text-xs text-slate-500">
            Upload medical reports, lab reports, images, or PDF documents.
          </p>
          {form.attachments.map((attachment, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-sky-100 bg-white p-3">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById(`attachment-file-${i}`)?.click()}
                  className="h-9 gap-1.5 rounded-lg border-sky-200 bg-white text-sky-700 hover:bg-sky-50"
                >
                  <Paperclip className="size-3.5" />
                  {attachment.file ? attachment.file.name : "Choose file"}
                </Button>
                <input
                  id={`attachment-file-${i}`}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setAttachment(i, { file });
                  }}
                />
                {attachment.file && (
                  <span className="truncate text-xs text-slate-500">
                    {((attachment.file.size || 0) / 1024).toFixed(0)} KB
                  </span>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeAttachment(i)}
                  className="ml-auto h-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <X className="size-4" />
                </Button>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label className="text-xs uppercase tracking-wide text-slate-500">Document type</Label>
                  <Select
                    value={attachment.documentType}
                    onValueChange={(v) => setAttachment(i, { documentType: v ?? "" })}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-sky-200 bg-white">
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ATTACHMENT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs uppercase tracking-wide text-slate-500">Description</Label>
                  <Input
                    value={attachment.description}
                    onChange={(e) => setAttachment(i, { description: e.target.value })}
                    className="h-10 rounded-xl border-sky-200 bg-white"
                    placeholder="e.g., CBC report from Aug 2026"
                  />
                </div>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addAttachment}
            className="h-9 gap-1.5 rounded-lg border-teal-200 bg-white text-teal-700 hover:bg-teal-50"
          >
            <Plus className="size-3.5" />
            Add Attachment
          </Button>
        </div>
      </details>

      {/* SUMMARY */}
      <section className="rounded-2xl border border-sky-100 bg-sky-50/40 p-4">
        <div className="mb-3 flex items-center gap-2">
          <FileText className="size-4 text-sky-600" />
          <h3 className="text-sm font-semibold text-sky-800">Summary</h3>
        </div>
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <p className="text-xs text-slate-500">Patient</p>
            <p className="mt-0.5 truncate font-medium text-slate-900">
              {selectedPatient?.fullName || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Doctor</p>
            <p className="mt-0.5 truncate font-medium text-slate-900">
              {selectedDoctor?.name || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Visit date</p>
            <p className="mt-0.5 font-medium text-slate-900">
              {form.visitDate ? formatDate(form.visitDate) : "—"}
              {form.visitTime ? `, ${formatTime(form.visitTime)}` : ""}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Visit type</p>
            <p className="mt-0.5 font-medium capitalize text-slate-900">
              {form.visitType === "new" ? "New Visit" : "Follow-up"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Total medicines</p>
            <p className="mt-0.5 font-semibold text-slate-900">{form.medicines.length}</p>
          </div>
        </div>
      </section>

      {/* ACTIONS */}
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-sky-100 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={resetForm}
          disabled={saving}
          className="h-10 rounded-xl border-sky-200 bg-white text-slate-700 hover:bg-sky-50"
        >
          Reset
        </Button>
        <Button
          type="submit"
          disabled={saving}
          className="h-10 min-w-36 rounded-xl bg-sky-600 text-white shadow-sm hover:bg-sky-700"
        >
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Record"
          )}
        </Button>
      </div>
    </form>
  );
}