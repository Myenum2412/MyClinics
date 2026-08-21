"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  type Appointment,
  type AppointmentStatus,
  type Doctor,
  type MedicalRecordFile,
  type MedicalRecordFolder,
  type MedicineRecord,
  type PageResult,
  type Patient,
  type Prescription,
  copyMedicalRecordFile,
  copyMedicalRecordFolder,
  createAppointment,
  createMedicalRecordFolder,
  deleteAppointment,
  deleteMedicalRecordFile,
  deleteMedicalRecordFolder,
  getMedicalRecordDownloadUrl,
  listAppointments,
  listDoctors,
  listMedicalRecordFiles,
  listMedicalRecordFolders,
  listPatients,
  listPrescriptions,
  listRecords,
  moveMedicalRecordFile,
  moveMedicalRecordFolder,
  renameMedicalRecordFile,
  renameMedicalRecordFolder,
  updateAppointment,
  uploadMedicalRecordFile,
  uploadMedicalRecordFileVersion,
} from "@/lib/clinic-api";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { PersonAvatar } from "@/components/clinic/person-avatar";
import { openInNewTab } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TimePicker } from "@/components/ui/time-picker";
import { formatTime } from "@/lib/format-time";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CalendarDays,
  ClipboardCopy,
  ClipboardList,
  Copy,
  Download,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderPlus,
  FolderUp,
  History,
  Loader2,
  MoreHorizontal,
  Pencil,
  Phone,
  Pill,
  Plus,
  Search,
  ShieldCheck,
  Stethoscope,
  Trash2,
  UploadCloud,
  Users,
} from "lucide-react";

const MAX_FILE_BYTES = 25 * 1024 * 1024;

const APPT_STATUSES: AppointmentStatus[] = ["scheduled", "completed", "cancelled", "no_show"];

const APPT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

const APPT_STATUS_CLASS: Record<AppointmentStatus, string> = {
  scheduled: "bg-primary/10 text-primary border border-primary/20",
  completed: "bg-success/10 text-success border border-success/20",
  cancelled: "bg-destructive/10 text-destructive border border-destructive/20",
  no_show: "bg-warning/10 text-warning border border-warning/20",
};

// ── Strict medical-document allowlist (mirrors backend upload-guard) ──────

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".xlsx", ".jpg", ".jpeg", ".png", ".tif", ".tiff", ".dcm"];

const ACCEPT = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "application/dicom",
  ...ALLOWED_EXTENSIONS,
].join(",");

function isAllowedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  if (ext && !ALLOWED_EXTENSIONS.includes(ext)) return false;
  const mime = file.type.toLowerCase();
  if (mime) {
    return (
      mime === "application/pdf" ||
      mime === "application/dicom" ||
      mime === "application/dcm" ||
      mime === "image/jpeg" ||
      mime === "image/png" ||
      mime === "image/tiff" ||
      mime.includes("openxmlformats-officedocument.wordprocessingml") ||
      mime.includes("openxmlformats-officedocument.spreadsheetml")
    );
  }
  return true;
}

// ── Formatting helpers ─────────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function calculateAge(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

function fileIcon(mimeType: string | null, name: string) {
  const m = (mimeType ?? "").toLowerCase();
  const n = name.toLowerCase();
  if (m.startsWith("image/") || n.endsWith(".jpg") || n.endsWith(".png") || n.endsWith(".tif") || n.endsWith(".dcm"))
    return <FileImage className="size-5 text-purple-500" />;
  if (m.includes("spreadsheet") || n.endsWith(".xlsx") || n.endsWith(".xls"))
    return <FileSpreadsheet className="size-5 text-success" />;
  if (m.includes("pdf") || m.includes("word") || m.includes("document"))
    return <FileText className="size-5 text-primary" />;
  return <File className="size-5 text-muted-foreground" />;
}

// ── Medicine-record metadata parsing (kept from the legacy page) ──────────

interface RecordMetadata {
  visitType?: unknown;
  visitTime?: unknown;
  followUpDate?: unknown;
  chiefComplaint?: unknown;
  icdCode?: unknown;
  advice?: unknown;
  nextReviewDate?: unknown;
  referral?: unknown;
  vitals?: { bp?: unknown; temperature?: unknown; pulse?: unknown };
  allergies?: unknown;
  labTests?: unknown;
  internalNotes?: unknown;
}

function parseRecordMetadata(notes: string | null): RecordMetadata | null {
  if (!notes) return null;
  const trimmed = notes.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    return JSON.parse(trimmed) as RecordMetadata;
  } catch {
    return null;
  }
}

// ── Default folder display metadata ────────────────────────────────────────

const DEFAULT_FOLDER_KEYS = [
  "prescriptions",
  "lab-reports",
  "x-rays",
  "scans",
  "certificates",
  "bills",
  "insurance",
  "other-documents",
  "medical-records",
  "medicine",
  "billing",
  "appointments",
  "patients",
] as const;

const FOLDER_META: Record<string, { title: string; icon: typeof Folder; tint: string; bg: string; hint: string }> = {
  "medical-records": { title: "Medical Records", icon: Folder, tint: "text-primary", bg: "bg-primary/10", hint: "Consultation notes, reports and documents" },
  prescriptions: { title: "Prescriptions", icon: Pill, tint: "text-emerald-600", bg: "bg-emerald-100", hint: "Prescribed medicines with dosage" },
  "lab-reports": { title: "Lab Reports", icon: ClipboardList, tint: "text-indigo-600", bg: "bg-indigo-100", hint: "Blood tests, pathology and lab results" },
  "x-rays": { title: "X Rays", icon: FileImage, tint: "text-amber-600", bg: "bg-amber-100", hint: "X-ray images and reports" },
  scans: { title: "Scans", icon: FileImage, tint: "text-cyan-600", bg: "bg-cyan-100", hint: "MRI, CT, ultrasound and other scans" },
  certificates: { title: "Certificates", icon: ShieldCheck, tint: "text-teal-600", bg: "bg-teal-100", hint: "Medical certificates and letters" },
  bills: { title: "Bills and Invoices", icon: FileSpreadsheet, tint: "text-orange-600", bg: "bg-orange-100", hint: "Billing and payment records" },
  insurance: { title: "Insurance", icon: ShieldCheck, tint: "text-rose-600", bg: "bg-rose-100", hint: "Insurance documents and claims" },
  "other-documents": { title: "Other Documents", icon: Folder, tint: "text-muted-foreground", bg: "bg-muted", hint: "Miscellaneous documents" },
  medicine: { title: "Medicine", icon: Pill, tint: "text-primary", bg: "bg-primary/10", hint: "Medicines and medication records" },
  billing: { title: "Billing", icon: FileSpreadsheet, tint: "text-orange-600", bg: "bg-orange-100", hint: "Bills and payment records" },
  appointments: { title: "Appointments", icon: CalendarDays, tint: "text-fuchsia-600", bg: "bg-fuchsia-100", hint: "Appointment documents" },
  patients: { title: "Patients", icon: Users, tint: "text-cyan-600", bg: "bg-cyan-100", hint: "Patient documents" },
};

/** Legacy folder keys on old files map onto the new default set. */
function displayFolderKey(key: string): string {
  if (key === "medical") return "medical-records";
  return key;
}

function isDefaultFolderKey(key: string): boolean {
  return (DEFAULT_FOLDER_KEYS as readonly string[]).includes(key);
}

// ── Shared UI blocks ───────────────────────────────────────────────────────

function FolderCard({
  folder,
  count,
  canManage,
  onOpen,
  onCopy,
  onRename,
  onMove,
  onDelete,
  onDropMove,
  onDropUpload,
  draggable,
  onDragStart,
}: {
  folder: MedicalRecordFolder;
  count: number;
  canManage: boolean;
  onOpen: () => void;
  onCopy: (folder: MedicalRecordFolder) => void;
  onRename: (folder: MedicalRecordFolder) => void;
  onMove: (folder: MedicalRecordFolder) => void;
  onDelete: (folder: MedicalRecordFolder) => void;
  onDropMove: (folder: MedicalRecordFolder) => void;
  onDropUpload: (folder: MedicalRecordFolder, files: FileList) => void;
  draggable: boolean;
  onDragStart: (e: DragEvent, folder: MedicalRecordFolder) => void;
}) {
  const meta = folder.isDefault && folder.defaultKey
    ? FOLDER_META[folder.defaultKey] ?? FOLDER_META["other-documents"]
    : { title: folder.name, icon: Folder, tint: "text-violet-600", bg: "bg-violet-100", hint: "Custom folder" };
  const Icon = meta.icon;
  const [over, setOver] = useState(false);

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => onDragStart(e, folder)}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const move = e.dataTransfer.getData("application/x-mrf-move");
        if (move) {
          onDropMove(folder);
          return;
        }
        if (e.dataTransfer.types.includes("Files") && e.dataTransfer.files.length > 0) {
          onDropUpload(folder, e.dataTransfer.files);
        }
      }}
      className={`group relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border p-5 text-center transition hover:border-primary/40 hover:shadow-sm ${over ? "border-primary/50 bg-accent" : "border-border bg-background"}`}
      onClick={onOpen}
    >
      <span className={`flex size-12 items-center justify-center rounded-xl ${meta.bg} ${meta.tint}`}>
        <Icon className="size-6" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{meta.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {count} file{count === 1 ? "" : "s"}
        </p>
      </div>
      <div
        className="absolute right-2 top-2"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <Button
              variant="ghost"
              size="icon"
              className="size-7 opacity-0 transition group-hover:opacity-100"
              aria-label="Folder actions"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          } />
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onSelect={onOpen}>
              <FolderUp className="size-4" /> Open
            </DropdownMenuItem>
            {canManage && !folder.isDefault && (
              <>
                <DropdownMenuItem onSelect={() => onCopy(folder)}>
                  <Copy className="size-4" /> Copy
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onRename(folder)}>
                  <Pencil className="size-4" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onMove(folder)}>
                  <Folder className="size-4" /> Move to…
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => onDelete(folder)} className="text-destructive">
                  <Trash2 className="size-4" /> Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function FileRow({
  file,
  canManage,
  onDownload,
  onCopy,
  onRename,
  onMove,
  onNewVersion,
  onDelete,
  onVersions,
  draggable,
  onDragStart,
  onDropMove,
}: {
  file: MedicalRecordFile;
  canManage: boolean;
  onDownload: (file: MedicalRecordFile) => void;
  onCopy: (file: MedicalRecordFile) => void;
  onRename: (file: MedicalRecordFile) => void;
  onMove: (file: MedicalRecordFile) => void;
  onNewVersion: (file: MedicalRecordFile) => void;
  onDelete: (file: MedicalRecordFile) => void;
  onVersions: (file: MedicalRecordFile) => void;
  draggable: boolean;
  onDragStart: (e: DragEvent, file: MedicalRecordFile) => void;
  onDropMove: (file: MedicalRecordFile) => void;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      draggable={draggable}
      onDoubleClick={() => onDownload(file)}
      title="Double-click to view"
      onDragStart={(e) => onDragStart(e, file)}
      onDragOver={(e) => {
        if (e.dataTransfer.getData("application/x-mrf-move")) {
          e.preventDefault();
          setOver(true);
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        const move = e.dataTransfer.getData("application/x-mrf-move");
        if (move) {
          e.preventDefault();
          setOver(false);
          onDropMove(file);
        }
      }}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ring-1 ring-border transition hover:bg-muted ${over ? "bg-accent ring-primary/25" : "bg-background"}`}
    >
      {fileIcon(file.mimeType, file.fileName)}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{file.fileName}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span>{formatSize(file.size)}</span>
          <span>·</span>
          <span>{formatDate(file.createdAt)}</span>
          {file.uploadedByName && (
            <>
              <span>·</span>
              <span>by {file.uploadedByName}</span>
            </>
          )}
          {file.version > 1 && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px]">v{file.version}</Badge>
          )}
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger render={
          <Button variant="ghost" size="icon" aria-label="File actions" className="size-8">
            <MoreHorizontal className="size-4" />
          </Button>
        } />
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onSelect={() => onDownload(file)}>
            <Download className="size-4" /> View / Download
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onCopy(file)}>
            <Copy className="size-4" /> Copy
          </DropdownMenuItem>
          {canManage && !file.fileId.startsWith("mrl_") && (
            <>
              <DropdownMenuItem onSelect={() => onRename(file)}>
                <Pencil className="size-4" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onMove(file)}>
                <Folder className="size-4" /> Move to…
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onNewVersion(file)}>
                <History className="size-4" /> Upload new version
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onDelete(file)} className="text-destructive">
                <Trash2 className="size-4" /> Delete
              </DropdownMenuItem>
            </>
          )}
          {canManage && file.fileId.startsWith("mrl_") && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onDelete(file)} className="text-destructive">
                <Trash2 className="size-4" /> Delete
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => onVersions(file)}>
            <History className="size-4" /> Version history
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function SectionHeading({
  Icon,
  tint,
  title,
  count,
  countLabel,
  action,
}: {
  Icon: typeof ClipboardList;
  tint: string;
  title: string;
  count: number;
  countLabel: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`flex size-8 items-center justify-center rounded-full bg-muted ${tint}`}>
        <Icon className="size-4" />
      </span>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <Badge variant="secondary">
        {count} {countLabel}
        {count === 1 ? "" : "s"}
      </Badge>
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

function MedicineRecordCard({
  record,
  doctorName,
  onDownload,
}: {
  record: MedicineRecord;
  doctorName: (doctorId: string | null) => string;
  onDownload: (fileId: string, name: string) => void;
}) {
  const meta = parseRecordMetadata(record.notes);
  const metaFields = useMemo(() => {
    if (!meta) return [];
    const fields: { label: string; value: string }[] = [];
    if (meta.chiefComplaint) fields.push({ label: "Chief Complaint", value: String(meta.chiefComplaint) });
    if (meta.visitType) fields.push({ label: "Visit Type", value: String(meta.visitType) });
    if (meta.visitTime) fields.push({ label: "Visit Time", value: String(meta.visitTime) });
    if (meta.followUpDate) fields.push({ label: "Follow-up Date", value: String(meta.followUpDate) });
    if (meta.icdCode) fields.push({ label: "ICD Code", value: String(meta.icdCode) });
    if (meta.vitals) {
      const bp = String(meta.vitals.bp ?? "").trim();
      const temp = String(meta.vitals.temperature ?? "").trim();
      const pulse = String(meta.vitals.pulse ?? "").trim();
      const parts = [bp && `BP ${bp}`, temp && `Temp ${temp}`, pulse && `Pulse ${pulse}`].filter(Boolean);
      if (parts.length > 0) fields.push({ label: "Vitals", value: parts.join(" · ") });
    }
    if (meta.allergies) fields.push({ label: "Allergies", value: String(meta.allergies) });
    if (meta.labTests) fields.push({ label: "Lab Tests", value: String(meta.labTests) });
    if (meta.advice) fields.push({ label: "Advice", value: String(meta.advice) });
    if (meta.nextReviewDate) fields.push({ label: "Next Review", value: String(meta.nextReviewDate) });
    if (meta.referral) fields.push({ label: "Referral", value: String(meta.referral) });
    if (meta.internalNotes) fields.push({ label: "Internal Notes", value: String(meta.internalNotes) });
    return fields;
  }, [meta]);

  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
            {formatDate(record.visitDate)}
          </Badge>
          <span className="text-xs text-muted-foreground">Doctor: {doctorName(record.doctorId)}</span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Diagnosis</p>
            <p className="text-sm font-medium text-foreground">{record.diagnosis}</p>
          </div>
          {record.symptoms && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Symptoms</p>
              <p className="text-sm text-foreground">{record.symptoms}</p>
            </div>
          )}
          {record.treatment && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Treatment</p>
              <p className="text-sm text-foreground">{record.treatment}</p>
            </div>
          )}
          {metaFields.map((f) => (
            <div key={f.label}>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{f.label}</p>
              <p className="text-sm text-foreground">{f.value}</p>
            </div>
          ))}
          {!meta && record.notes && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
              <p className="text-sm text-foreground">{record.notes}</p>
            </div>
          )}
        </div>
        {record.attachments.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
            {record.attachments.map((a, i) => (
              <button
                key={i}
                type="button"
                disabled={!a.fileId && !a.url}
                onClick={() => {
                  if (a.fileId) onDownload(a.fileId, a.name);
                  else if (a.url) openInNewTab(a.url);
                }}
                className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground ring-1 ring-border hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download className="size-3" />
                {a.name}
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PrescriptionCard({
  prescription,
  doctorName,
}: {
  prescription: Prescription;
  doctorName: (doctorId: string | null) => string;
}) {
  return (
    <Card className="border-success/20">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-success/10 text-success hover:bg-success/10">
            {formatDate(prescription.visitDate)}
          </Badge>
          <span className="text-xs text-muted-foreground">Doctor: {doctorName(prescription.doctorId)}</span>
        </div>
        {prescription.diagnosis && (
          <div className="mt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Diagnosis</p>
            <p className="text-sm font-medium text-foreground">{prescription.diagnosis}</p>
          </div>
        )}
        <div className="mt-3 overflow-hidden rounded-lg ring-1 ring-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Medicine</th>
                <th className="px-3 py-2 font-medium">Dosage</th>
                <th className="px-3 py-2 font-medium">Frequency</th>
                <th className="px-3 py-2 font-medium">Duration</th>
                <th className="px-3 py-2 font-medium">Instructions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {prescription.medicines.map((m, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 font-medium text-foreground">{m.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{m.dosage ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{m.frequency ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{m.duration ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{m.instructions ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {prescription.notes && (
          <p className="mt-3 text-sm text-foreground">
            <span className="font-medium text-muted-foreground">Notes: </span>
            {prescription.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

type ClipboardItem = { kind: "file" | "folder"; id: string };

export default function MedicalRecordPage() {
  const session = useRequireRole("patient");
  const router = useRouter();
  const clinicId = session?.clinicId ?? "";
  /** staff are upload-only; doctors/admins may manage the drive. */
  const canManage = session?.role !== "staff";

  /** Patients use their own portal instead of the clinic patient list. */
  useEffect(() => {
    if (session?.role === "patient") {
      router.replace("/clinic/patient/medical-records");
    }
  }, [session?.role, router]);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [files, setFiles] = useState<MedicalRecordFile[]>([]);
  /** Legacy R2 files (reports/patients/...) fetched per selected patient. */
  const [legacyFiles, setLegacyFiles] = useState<MedicalRecordFile[]>([]);
  const [folders, setFolders] = useState<MedicalRecordFolder[]>([]);
  const [records, setRecords] = useState<MedicineRecord[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [appointments, setAppointments] = useState<PageResult<Appointment>>({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  /** null = patient root; otherwise a folder id (default key or custom id). */
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [view, setView] = useState<"drive" | "overview" | "appointments">("drive");

  const [search, setSearch] = useState("");
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  const [deleteFileTarget, setDeleteFileTarget] = useState<MedicalRecordFile | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<MedicalRecordFolder | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ kind: "file" | "folder"; id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [moveTarget, setMoveTarget] = useState<{ kind: "file" | "folder"; id: string } | null>(null);
  const [moveValue, setMoveValue] = useState<string>("");
  const [moving, setMoving] = useState(false);
  const [versionsFile, setVersionsFile] = useState<MedicalRecordFile | null>(null);
  const [versionInput, setVersionInput] = useState<MedicalRecordFile | null>(null);
  const [clipboard, setClipboard] = useState<ClipboardItem | null>(null);

  const refresh = useCallback(() => {
    if (!clinicId) return;
    Promise.all([
      listPatients(clinicId, { limit: 500 }),
      listDoctors(clinicId, { limit: 100 }),
      listMedicalRecordFiles(clinicId),
      listMedicalRecordFolders(clinicId),
      listRecords(clinicId, { limit: 500 }),
      listPrescriptions(clinicId, { limit: 500 }),
      listAppointments(clinicId, { limit: 500 }),
    ])
      .then(([p, d, f, fo, r, pr, ap]) => {
        setPatients(p.items);
        setDoctors(d.items);
        setFiles(f.files);
        setFolders(fo.folders);
        setRecords(r.items);
        setPrescriptions(pr.items);
        setAppointments({ items: ap.items, total: ap.total });
      })
      .catch(() => toast.error("Failed to load medical records"))
      .finally(() => setLoading(false));
  }, [clinicId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (selectedPatient) setView("drive");
  }, [selectedPatient]);

  useEffect(() => {
    if (!clinicId || !selectedPatient) {
      setLegacyFiles([]);
      return;
    }
    listMedicalRecordFiles(clinicId, { patientId: selectedPatient.patientId })
      .then((res) => setLegacyFiles(res.files.filter((f) => f.fileId.startsWith("mrl_"))))
      .catch(() => setLegacyFiles([]));
  }, [clinicId, selectedPatient, files]);

  // Fetch per-patient folders so pre-existing patients get their default
  // folders provisioned (backend ensures them when patientId is passed).
  useEffect(() => {
    if (!clinicId || !selectedPatient) return;
    listMedicalRecordFolders(clinicId, selectedPatient.patientId)
      .then((res) =>
        setFolders((prev) => [
          ...prev.filter((fo) => fo.patientId !== selectedPatient.patientId),
          ...res.folders,
        ])
      )
      .catch(() => void 0);
  }, [clinicId, selectedPatient]);

  const doctorName = useCallback(
    (doctorId: string | null): string =>
      doctors.find((d) => d.doctorId === doctorId)?.name ?? "—",
    [doctors]
  );

  // ── Derived data ─────────────────────────────────────────────────────────

  const filteredPatients = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? patients.filter((p) => p.fullName.toLowerCase().includes(q)) : patients;
    return [...list].sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [patients, search]);

  const patientFiles = useMemo(
    () =>
      selectedPatient
        ? [
            ...files.filter((f) => f.patientId === selectedPatient.patientId),
            ...legacyFiles.filter((f) => f.patientId === selectedPatient.patientId),
          ]
        : [],
    [files, legacyFiles, selectedPatient]
  );

  const patientFolders = useMemo(
    () =>
      selectedPatient
        ? folders.filter((f) => f.patientId === selectedPatient.patientId)
        : [],
    [folders, selectedPatient]
  );

  /** Folders at the current level (root = parentFolderId null). */
  const levelFolders = useMemo(
    () => patientFolders.filter((f) => (f.parentFolderId ?? null) === activeFolderId),
    [patientFolders, activeFolderId]
  );

  /** The active folder doc, or null when at root. */
  const activeFolderDoc = useMemo(
    () => patientFolders.find((f) => f.folderId === activeFolderId) ?? null,
    [patientFolders, activeFolderId]
  );

  /** Key used to match files: defaultKey for default folders, folderId for custom ones. */
  const currentFolderKey = useMemo(
    () =>
      activeFolderDoc?.isDefault && activeFolderDoc.defaultKey
        ? activeFolderDoc.defaultKey
        : activeFolderId ?? "medical-records",
    [activeFolderDoc, activeFolderId]
  );

  const levelFiles = useMemo(() => {
    return patientFiles.filter((f) => displayFolderKey(f.folder) === currentFolderKey);
  }, [patientFiles, currentFolderKey]);

  const subfolderFiles = useMemo(() => {
    const map = new Map<string, MedicalRecordFile[]>();
    for (const f of patientFiles) {
      const key = displayFolderKey(f.folder);
      const list = map.get(key) ?? [];
      list.push(f);
      map.set(key, list);
    }
    return map;
  }, [patientFiles]);

  const searchFiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return patientFiles
      .filter(
        (f) =>
          f.fileName.toLowerCase().includes(q) ||
          f.patientName.toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [patientFiles, search]);

  const folderName = useCallback(
    (key: string): string => {
      const k = displayFolderKey(key);
      if (isDefaultFolderKey(k)) return FOLDER_META[k]?.title ?? "Folder";
      const folder = patientFolders.find((f) => f.folderId === k);
      if (folder?.isDefault && folder.defaultKey) {
        return FOLDER_META[displayFolderKey(folder.defaultKey)]?.title ?? folder.name;
      }
      return folder?.name ?? "Folder";
    },
    [patientFolders]
  );

  /** FolderId of the default folder matching currentFolderKey (for Move dialog preselection). */
  const currentFolderId = useMemo(
    () => patientFolders.find((f) => f.isDefault && f.defaultKey === currentFolderKey)?.folderId ?? null,
    [patientFolders, currentFolderKey]
  );
    const patientStats = useMemo(() => {
    const stats = new Map<
      string,
      { files: number; fileSize: number; records: number; prescriptions: number; last: string | null }
    >();
    for (const f of files) {
      const cur = stats.get(f.patientId) ?? { files: 0, fileSize: 0, records: 0, prescriptions: 0, last: null };
      cur.files += 1;
      cur.fileSize += f.size;
      if (!cur.last || f.createdAt > cur.last) cur.last = f.createdAt;
      stats.set(f.patientId, cur);
    }
    for (const r of records) {
      const cur = stats.get(r.patientId) ?? { files: 0, fileSize: 0, records: 0, prescriptions: 0, last: null };
      cur.records += 1;
      if (!cur.last || r.createdAt > cur.last) cur.last = r.createdAt;
      stats.set(r.patientId, cur);
    }
    for (const p of prescriptions) {
      const cur = stats.get(p.patientId) ?? { files: 0, fileSize: 0, records: 0, prescriptions: 0, last: null };
      cur.prescriptions += 1;
      if (!cur.last || p.createdAt > cur.last) cur.last = p.createdAt;
      stats.set(p.patientId, cur);
    }
    return stats;
  }, [files, records, prescriptions]);

  // ── Upload ───────────────────────────────────────────────────────────────

  const handleUpload = useCallback(
    async (fileList: FileList | null, targetFolder?: string) => {
      if (!selectedPatient || !fileList?.length || uploading) return;
      const target = targetFolder ?? currentFolderKey;
      setUploading(true);
      let uploaded = 0;
      let failed = 0;
      for (const file of Array.from(fileList)) {
        if (file.size > MAX_FILE_BYTES) {
          toast.error(`${file.name} exceeds 25MB — skipped`);
          failed += 1;
          continue;
        }
        if (!isAllowedFile(file)) {
          toast.error(`${file.name} — only PDF, DOCX, XLSX, JPG, PNG, TIFF and DICOM files are allowed`);
          failed += 1;
          continue;
        }
        try {
          await uploadMedicalRecordFile(clinicId, selectedPatient.patientId, file, target);
          uploaded += 1;
        } catch (err) {
          failed += 1;
          toast.error(err instanceof Error ? err.message : `Failed to upload ${file.name}`);
        }
      }
      if (uploaded > 0) {
        toast.success(
          `${uploaded} file${uploaded === 1 ? "" : "s"} uploaded — a copy was sent to ${selectedPatient.fullName}'s WhatsApp${failed > 0 ? ` (${failed} failed)` : ""}`
        );
        void refresh();
      }
      setUploading(false);
    },
    [clinicId, selectedPatient, uploading, currentFolderKey, refresh]
  );

  const onPageDragEnter = useCallback((e: DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  }, []);

  const onPageDragOver = useCallback((e: DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onPageDragLeave = useCallback(() => {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  }, []);

  const onPageDrop = useCallback(
    (e: DragEvent) => {
      if (!e.dataTransfer.types.includes("Files")) return;
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      void handleUpload(e.dataTransfer.files);
    },
    [handleUpload]
  );

  const onFolderDropUpload = useCallback(
    (folder: MedicalRecordFolder, fileList: FileList) => {
      const key = folder.isDefault && folder.defaultKey ? folder.defaultKey : folder.folderId;
      void handleUpload(fileList, key);
    },
    [handleUpload]
  );

  // ── Drag-to-move (Google Drive style) ────────────────────────────────────

  const onDragStart = useCallback(
    (e: DragEvent, kind: "file" | "folder", id: string) => {
      if (!canManage) return;
      e.dataTransfer.setData("application/x-mrf-move", JSON.stringify({ kind, id }));
      e.dataTransfer.effectAllowed = "move";
    },
    [canManage]
  );

  const onDropMove = useCallback(
    async (kind: "file" | "folder", id: string, target: MedicalRecordFolder | MedicalRecordFile) => {
      if (!canManage || !selectedPatient) return;
      try {
        if (kind === "file") {
          // Dropped onto a folder card -> move into that folder.
          if ("folderId" in target) {
            const key = target.isDefault && target.defaultKey ? target.defaultKey : target.folderId;
            const moved = await moveMedicalRecordFile(clinicId, id, key);
            toast.success(`Moved "${moved.fileName}" to ${folderName(moved.folder)}`);
          } else {
            // Dropped onto a file row -> move into the target file's folder.
            const moved = await moveMedicalRecordFile(clinicId, id, displayFolderKey(target.folder));
            toast.success(`Moved "${moved.fileName}" to ${folderName(moved.folder)}`);
          }
        } else {
          if (!("folderId" in target)) return;
          const targetId = target.folderId;
          if (id === targetId) return;
          const moved = await moveMedicalRecordFolder(clinicId, id, targetId);
          toast.success(`Moved "${moved.name}" into ${folderName(targetId)}`);
        }
        void refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to move");
      }
    },
    [canManage, selectedPatient, clinicId, folderName, refresh]
  );

  // ── Folder / file actions ────────────────────────────────────────────────

  const handleCreateFolder = useCallback(async () => {
    if (!selectedPatient) return;
    const name = newFolderName.trim();
    if (!name) {
      toast.error("Folder name is required");
      return;
    }
    setCreatingFolder(true);
    try {
      const parentFolderId = activeFolderId;
      const created = await createMedicalRecordFolder(clinicId, selectedPatient.patientId, name, parentFolderId);
      setNewFolderOpen(false);
      setNewFolderName("");
      toast.success(`Folder "${created.name}" created`);
      void refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create folder");
    } finally {
      setCreatingFolder(false);
    }
  }, [clinicId, selectedPatient, activeFolderId, newFolderName, refresh]);

  const handleDeleteFolder = useCallback(
    async (fo: MedicalRecordFolder) => {
      await deleteMedicalRecordFolder(clinicId, fo.folderId);
      toast.success(`Folder "${fo.name}" deleted`);
      if (activeFolderId === fo.folderId) setActiveFolderId(null);
      void refresh();
    },
    [clinicId, activeFolderId, refresh]
  );

  const handleDeleteFile = useCallback(
    async (file: MedicalRecordFile) => {
      await deleteMedicalRecordFile(clinicId, file.fileId);
      toast.success(`"${file.fileName}" deleted`);
      void refresh();
    },
    [clinicId, refresh]
  );

  const handleDownload = useCallback(
    async (file: MedicalRecordFile) => {
      try {
        const { url } = await getMedicalRecordDownloadUrl(clinicId, file.fileId);
        openInNewTab(url);
      } catch {
        toast.error("Failed to prepare download");
      }
    },
    [clinicId]
  );

  const handleRecordAttachmentDownload = useCallback(
    async (fileId: string, name: string) => {
      try {
        const { url } = await getMedicalRecordDownloadUrl(clinicId, fileId);
        openInNewTab(url);
      } catch {
        toast.error(`Failed to prepare download for ${name}`);
      }
    },
    [clinicId]
  );

  const handleRename = useCallback(async () => {
    if (!renameTarget) return;
    const name = renameValue.trim();
    if (!name) {
      toast.error("Name is required");
      return;
    }
    setRenaming(true);
    try {
      if (renameTarget.kind === "folder") {
        const renamed = await renameMedicalRecordFolder(clinicId, renameTarget.id, name);
        toast.success(`Folder renamed to "${renamed.name}"`);
      } else {
        const renamed = await renameMedicalRecordFile(clinicId, renameTarget.id, name);
        toast.success(`File renamed to "${renamed.fileName}"`);
      }
      setRenameTarget(null);
      void refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to rename");
    } finally {
      setRenaming(false);
    }
  }, [clinicId, renameTarget, renameValue, refresh]);

  const handleMove = useCallback(async () => {
    if (!moveTarget || !selectedPatient) return;
    setMoving(true);
    try {
      if (moveTarget.kind === "folder") {
        const parent = moveValue === "__root__" ? null : moveValue;
        const moved = await moveMedicalRecordFolder(clinicId, moveTarget.id, parent);
        toast.success(`Folder "${moved.name}" moved`);
        if (activeFolderId === moveTarget.id) setActiveFolderId(null);
      } else {
        const moved = await moveMedicalRecordFile(clinicId, moveTarget.id, moveValue);
        toast.success(`"${moved.fileName}" moved to ${folderName(moved.folder)}`);
      }
      setMoveTarget(null);
      void refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to move");
    } finally {
      setMoving(false);
    }
  }, [clinicId, moveTarget, moveValue, activeFolderId, selectedPatient, folderName, refresh]);

  const handlePaste = useCallback(async () => {
    if (!clipboard || !selectedPatient) return;
    try {
      if (clipboard.kind === "folder") {
        const copied = await copyMedicalRecordFolder(clinicId, clipboard.id, currentFolderKey);
        toast.success(`Folder "${copied.name}" pasted`);
      } else {
        const copied = await copyMedicalRecordFile(clinicId, clipboard.id, currentFolderKey);
        toast.success(`"${copied.fileName}" pasted into ${folderName(currentFolderKey)}`);
      }
      setClipboard(null);
      void refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to paste");
    }
  }, [clipboard, selectedPatient, clinicId, currentFolderKey, folderName, refresh]);

  const handleNewVersion = useCallback(
    async (file: MedicalRecordFile, next: File) => {
      if (!next) return;
      if (next.size > MAX_FILE_BYTES) {
        toast.error(`${next.name} exceeds 25MB`);
        return;
      }
      if (!isAllowedFile(next)) {
        toast.error(`${next.name} — only PDF, DOCX, XLSX, JPG, PNG, TIFF and DICOM files are allowed`);
        return;
      }
      try {
        const updated = await uploadMedicalRecordFileVersion(clinicId, file.fileId, next);
        toast.success(`"${updated.fileName}" updated to v${updated.version} — a copy was sent to WhatsApp`);
        setVersionInput(null);
        void refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to upload new version");
      }
    },
    [clinicId, refresh]
  );

  // ── Overview data ────────────────────────────────────────────────────────

  const overview = useMemo(() => {
    if (!selectedPatient) return null;
    const patientRecords = records.filter((r) => r.patientId === selectedPatient.patientId);
    const patientPrescriptions = prescriptions.filter((p) => p.patientId === selectedPatient.patientId);
    const patientAppointments = appointments.items.filter(
      (a) => a.patientId === selectedPatient.patientId
    );
    const lastVisit =
      [...patientRecords, ...patientPrescriptions]
        .map((x) => x.visitDate)
        .sort()
        .pop() ?? null;
    const today = new Date().toISOString().slice(0, 10);
    const nextAppointment = patientAppointments
      .filter((a) => a.status === "scheduled" && a.date >= today)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0] ?? null;
    const timeline = [...patientFiles]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 10);
    return {
      patientRecords,
      patientPrescriptions,
      nextAppointment,
      lastVisit,
      timeline,
    };
  }, [selectedPatient, records, prescriptions, appointments, patientFiles]);

  // ── Render ───────────────────────────────────────────────────────────────

  if (!session || loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-background p-4 sm:p-6"
      onDragEnter={onPageDragEnter}
      onDragOver={onPageDragOver}
      onDragLeave={onPageDragLeave}
      onDrop={onPageDrop}
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center gap-2">
          {selectedPatient ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedPatient(null);
                  setActiveFolderId(null);
                  setSearch("");
                }}
              >
                <ArrowLeft className="size-4" /> All Patients
              </Button>
              <ArrowRight className="size-4 text-muted-foreground" />
              <button
                type="button"
                className="text-sm font-semibold text-foreground hover:text-primary"
                onClick={() => {
                  setActiveFolderId(null);
                  setSearch("");
                }}
              >
                {selectedPatient.fullName}
              </button>
              {activeFolderId && (
                <>
                  <ArrowRight className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">{folderName(activeFolderId)}</span>
                </>
              )}
            </>
          ) : (
            <>
              <Users className="size-5 text-primary" />
              <h1 className="text-xl font-bold text-foreground">Medical Records</h1>
            </>
          )}
          <div className="ml-auto flex items-center gap-2">
            {!canManage && <Badge variant="secondary">Upload-only access</Badge>}
            {clipboard && canManage && (
              <Button variant="outline" size="sm" onClick={() => handlePaste()}>
                <ClipboardCopy className="size-4" /> Paste
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={!selectedPatient || uploading}>
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
              {uploading ? "Uploading…" : "Upload"}
            </Button>
            {canManage && selectedPatient && (
              <Button variant="outline" size="sm" onClick={() => setNewFolderOpen(true)}>
                <FolderPlus className="size-4" /> New Folder
              </Button>
            )}
          </div>
        </div>

        {selectedPatient && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              <Stethoscope className="size-3" /> {doctorName(selectedPatient.doctorId)}
            </Badge>
            {view === "drive" && (
              <div className="relative ml-auto w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search files in this patient…"
                  className="pl-9"
                />
              </div>
            )}
          </div>
        )}

        {/* ── Patient list (root) ── */}
        {!selectedPatient && (
          <>
            <div className="relative mt-4 w-full max-w-md">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patients…"
                className="pl-9"
              />
            </div>
            {filteredPatients.length === 0 ? (
              <Card className="mt-6">
                <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
                  <Users className="size-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No patients found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredPatients.map((p) => {
                  const stats = patientStats.get(p.patientId) ?? { files: 0, fileSize: 0, records: 0, prescriptions: 0, last: null };
                  return (
                    <button
                      key={p.patientId}
                      type="button"
                      onClick={() => {
                        setSelectedPatient(p);
                        setActiveFolderId(null);
                        setSearch("");
                      }}
                      className="group flex items-center gap-3 rounded-xl border border-border bg-background p-4 text-left transition hover:border-primary/40 hover:shadow-sm"
                    >
                      <PersonAvatar clinicId={clinicId} ownerType="patient" ownerId={p.patientId} name={p.fullName} className="size-11 text-sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-foreground group-hover:text-primary">
                          {p.fullName}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                          <span>{calculateAge(p.dateOfBirth) ?? "—"} yrs</span>
                          <span>·</span>
                          <span>{p.gender ?? "—"}</span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1"><Phone className="size-3" />{p.mobile}</span>
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {stats.files} files · {stats.records} records · {stats.prescriptions} prescriptions
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── Patient drive ── */}
        {selectedPatient && (
          <div className="mt-4">
            <div className="flex gap-1 rounded-lg bg-muted/60 p-1">
              {(["drive", "overview", "appointments"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={`flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition ${
                    view === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {v === "drive" ? "Files" : v === "overview" ? "Overview" : "Appointments"}
                </button>
              ))}
            </div>

            {view === "drive" ? (
              <>
                {/* Search results */}
                {search.trim() && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Search results in {selectedPatient.fullName}&apos;s records
                    </p>
                    {searchFiles.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No matching files</p>
                    ) : (
                      searchFiles.map((f) => (
                        <FileRow
                          key={f.fileId}
                          file={f}
                          canManage={canManage}
                          onDownload={handleDownload}
                          onCopy={(file) => setClipboard({ kind: "file", id: file.fileId })}
                          onRename={(file) => {
                            setRenameTarget({ kind: "file", id: file.fileId, name: file.fileName });
                            setRenameValue(file.fileName);
                          }}
                          onMove={(file) => {
                            setMoveTarget({ kind: "file", id: file.fileId });
                            setMoveValue(currentFolderId ?? currentFolderKey);
                          }}
                          onNewVersion={(file) => setVersionInput(file)}
                          onDelete={(file) => setDeleteFileTarget(file)}
                          onVersions={(file) => setVersionsFile(file)}
                          draggable={canManage && !f.fileId.startsWith("mrl_")}
                          onDragStart={(e, file) => onDragStart(e, "file", file.fileId)}
                          onDropMove={(file) => onDropMove("file", file.fileId, file)}
                        />
                      ))
                    )}
                  </div>
                )}

                {/* Folders */}
                {!search.trim() && levelFolders.length > 0 && (
                  <div className="mt-4">
                    <SectionHeading
                      Icon={Folder}
                      tint="text-amber-600"
                      title={activeFolderId ? "Subfolders" : "Folders"}
                      count={levelFolders.length}
                      countLabel="folder"
                    />
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                      {levelFolders.map((fo) => (
                        <FolderCard
                          key={fo.folderId}
                          folder={fo}
                          count={(subfolderFiles.get(fo.isDefault && fo.defaultKey ? fo.defaultKey : fo.folderId) ?? []).length}
                          canManage={canManage}
                          onOpen={() => setActiveFolderId(fo.folderId)}
                          onCopy={(folder) => setClipboard({ kind: "folder", id: folder.folderId })}
                          onRename={(folder) => {
                            setRenameTarget({ kind: "folder", id: folder.folderId, name: folder.name });
                            setRenameValue(folder.name);
                          }}
                          onMove={(folder) => {
                            setMoveTarget({ kind: "folder", id: folder.folderId });
                            setMoveValue(folder.parentFolderId ?? "__root__");
                          }}
                          onDelete={(folder) => setDeleteFolderTarget(folder)}
                          onDropMove={(target) => onDropMove("folder", target.folderId, target)}
                          onDropUpload={onFolderDropUpload}
                          draggable={canManage && !fo.isDefault}
                          onDragStart={(e, folder) => onDragStart(e, "folder", folder.folderId)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Files at this level */}
                {!search.trim() && (
                  <div className="mt-5">
                    <SectionHeading
                      Icon={activeFolderId ? FolderUp : File}
                      tint={activeFolderId ? "text-primary" : "text-muted-foreground"}
                      title={activeFolderId ? folderName(activeFolderId) : "Recent Files"}
                      count={levelFiles.length}
                      countLabel="file"
                      action={
                        activeFolderId ? (
                          <Button variant="ghost" size="sm" onClick={() => setActiveFolderId(null)}>
                            <FolderUp className="size-4" /> Up to root
                          </Button>
                        ) : undefined
                      }
                    />
                    {levelFiles.length === 0 ? (
                      <Card className="mt-3">
                        <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
                          <UploadCloud className="size-8 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            No files in {activeFolderId ? folderName(activeFolderId) : "this patient's records"} yet.
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Drag files anywhere to upload, or click Upload.
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="mt-3 space-y-1.5">
                        {levelFiles.map((f) => (
                          <FileRow
                            key={f.fileId}
                            file={f}
                            canManage={canManage}
                            onDownload={handleDownload}
                            onCopy={(file) => setClipboard({ kind: "file", id: file.fileId })}
                            onRename={(file) => {
                              setRenameTarget({ kind: "file", id: file.fileId, name: file.fileName });
                              setRenameValue(file.fileName);
                            }}
                            onMove={(file) => {
                              setMoveTarget({ kind: "file", id: file.fileId });
                              setMoveValue(currentFolderId ?? currentFolderKey);
                            }}
                            onNewVersion={(file) => setVersionInput(file)}
                            onDelete={(file) => setDeleteFileTarget(file)}
                            onVersions={(file) => setVersionsFile(file)}
                            draggable={canManage && !f.fileId.startsWith("mrl_")}
                            onDragStart={(e, file) => onDragStart(e, "file", file.fileId)}
                            onDropMove={(file) => onDropMove("file", file.fileId, file)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : view === "overview" ? (
              overview && <OverviewPanel />
            ) : (
              <AppointmentsPanel />
            )}
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          void handleUpload(e.target.files);
          e.target.value = "";
        }}
      />

      {/* Full-screen drop overlay */}
      {dragging && selectedPatient && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-primary/10">
          <div className="rounded-2xl border-2 border-dashed border-primary/50 bg-background/95 px-10 py-8 text-center shadow-xl">
            <UploadCloud className="mx-auto size-10 text-primary" />
            <p className="mt-2 text-lg font-semibold text-foreground">
              Drop to upload into {folderName(currentFolderKey)}
            </p>
            <p className="text-sm text-muted-foreground">PDF · DOCX · XLSX · JPG · PNG · TIFF · DICOM (max 25MB)</p>
          </div>
        </div>
      )}

      {/* New folder */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
            <DialogDescription>
              {activeFolderId ? `Create inside "${folderName(activeFolderId)}"` : `Create inside ${selectedPatient?.fullName}'s records`}
            </DialogDescription>
          </DialogHeader>
          <Label htmlFor="new-folder-name">Folder name</Label>
          <Input
            id="new-folder-name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="e.g. Vaccination Records"
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleCreateFolder();
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderOpen(false)}>Cancel</Button>
            <Button onClick={() => handleCreateFolder()} disabled={creatingFolder}>
              {creatingFolder ? <Loader2 className="size-4 animate-spin" /> : <FolderPlus className="size-4" />} Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename */}
      <Dialog open={!!renameTarget} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename {renameTarget?.kind === "folder" ? "folder" : "file"}</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleRename();
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>Cancel</Button>
            <Button onClick={() => handleRename()} disabled={renaming}>
              {renaming ? <Loader2 className="size-4 animate-spin" /> : null} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move */}
      <Dialog open={!!moveTarget} onOpenChange={(open) => !open && setMoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to…</DialogTitle>
            <DialogDescription>
              Choose a destination folder for this {moveTarget?.kind}.
            </DialogDescription>
          </DialogHeader>
          <Select value={moveValue} onValueChange={(v) => setMoveValue(v ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="Select a folder" />
            </SelectTrigger>
            <SelectContent>
              {moveTarget?.kind === "folder" && (
                <SelectItem value="__root__">Root (patient records)</SelectItem>
              )}
              {patientFolders
                .filter((f) => (moveTarget?.kind === "folder" ? f.folderId !== moveTarget.id : true))
                .map((f) => (
                  <SelectItem key={f.folderId} value={f.folderId}>
                    {f.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveTarget(null)}>Cancel</Button>
            <Button onClick={() => handleMove()} disabled={moving || !moveValue}>
              {moving ? <Loader2 className="size-4 animate-spin" /> : <Folder className="size-4" />} Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version history */}
      <Dialog open={!!versionsFile} onOpenChange={(open) => !open && setVersionsFile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Version history</DialogTitle>
            <DialogDescription>
              {versionsFile?.fileName} · {versionsFile?.version} version{versionsFile && versionsFile.version > 1 ? "s" : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {versionsFile && (
              <div className="flex items-center gap-3 rounded-lg bg-accent p-3 ring-1 ring-primary/25">
                {fileIcon(versionsFile.mimeType, versionsFile.fileName)}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">v{versionsFile.version} · current</p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(versionsFile.size)} · {formatDate(versionsFile.createdAt)}
                    {versionsFile.uploadedByName ? ` · by ${versionsFile.uploadedByName}` : ""}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDownload(versionsFile)}>
                  <Download className="size-4" />
                </Button>
              </div>
            )}
            {versionsFile?.versions.map((v) => (
              <div key={v.version} className="flex items-center gap-3 rounded-lg bg-muted p-3 ring-1 ring-border">
                {fileIcon(v.mimeType, v.fileName)}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">v{v.version}</p>
                  <p className="text-xs text-muted-foreground">
                    {v.fileName} · {formatSize(v.size)} · {formatDate(v.createdAt)}
                    {v.uploadedByName ? ` · by ${v.uploadedByName}` : ""}
                  </p>
                </div>
              </div>
            ))}
            {versionsFile && versionsFile.versions.length === 0 && (
              <p className="text-sm text-muted-foreground">No older versions.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* New version upload */}
      <Dialog open={!!versionInput} onOpenChange={(open) => !open && setVersionInput(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload new version</DialogTitle>
            <DialogDescription>
              Replace the content of &quot;{versionInput?.fileName}&quot; — older versions stay in history.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 rounded-lg border border-dashed border-border p-6">
            <UploadCloud className="size-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Choose a replacement file</p>
              <p className="text-xs text-muted-foreground">PDF · DOCX · XLSX · JPG · PNG · TIFF · DICOM (max 25MB)</p>
            </div>
            <Button
              className="ml-auto"
              size="sm"
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = ACCEPT;
                input.onchange = () => {
                  const file = input.files?.[0];
                  if (file && versionInput) void handleNewVersion(versionInput, file);
                };
                input.click();
              }}
            >
              <Plus className="size-4" /> Choose file
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVersionInput(null)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmations */}
      <ConfirmDeleteDialog
        open={!!deleteFileTarget}
        onOpenChange={(open) => !open && setDeleteFileTarget(null)}
        title="Delete file?"
        description={`"${deleteFileTarget?.fileName}" will be permanently removed from the records.`}
        onConfirm={async () => {
          if (deleteFileTarget) await handleDeleteFile(deleteFileTarget);
        }}
      />
      <ConfirmDeleteDialog
        open={!!deleteFolderTarget}
        onOpenChange={(open) => !open && setDeleteFolderTarget(null)}
        title="Delete folder?"
        description={`"${deleteFolderTarget?.name}" and everything inside it will be permanently deleted.`}
        onConfirm={async () => {
          if (deleteFolderTarget) await handleDeleteFolder(deleteFolderTarget);
        }}
      />
    </div>
  );

  function AppointmentsPanel() {
    if (!selectedPatient) return null;
    const p = selectedPatient;
    const [doctorId, setDoctorId] = useState("");
    const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [time, setTime] = useState("10:00");
    const [reason, setReason] = useState("");
    const [saving, setSaving] = useState(false);

    const patientAppointments = useMemo(
      () =>
        appointments.items
          .filter((a) => a.patientId === p.patientId)
          .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)),
      [appointments.items, p.patientId]
    );

    async function handleCreate(e: React.FormEvent) {
      e.preventDefault();
      if (!doctorId || !date || !time) {
        toast.error("Doctor, date and time are required.");
        return;
      }
      setSaving(true);
      try {
        await createAppointment(clinicId, {
          patientId: p.patientId,
          doctorId,
          date,
          time,
          reason: reason.trim() || null,
        });
        toast.success("Appointment booked. WhatsApp alerts queued!");
        setReason("");
        refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to book appointment");
      } finally {
        setSaving(false);
      }
    }

    async function handleStatusChange(a: Appointment, status: AppointmentStatus) {
      try {
        await updateAppointment(clinicId, a.appointmentId, { status });
        toast.success(`Status updated to ${APPT_STATUS_LABELS[status]}.`);
        refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update status");
      }
    }

    async function handleDelete(a: Appointment) {
      try {
        await deleteAppointment(clinicId, a.appointmentId);
        toast.success("Appointment deleted.");
        refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete appointment");
      }
    }

    return (
      <div className="mt-4 space-y-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-full bg-muted text-fuchsia-600">
                <CalendarClock className="size-4" />
              </span>
              <h2 className="text-sm font-semibold text-foreground">Book Appointment</h2>
            </div>
            <form onSubmit={handleCreate} className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Patient</Label>
                <Input value={p.fullName} disabled />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Doctor *</Label>
                <Select value={doctorId} onValueChange={(v) => setDoctorId(v ?? "")}>
                  <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                  <SelectContent>
                    {doctors.map((d) => (
                      <SelectItem key={d.doctorId} value={d.doctorId}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Date *</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Time *</Label>
                <TimePicker value={time} onChange={setTime} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Reason</Label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Follow-up" />
              </div>
              <div className="flex justify-end md:col-span-2 lg:col-span-5">
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  {saving ? "Booking…" : "Book Appointment"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <SectionHeading
              Icon={CalendarDays}
              tint="text-fuchsia-600"
              title="Appointments"
              count={patientAppointments.length}
              countLabel="appointment"
            />
            {patientAppointments.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No appointments for this patient yet.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patientAppointments.map((a) => (
                      <TableRow key={a.appointmentId}>
                        <TableCell className="text-sm whitespace-nowrap">{formatDate(a.date)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatTime(a.time)}</TableCell>
                        <TableCell className="text-sm">{doctorName(a.doctorId)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.reason || "—"}</TableCell>
                        <TableCell>
                          <Select
                            value={a.status}
                            onValueChange={(v) => handleStatusChange(a, v as AppointmentStatus)}
                          >
                            <SelectTrigger className={`h-7 w-28 rounded-full text-[11px] font-semibold ${APPT_STATUS_CLASS[a.status]}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {APPT_STATUSES.map((s) => (
                                <SelectItem key={s} value={s} className="text-xs">
                                  {APPT_STATUS_LABELS[s]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(a)}
                            aria-label="Delete appointment"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  function OverviewPanel() {
    if (!selectedPatient || !overview) return null;
    const p = selectedPatient;
    return (
      <div className="mt-4 space-y-4">
        {/* Patient summary */}
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-wrap items-start gap-4">
              <PersonAvatar clinicId={clinicId} ownerType="patient" ownerId={p.patientId} name={p.fullName} className="size-14 text-base" />
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-foreground">{p.fullName}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {calculateAge(p.dateOfBirth) ?? "—"} yrs · {p.gender ?? "—"}
                  {p.bloodGroup ? ` · Blood ${p.bloodGroup}` : ""}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.allergies.length > 0 ? (
                    p.allergies.map((a, i) => (
                      <Badge key={i} className="bg-destructive/10 text-destructive hover:bg-destructive/10">{a}</Badge>
                    ))
                  ) : (
                    <Badge variant="secondary">No allergies on file</Badge>
                  )}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <p className="inline-flex items-center gap-1.5"><Stethoscope className="size-4 text-primary" /> {doctorName(p.doctorId)}</p>
                {p.mobile && <p className="mt-1 inline-flex items-center gap-1.5"><Phone className="size-4 text-primary" /> {p.mobile}</p>}
              </div>
            </div>
            {(p.address || p.city) && (
              <p className="mt-3 text-sm text-muted-foreground">
                {[p.address, p.city, p.state, p.pincode].filter(Boolean).join(", ")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Clinical overview */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Last visit</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{overview.lastVisit ? formatDate(overview.lastVisit) : "No visits yet"}</p>
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Next appointment</p>
              {overview.nextAppointment ? (
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {formatDate(overview.nextAppointment.date)}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">{overview.nextAppointment.time}</span>
                </p>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">No upcoming appointments</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Medical history</p>
              <div className="mt-2 space-y-2 text-sm text-foreground">
                <div>
                  <p className="font-medium text-muted-foreground">Conditions</p>
                  <p>{p.medicalConditions || "—"}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Surgeries</p>
                  <p>{p.previousSurgeries || "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current medications</p>
              <p className="mt-2 text-sm text-foreground">{p.currentMedications || "—"}</p>
            </CardContent>
          </Card>
        </div>

        {/* Upload timeline */}
        <Card>
          <CardContent className="p-5">
            <SectionHeading
              Icon={History}
              tint="text-primary"
              title="Upload Timeline"
              count={patientFiles.length}
              countLabel="upload"
            />
            {overview.timeline.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No documents uploaded yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {overview.timeline.map((f) => (
                  <div key={f.fileId} className="flex items-center gap-3">
                    {fileIcon(f.mimeType, f.fileName)}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{f.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(f.createdAt)} · {folderName(f.folder)}
                        {f.uploadedByName ? ` · by ${f.uploadedByName}` : ""}
                        {f.version > 1 ? ` · v${f.version}` : ""}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDownload(f)} aria-label="Download">
                      <Download className="size-4 text-primary" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Visit history */}
        {overview.patientRecords.length > 0 && (
          <div>
            <SectionHeading
              Icon={ClipboardList}
              tint="text-primary"
              title="Visit History"
              count={overview.patientRecords.length}
              countLabel="record"
            />
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {overview.patientRecords
                .slice()
                .sort((a, b) => b.visitDate.localeCompare(a.visitDate))
                .slice(0, 6)
                .map((r) => (
                  <MedicineRecordCard
                    key={r.recordId}
                    record={r}
                    doctorName={doctorName}
                    onDownload={handleRecordAttachmentDownload}
                  />
                ))}
            </div>
          </div>
        )}

        {overview.patientPrescriptions.length > 0 && (
          <div>
            <SectionHeading
              Icon={Pill}
              tint="text-emerald-600"
              title="Prescriptions"
              count={overview.patientPrescriptions.length}
              countLabel="prescription"
            />
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {overview.patientPrescriptions
                .slice()
                .sort((a, b) => b.visitDate.localeCompare(a.visitDate))
                .slice(0, 6)
                .map((pr) => (
                  <PrescriptionCard key={pr.prescriptionId} prescription={pr} doctorName={doctorName} />
                ))}
            </div>
          </div>
        )}
      </div>
    );
  }
}