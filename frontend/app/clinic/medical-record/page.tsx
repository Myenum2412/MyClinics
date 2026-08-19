"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  type Doctor,
  type MedicalRecordFile,
  type MedicalRecordFolder,
  type MedicineRecord,
  type Patient,
  type Prescription,
  createMedicalRecordFolder,
  deleteMedicalRecordFile,
  deleteMedicalRecordFolder,
  getMedicalRecordDownloadUrl,
  listDoctors,
  listMedicalRecordFiles,
  listMedicalRecordFolders,
  listPatients,
  listPrescriptions,
  listRecords,
  uploadMedicalRecordFile,
} from "@/lib/clinic-api";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { NameAvatar } from "@/components/clinic/name-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
  ArrowLeft,
  ClipboardList,
  Download,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderPlus,
  Loader2,
  Pill,
  Plus,
  Search,
  Trash2,
  UploadCloud,
} from "lucide-react";

const MAX_FILE_BYTES = 25 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".heic",
  ".heif",
  ".bmp",
  ".tif",
  ".tiff",
  ".svg",
  ".pdf",
  ".doc",
  ".docx",
  ".rtf",
  ".odt",
  ".txt",
  ".xls",
  ".xlsx",
  ".csv",
  ".ods",
  ".ppt",
  ".pptx",
  ".odp",
];

const ACCEPT = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/bmp",
  "image/tiff",
  "image/svg+xml",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/rtf",
  "text/plain",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ...ALLOWED_EXTENSIONS,
].join(",");

function isAllowedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  if (ext && !ALLOWED_EXTENSIONS.includes(ext)) return false;
  const mime = file.type.toLowerCase();
  if (mime) {
    if (mime.startsWith("image/") || mime.startsWith("text/")) return true;
    if (
      mime.includes("pdf") ||
      mime.includes("msword") ||
      mime.includes("openxmlformats-officedocument") ||
      mime.includes("ms-excel") ||
      mime.includes("ms-powerpoint") ||
      mime.includes("oasis.opendocument") ||
      mime === "application/rtf"
    )
      return true;
    return false;
  }
  return true;
}

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
  if (m.startsWith("image/")) return <FileImage className="size-5 text-purple-500" />;
  if (m.includes("spreadsheet") || n.endsWith(".xls") || n.endsWith(".xlsx") || n.endsWith(".csv"))
    return <FileSpreadsheet className="size-5 text-green-600" />;
  if (m.includes("pdf") || m.includes("word") || m.includes("text") || m.includes("document"))
    return <FileText className="size-5 text-blue-500" />;
  return <File className="size-5 text-slate-400" />;
}

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

/** The Medicine page stores extended form data as JSON inside `notes` — parse it for display. */
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

function metadataFields(
  meta: RecordMetadata | null
): { label: string; value: string }[] {
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
}

type DefaultFolderKey = "medicine" | "medical" | "prescriptions";

const DEFAULT_FOLDER_KEYS: DefaultFolderKey[] = ["medicine", "medical", "prescriptions"];

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
  const metaFields = metadataFields(meta);
  return (
    <Card className="border-blue-100">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50">
            {formatDate(record.visitDate)}
          </Badge>
          <span className="text-xs text-gray-500">Doctor: {doctorName(record.doctorId)}</span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Diagnosis</p>
            <p className="text-sm font-medium text-gray-800">{record.diagnosis}</p>
          </div>
          {record.symptoms && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Symptoms</p>
              <p className="text-sm text-gray-700">{record.symptoms}</p>
            </div>
          )}
          {record.treatment && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Treatment</p>
              <p className="text-sm text-gray-700">{record.treatment}</p>
            </div>
          )}
          {metaFields.map((f) => (
            <div key={f.label}>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{f.label}</p>
              <p className="text-sm text-gray-700">{f.value}</p>
            </div>
          ))}
          {!meta && record.notes && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Notes</p>
              <p className="text-sm text-gray-700">{record.notes}</p>
            </div>
          )}
        </div>
        {record.attachments.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
            {record.attachments.map((a, i) => (
              <button
                key={i}
                type="button"
                disabled={!a.fileId && !a.url}
                onClick={() => {
                  if (a.fileId) onDownload(a.fileId, a.name);
                  else if (a.url) window.open(a.url, "_blank", "noopener,noreferrer");
                }}
                className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1 text-xs text-gray-600 ring-1 ring-slate-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
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
    <Card className="border-emerald-100">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
            {formatDate(prescription.visitDate)}
          </Badge>
          <span className="text-xs text-gray-500">Doctor: {doctorName(prescription.doctorId)}</span>
        </div>
        {prescription.diagnosis && (
          <div className="mt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Diagnosis</p>
            <p className="text-sm font-medium text-gray-800">{prescription.diagnosis}</p>
          </div>
        )}
        <div className="mt-3 overflow-hidden rounded-lg ring-1 ring-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2 font-medium">Medicine</th>
                <th className="px-3 py-2 font-medium">Dosage</th>
                <th className="px-3 py-2 font-medium">Frequency</th>
                <th className="px-3 py-2 font-medium">Duration</th>
                <th className="px-3 py-2 font-medium">Instructions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {prescription.medicines.map((m, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 font-medium text-gray-800">{m.name}</td>
                  <td className="px-3 py-2 text-gray-600">{m.dosage ?? "—"}</td>
                  <td className="px-3 py-2 text-gray-600">{m.frequency ?? "—"}</td>
                  <td className="px-3 py-2 text-gray-600">{m.duration ?? "—"}</td>
                  <td className="px-3 py-2 text-gray-600">{m.instructions ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {prescription.notes && (
          <p className="mt-3 text-sm text-gray-700">
            <span className="font-medium text-gray-500">Notes: </span>
            {prescription.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function UploadedFileRow({
  file,
  onDownload,
  onDelete,
}: {
  file: MedicalRecordFile;
  onDownload: (file: MedicalRecordFile) => void;
  onDelete: (file: MedicalRecordFile) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {fileIcon(file.mimeType, file.fileName)}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-800">{file.fileName}</p>
        <p className="text-xs text-gray-500">
          {formatSize(file.size)} · {formatDate(file.createdAt)}
          {file.uploadedByName ? ` · by ${file.uploadedByName}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => onDownload(file)} aria-label="Download">
          <Download className="size-4 text-blue-600" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(file)}
          aria-label="Delete"
          className="hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="size-4 text-red-500" />
        </Button>
      </div>
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
      <span className={`flex size-8 items-center justify-center rounded-full bg-slate-100 ${tint}`}>
        <Icon className="size-4" />
      </span>
      <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
      <Badge variant="secondary">
        {count} {countLabel}
        {count === 1 ? "" : "s"}
      </Badge>
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

const FOLDER_META: Record<
  DefaultFolderKey,
  { title: string; icon: typeof ClipboardList; tint: string; bg: string; hint: string }
> = {
  medicine: {
    title: "Medicine Record",
    icon: ClipboardList,
    tint: "text-blue-600",
    bg: "bg-blue-100",
    hint: "Consultation history, diagnosis and treatment",
  },
  medical: {
    title: "Medical Record",
    icon: Folder,
    tint: "text-amber-600",
    bg: "bg-amber-100",
    hint: "Uploaded documents — reports, scans, certificates",
  },
  prescriptions: {
    title: "Prescriptions",
    icon: Pill,
    tint: "text-emerald-600",
    bg: "bg-emerald-100",
    hint: "Prescribed medicines with dosage and duration",
  },
};

export default function MedicalRecordPage() {
  const session = useRequireRole("doctor");
  const clinicId = session?.clinicId ?? "";

  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [files, setFiles] = useState<MedicalRecordFile[]>([]);
  const [folders, setFolders] = useState<MedicalRecordFolder[]>([]);
  const [records, setRecords] = useState<MedicineRecord[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [folder, setFolder] = useState<Patient | null>(null);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MedicalRecordFile | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<MedicalRecordFolder | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<string>("medical");
  const dragDepth = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    if (!clinicId) return;
    Promise.all([
      listPatients(clinicId, { limit: 500 }),
      listDoctors(clinicId, { limit: 100 }),
      listMedicalRecordFiles(clinicId),
      listMedicalRecordFolders(clinicId),
      listRecords(clinicId, { limit: 500 }),
      listPrescriptions(clinicId, { limit: 500 }),
    ])
      .then(([p, d, f, fo, r, pr]) => {
        setPatients(p.items);
        setDoctors(d.items);
        setFiles(f.files);
        setFolders(fo.folders);
        setRecords(r.items);
        setPrescriptions(pr.items);
      })
      .catch(() => toast.error("Failed to load medical records"))
      .finally(() => setLoading(false));
  }, [clinicId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const doctorName = useCallback(
    (doctorId: string | null): string =>
      doctors.find((d) => d.doctorId === doctorId)?.name ?? "—",
    [doctors]
  );

  const perPatientFiles = useMemo(() => {
    const map = new Map<string, MedicalRecordFile[]>();
    for (const f of files) {
      const list = map.get(f.patientId) ?? [];
      list.push(f);
      map.set(f.patientId, list);
    }
    return map;
  }, [files]);

  const perPatientFolders = useMemo(() => {
    const map = new Map<string, MedicalRecordFolder[]>();
    for (const fo of folders) {
      const list = map.get(fo.patientId) ?? [];
      list.push(fo);
      map.set(fo.patientId, list);
    }
    return map;
  }, [folders]);

  const perPatientRecords = useMemo(() => {
    const map = new Map<string, MedicineRecord[]>();
    for (const r of records) {
      const list = map.get(r.patientId) ?? [];
      list.push(r);
      map.set(r.patientId, list);
    }
    return map;
  }, [records]);

  const perPatientPrescriptions = useMemo(() => {
    const map = new Map<string, Prescription[]>();
    for (const p of prescriptions) {
      const list = map.get(p.patientId) ?? [];
      list.push(p);
      map.set(p.patientId, list);
    }
    return map;
  }, [prescriptions]);

  const patientStats = useMemo(() => {
    const stats = new Map<string, { files: number; fileSize: number; records: number; prescriptions: number; last: string | null }>();
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

  const totalFiles = files.length;
  const totalRecords = records.length;
  const totalPrescriptions = prescriptions.length;

  const folderFiles = useMemo(
    () => (folder ? perPatientFiles.get(folder.patientId) ?? [] : []),
    [folder, perPatientFiles]
  );

  const filesByFolderKey = useMemo(() => {
    const map = new Map<string, MedicalRecordFile[]>();
    for (const f of folderFiles) {
      const key = f.folder || "medical";
      const list = map.get(key) ?? [];
      list.push(f);
      map.set(key, list);
    }
    return map;
  }, [folderFiles]);

  const customFoldersForPatient = useMemo(
    () => (folder ? perPatientFolders.get(folder.patientId) ?? [] : []),
    [folder, perPatientFolders]
  );

  const customFolderMeta = useCallback(
    (folderId: string) => {
      const fo = folders.find((x) => x.folderId === folderId);
      return {
        title: fo?.name ?? "Folder",
        icon: Folder,
        tint: "text-violet-600",
        bg: "bg-violet-100",
        hint: "Custom folder — uploaded documents",
        folderId,
      };
    },
    [folders]
  );

  const folderRecords = useMemo(
    () => (folder ? perPatientRecords.get(folder.patientId) ?? [] : []),
    [folder, perPatientRecords]
  );

  const folderPrescriptions = useMemo(
    () => (folder ? perPatientPrescriptions.get(folder.patientId) ?? [] : []),
    [folder, perPatientPrescriptions]
  );

  const filteredPatients = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? patients.filter((p) => p.fullName.toLowerCase().includes(q))
      : patients;
    return [...list].sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [patients, search]);

  const handleUpload = useCallback(
    async (fileList: FileList | null, targetFolder?: string) => {
      if (!folder || !fileList?.length || uploading) return;
      const target = targetFolder ?? "medical";
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
          toast.error(`${file.name} — only images, PDFs and Office documents are allowed`);
          failed += 1;
          continue;
        }
        try {
          await uploadMedicalRecordFile(clinicId, folder.patientId, file, target);
          uploaded += 1;
        } catch (err) {
          failed += 1;
          toast.error(err instanceof Error ? err.message : `Failed to upload ${file.name}`);
        }
      }
      if (uploaded > 0) {
        toast.success(
          `${uploaded} file${uploaded === 1 ? "" : "s"} uploaded — a copy was sent to ${folder.fullName}'s WhatsApp${failed > 0 ? ` (${failed} failed)` : ""}`
        );
        void refresh();
      }
      setUploading(false);
    },
    [clinicId, folder, uploading, refresh]
  );

  const folderLabel = useCallback(
    (key: string): string => {
      if (key === "medicine" || key === "medical" || key === "prescriptions")
        return FOLDER_META[key].title;
      const fo = folders.find((x) => x.folderId === key);
      return fo?.name ?? "Folder";
    },
    [folders]
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
    (e: DragEvent, targetFolder?: string) => {
      if (!e.dataTransfer.types.includes("Files")) return;
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      void handleUpload(e.dataTransfer.files, targetFolder);
    },
    [handleUpload]
  );

  const handleCreateFolder = useCallback(async () => {
    if (!folder) return;
    const name = newFolderName.trim();
    if (!name) {
      toast.error("Folder name is required");
      return;
    }
    setCreatingFolder(true);
    try {
      const created = await createMedicalRecordFolder(clinicId, folder.patientId, name);
      setNewFolderOpen(false);
      setNewFolderName("");
      toast.success(`Folder "${created.name}" created`);
      void refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create folder");
    } finally {
      setCreatingFolder(false);
    }
  }, [clinicId, folder, newFolderName, refresh]);

  const handleDeleteFolder = useCallback(
    async (fo: MedicalRecordFolder) => {
      try {
        await deleteMedicalRecordFolder(clinicId, fo.folderId);
        toast.success(`Folder "${fo.name}" deleted`);
        if (activeFolder === fo.folderId) setActiveFolder(null);
        void refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete folder");
      }
    },
    [clinicId, activeFolder, refresh]
  );

  const handleDownload = useCallback(
    async (file: MedicalRecordFile) => {
      try {
        const { url } = await getMedicalRecordDownloadUrl(clinicId, file.fileId);
        window.open(url, "_blank", "noopener,noreferrer");
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
        window.open(url, "_blank", "noopener,noreferrer");
      } catch {
        toast.error(`Failed to prepare download for ${name}`);
      }
    },
    [clinicId]
  );

  const handleDelete = useCallback(
    async (file: MedicalRecordFile) => {
      try {
        await deleteMedicalRecordFile(clinicId, file.fileId);
        toast.success("File deleted");
        void refresh();
      } catch {
        toast.error("Failed to delete file");
      }
    },
    [clinicId, refresh]
  );

  if (loading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // ── Sub-folder views (per patient) ─────────────────────────────────────
  if (folder && activeFolder) {
    const isDefault = activeFolder === "medicine" || activeFolder === "medical" || activeFolder === "prescriptions";
    const meta = isDefault ? FOLDER_META[activeFolder] : customFolderMeta(activeFolder);
    const folderKeyFiles = filesByFolderKey.get(activeFolder) ?? [];
    const count =
      activeFolder === "medicine"
        ? folderRecords.length + folderKeyFiles.length
        : activeFolder === "prescriptions"
          ? folderPrescriptions.length + folderKeyFiles.length
          : folderKeyFiles.length;
    return (
      <div
        className="space-y-4"
        onDragEnter={onPageDragEnter}
        onDragOver={onPageDragOver}
        onDragLeave={onPageDragLeave}
        onDrop={(e) => onPageDrop(e, activeFolder)}
      >
        {dragging && (
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-blue-500/10">
            <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-blue-400 bg-white px-10 py-8 shadow-lg">
              <UploadCloud className="size-10 text-blue-500" />
              <p className="text-sm font-semibold text-gray-800">Drop files to upload</p>
              <p className="text-xs text-gray-500">
                into the {meta.title} folder of {folder.fullName}
              </p>
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setActiveFolder(null)}
            aria-label="Back to folders"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Medical Record</span>
            <span>/</span>
            <button
              onClick={() => setActiveFolder(null)}
              className="font-medium text-gray-700 hover:underline"
            >
              {folder.fullName}
            </button>
            <span>/</span>
            <span className={`flex items-center gap-1.5 font-semibold ${meta.tint}`}>
              <meta.icon className="size-4" />
              {meta.title}
            </span>
          </div>
          <Badge variant="secondary" className="ml-auto">
            {count} item{count === 1 ? "" : "s"}
          </Badge>
        </div>

        {!isDefault && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs text-red-600 hover:bg-red-50"
              onClick={() => {
                const fo = folders.find((x) => x.folderId === activeFolder);
                if (fo) setDeleteFolderTarget(fo);
              }}
            >
              <Trash2 className="size-3.5" />
              Delete folder
            </Button>
          </div>
        )}

        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-8">
            <div
              onClick={() => inputRef.current?.click()}
              className="flex w-full max-w-lg cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/40 px-6 py-8 text-center transition-colors hover:border-blue-300 hover:bg-blue-50"
            >
              {uploading ? (
                <Loader2 className="size-8 animate-spin text-blue-500" />
              ) : (
                <UploadCloud className="size-8 text-blue-500" />
              )}
              <p className="text-sm font-medium text-gray-700">
                {uploading ? "Uploading…" : "Click to browse — or drag & drop anywhere on this page"}
              </p>
              <p className="text-xs text-gray-500">
                Files land in the {meta.title} folder — a copy is sent to {folder.fullName}
                &apos;s WhatsApp number automatically
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                void handleUpload(e.target.files, activeFolder);
                e.target.value = "";
              }}
            />
          </CardContent>
        </Card>

        {folderKeyFiles.length > 0 ? (
          <Card>
            <CardContent className="divide-y divide-slate-100 p-0">
              {folderKeyFiles.map((f) => (
                <UploadedFileRow
                  key={f.fileId}
                  file={f}
                  onDownload={handleDownload}
                  onDelete={(file) => setDeleteTarget(file)}
                />
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-sm text-gray-500">
              No files in this folder yet. Upload the first document above.
            </CardContent>
          </Card>
        )}

        {activeFolder === "medicine" &&
          (folderRecords.length > 0 ? (
            <div className="space-y-3">
              {[...folderRecords]
                .sort((a, b) => b.visitDate.localeCompare(a.visitDate))
                .map((r) => (
                  <MedicineRecordCard
                    key={r.recordId}
                    record={r}
                    doctorName={doctorName}
                    onDownload={handleRecordAttachmentDownload}
                  />
                ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-sm text-gray-500">
                No medicine records for this patient yet. Create them from the Medicine page.
              </CardContent>
            </Card>
          ))}

        {activeFolder === "prescriptions" &&
          (folderPrescriptions.length > 0 ? (
            <div className="space-y-3">
              {[...folderPrescriptions]
                .sort((a, b) => b.visitDate.localeCompare(a.visitDate))
                .map((p) => (
                  <PrescriptionCard
                    key={p.prescriptionId}
                    prescription={p}
                    doctorName={doctorName}
                  />
                ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-sm text-gray-500">
                No prescriptions for this patient yet. Create them from the Prescriptions page.
              </CardContent>
            </Card>
          ))}

        <ConfirmDeleteDialog
          open={deleteTarget !== null}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          title={`Delete "${deleteTarget?.fileName ?? ""}"?`}
          description="This file will be permanently removed. This action cannot be undone."
          onConfirm={async () => {
            if (deleteTarget) await handleDelete(deleteTarget);
            setDeleteTarget(null);
          }}
        />

        <ConfirmDeleteDialog
          open={deleteFolderTarget !== null}
          onOpenChange={(open) => {
            if (!open) setDeleteFolderTarget(null);
          }}
          title={`Delete folder "${deleteFolderTarget?.name ?? ""}"?`}
          description="The folder and all files inside it will be permanently removed. This action cannot be undone."
          onConfirm={async () => {
            if (deleteFolderTarget) {
              await handleDeleteFolder(deleteFolderTarget);
              setDeleteFolderTarget(null);
            }
          }}
        />
      </div>
    );
  }

  // ── Patient view (all records on one page) ─────────────────────────────
  if (folder) {
    const stats = patientStats.get(folder.patientId);
    const age = calculateAge(folder.dateOfBirth);
    const allFolderFiles = folderFiles;
    const uploadFolderLabel = folderLabel(uploadTarget);
    const groupedKeys = [
      ...DEFAULT_FOLDER_KEYS.filter((k) => (filesByFolderKey.get(k) ?? []).length > 0),
      ...customFoldersForPatient.map((fo) => fo.folderId),
    ];
    return (
      <div
        className="space-y-4"
        onDragEnter={onPageDragEnter}
        onDragOver={onPageDragOver}
        onDragLeave={onPageDragLeave}
        onDrop={(e) => onPageDrop(e, uploadTarget)}
      >
        {dragging && (
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-blue-500/10">
            <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-blue-400 bg-white px-10 py-8 shadow-lg">
              <UploadCloud className="size-10 text-blue-500" />
              <p className="text-sm font-semibold text-gray-800">Drop files to upload</p>
              <p className="text-xs text-gray-500">
                into {uploadFolderLabel} of {folder.fullName}
              </p>
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setFolder(null)} aria-label="Back">
            <ArrowLeft className="size-5" />
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Medical Record</span>
            <span>/</span>
            <span className="flex items-center gap-1.5 font-semibold text-gray-800">
              <Folder className="size-4 text-amber-500" />
              {folder.fullName}
            </span>
          </div>
          <Badge variant="secondary" className="ml-auto">
            {stats?.files ?? 0} file{(stats?.files ?? 0) === 1 ? "" : "s"} ·{" "}
            {stats?.records ?? 0} medicine record{(stats?.records ?? 0) === 1 ? "" : "s"} ·{" "}
            {stats?.prescriptions ?? 0} prescription{(stats?.prescriptions ?? 0) === 1 ? "" : "s"}
          </Badge>
        </div>

        <Card className="border-slate-200 bg-gradient-to-r from-slate-50 to-white">
          <CardContent className="flex flex-wrap items-center gap-4 py-4">
            <NameAvatar name={folder.fullName} size="md" />
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-gray-800">{folder.fullName}</p>
              <p className="text-sm text-gray-500">
                {folder.mobile}
                {folder.gender ? ` · ${folder.gender}` : ""}
                {age !== null ? ` · ${age} yrs` : ""}
                {folder.bloodGroup ? ` · ${folder.bloodGroup}` : ""}
              </p>
            </div>
            <div className="grid gap-1 text-sm text-gray-500 sm:text-right">
              {folder.email && <p>{folder.email}</p>}
              <p>
                {[folder.city, folder.state].filter(Boolean).join(", ") || "—"}
                {folder.pincode ? ` - ${folder.pincode}` : ""}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-8">
            <div
              onClick={() => inputRef.current?.click()}
              className="flex w-full max-w-lg cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/40 px-6 py-8 text-center transition-colors hover:border-blue-300 hover:bg-blue-50"
            >
              {uploading ? (
                <Loader2 className="size-8 animate-spin text-blue-500" />
              ) : (
                <UploadCloud className="size-8 text-blue-500" />
              )}
              <p className="text-sm font-medium text-gray-700">
                {uploading ? "Uploading…" : "Click to browse — or drag & drop anywhere on this page"}
              </p>
              <p className="text-xs text-gray-500">
                Files land in {uploadFolderLabel} — a copy is sent to {folder.fullName}
                &apos;s WhatsApp number automatically
              </p>
            </div>
            <div className="flex w-full max-w-lg items-center gap-2">
              <Select value={uploadTarget} onValueChange={(v) => setUploadTarget(v ?? "medical")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Upload to folder" />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_FOLDER_KEYS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {FOLDER_META[k].title}
                    </SelectItem>
                  ))}
                  {customFoldersForPatient.map((fo) => (
                    <SelectItem key={fo.folderId} value={fo.folderId}>
                      {fo.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5 text-xs"
                onClick={() => setNewFolderOpen(true)}
              >
                <FolderPlus className="size-3.5" />
                New Folder
              </Button>
            </div>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                void handleUpload(e.target.files, uploadTarget);
                e.target.value = "";
              }}
            />
          </CardContent>
        </Card>

        <SectionHeading
          Icon={ClipboardList}
          tint="text-blue-600"
          title="Medicine Records"
          count={folderRecords.length}
          countLabel="record"
          action={
            folderRecords.length > 0 ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setActiveFolder("medicine")}
              >
                Open folder
              </Button>
            ) : undefined
          }
        />
        {folderRecords.length > 0 ? (
          <div className="space-y-3">
            {[...folderRecords]
              .sort((a, b) => b.visitDate.localeCompare(a.visitDate))
              .map((r) => (
                <MedicineRecordCard
                  key={r.recordId}
                  record={r}
                  doctorName={doctorName}
                  onDownload={handleRecordAttachmentDownload}
                />
              ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-sm text-gray-500">
              No medicine records yet. Create them from the Medicine page.
            </CardContent>
          </Card>
        )}

        <SectionHeading
          Icon={Folder}
          tint="text-amber-600"
          title="Uploaded Files"
          count={allFolderFiles.length}
          countLabel="file"
          action={
            customFoldersForPatient.length > 0 || groupedKeys.length > 0 ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setActiveFolder("medical")}
              >
                Open folder
              </Button>
            ) : undefined
          }
        />
        {allFolderFiles.length > 0 || customFoldersForPatient.length > 0 ? (
          <div className="space-y-4">
            {groupedKeys.map((key) => {
              const list = filesByFolderKey.get(key) ?? [];
              const isDefault = key === "medicine" || key === "medical" || key === "prescriptions";
              const meta = isDefault
                ? FOLDER_META[key as DefaultFolderKey]
                : customFolderMeta(key);
              const customFolder = isDefault
                ? undefined
                : folders.find((fo) => fo.folderId === key);
              return (
                <Card key={key} className="border-slate-200">
                  <CardContent className="p-0">
                    <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
                      <span
                        className={`flex size-7 shrink-0 items-center justify-center rounded-full ${meta.bg} ${meta.tint}`}
                      >
                        <meta.icon className="size-3.5" />
                      </span>
                      <p className="text-sm font-semibold text-gray-800">{meta.title}</p>
                      <span className="text-xs text-gray-500">
                        {list.length} file{list.length === 1 ? "" : "s"}
                        {list.length > 0
                          ? ` · ${formatSize(list.reduce((s, f) => s + f.size, 0))}`
                          : ""}
                      </span>
                      <div className="ml-auto flex items-center gap-1">
                        {customFolder && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete folder ${customFolder.name}`}
                            onClick={() => setDeleteFolderTarget(customFolder)}
                            className="size-7 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="size-3.5 text-red-400" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setActiveFolder(key)}
                        >
                          Open
                        </Button>
                      </div>
                    </div>
                    {list.length > 0 ? (
                      <div className="divide-y divide-slate-100">
                        {list.map((f) => (
                          <UploadedFileRow
                            key={f.fileId}
                            file={f}
                            onDownload={handleDownload}
                            onDelete={(file) => setDeleteTarget(file)}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-6 text-center text-sm text-gray-500">
                        No files in this folder yet. Drag & drop files here and pick this folder as
                        the target.
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-sm text-gray-500">
              No files uploaded yet. Drag & drop files anywhere on this page.
            </CardContent>
          </Card>
        )}

        <SectionHeading
          Icon={Pill}
          tint="text-emerald-600"
          title="Prescriptions"
          count={folderPrescriptions.length}
          countLabel="prescription"
          action={
            folderPrescriptions.length > 0 ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setActiveFolder("prescriptions")}
              >
                Open folder
              </Button>
            ) : undefined
          }
        />
        {folderPrescriptions.length > 0 ? (
          <div className="space-y-3">
            {[...folderPrescriptions]
              .sort((a, b) => b.visitDate.localeCompare(a.visitDate))
              .map((p) => (
                <PrescriptionCard
                  key={p.prescriptionId}
                  prescription={p}
                  doctorName={doctorName}
                />
              ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-sm text-gray-500">
              No prescriptions yet. Create them from the Prescriptions page.
            </CardContent>
          </Card>
        )}

        <ConfirmDeleteDialog
          open={deleteTarget !== null}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          title={`Delete "${deleteTarget?.fileName ?? ""}"?`}
          description="This file will be permanently removed. This action cannot be undone."
          onConfirm={async () => {
            if (deleteTarget) await handleDelete(deleteTarget);
            setDeleteTarget(null);
          }}
        />

        <ConfirmDeleteDialog
          open={deleteFolderTarget !== null}
          onOpenChange={(open) => {
            if (!open) setDeleteFolderTarget(null);
          }}
          title={`Delete folder "${deleteFolderTarget?.name ?? ""}"?`}
          description="The folder and all files inside it will be permanently removed. This action cannot be undone."
          onConfirm={async () => {
            if (deleteFolderTarget) {
              await handleDeleteFolder(deleteFolderTarget);
              setDeleteFolderTarget(null);
            }
          }}
        />

        <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create folder</DialogTitle>
              <DialogDescription>
                New folder for {folder.fullName}&apos;s medical records.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="folder-name" className="text-sm font-medium text-gray-700">
                Folder name *
              </Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g. Lab Reports, X-Ray Scans, Insurance…"
                maxLength={60}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleCreateFolder();
                }}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewFolderOpen(false)} disabled={creatingFolder}>
                Cancel
              </Button>
              <Button onClick={() => void handleCreateFolder()} disabled={creatingFolder}>
                {creatingFolder ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    <Plus className="size-4" />
                    Create folder
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── Root view (overall patients data) ──────────────────────────────────
  return (
    <div
      className="space-y-4"
      onDragEnter={onPageDragEnter}
      onDragOver={onPageDragOver}
      onDragLeave={onPageDragLeave}
      onDrop={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        toast.info("Open a patient folder first, then drag & drop files anywhere inside it");
      }}
    >
      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-blue-500/10">
          <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-blue-400 bg-white px-10 py-8 shadow-lg">
            <UploadCloud className="size-10 text-blue-500" />
            <p className="text-sm font-semibold text-gray-800">Drop files to upload</p>
            <p className="text-xs text-gray-500">Open a patient folder first</p>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-gray-800">Medical Record</h1>
        <p className="hidden text-sm text-gray-500 sm:block">
          Overall patient data — medicine records, documents and prescriptions per patient
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-blue-100 bg-blue-50/40">
          <CardContent className="flex items-center gap-3 py-4">
            <span className="flex size-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <Folder className="size-5" />
            </span>
            <div>
              <p className="text-2xl font-bold text-gray-800">{patients.length}</p>
              <p className="text-xs text-gray-500">Total Patients</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-100 bg-amber-50/40">
          <CardContent className="flex items-center gap-3 py-4">
            <span className="flex size-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <ClipboardList className="size-5" />
            </span>
            <div>
              <p className="text-2xl font-bold text-gray-800">{totalRecords}</p>
              <p className="text-xs text-gray-500">Medicine Records</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-100 bg-emerald-50/40">
          <CardContent className="flex items-center gap-3 py-4">
            <span className="flex size-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Pill className="size-5" />
            </span>
            <div>
              <p className="text-2xl font-bold text-gray-800">{totalPrescriptions}</p>
              <p className="text-xs text-gray-500">Prescriptions</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-slate-50/40">
          <CardContent className="flex items-center gap-3 py-4">
            <span className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
              <FileText className="size-5" />
            </span>
            <div>
              <p className="text-2xl font-bold text-gray-800">{totalFiles}</p>
              <p className="text-xs text-gray-500">Medical Files</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search patient folders…"
          className="border-blue-200 pl-9"
        />
      </div>

      {filteredPatients.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-gray-500">
            No patients found. Add patients first, and a folder is created for each of them
            automatically.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPatients.map((p) => {
            const stats = patientStats.get(p.patientId);
            const age = calculateAge(p.dateOfBirth);
            return (
              <button
                key={p.patientId}
                onClick={() => {
                  setFolder(p);
                  setActiveFolder(null);
                }}
                className="group flex flex-col gap-3 rounded-xl border border-blue-200 bg-gradient-to-b from-blue-50/40 to-white p-4 text-left transition-all hover:border-blue-400 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <NameAvatar name={p.fullName} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-800">{p.fullName}</p>
                    <p className="text-xs text-gray-500">
                      {p.mobile} {p.gender ? `· ${p.gender}` : ""}
                      {age !== null ? ` · ${age} yrs` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-gray-500">
                  <span>
                    {stats?.records ?? 0} medicine record{(stats?.records ?? 0) === 1 ? "" : "s"} ·{" "}
                    {stats?.files ?? 0} file{(stats?.files ?? 0) === 1 ? "" : "s"} ·{" "}
                    {stats?.prescriptions ?? 0} prescription{(stats?.prescriptions ?? 0) === 1 ? "" : "s"}
                    {stats?.fileSize ? ` · ${formatSize(stats.fileSize)}` : ""}
                  </span>
                  <span className="text-blue-600 opacity-0 transition-opacity group-hover:opacity-100">
                    Open →
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}