"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type DefaultFolderKey = "medicine" | "medical" | "prescriptions";

const DEFAULT_FOLDER_KEYS: DefaultFolderKey[] = ["medicine", "medical", "prescriptions"];

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
    async (fileList: FileList | null) => {
      if (!folder || !fileList?.length || uploading) return;
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
          await uploadMedicalRecordFile(clinicId, folder.patientId, file, activeFolder ?? "medical");
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
    [clinicId, folder, activeFolder, uploading, refresh]
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
      <div className="space-y-4">
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
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                void handleUpload(e.dataTransfer.files);
              }}
              onClick={() => inputRef.current?.click()}
              className={`flex w-full max-w-lg cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
                dragging
                  ? "border-blue-400 bg-blue-50"
                  : "border-blue-200 bg-blue-50/40 hover:border-blue-300 hover:bg-blue-50"
              }`}
            >
              {uploading ? (
                <Loader2 className="size-8 animate-spin text-blue-500" />
              ) : (
                <UploadCloud className="size-8 text-blue-500" />
              )}
              <p className="text-sm font-medium text-gray-700">
                {uploading ? "Uploading…" : "Click or drag & drop files"}
              </p>
              <p className="text-xs text-gray-500">
                Files added here appear in the {meta.title} folder — a copy is sent to{" "}
                {folder.fullName}&apos;s WhatsApp number automatically
              </p>
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
          </CardContent>
        </Card>

        {folderKeyFiles.length > 0 ? (
          <Card>
            <CardContent className="divide-y divide-slate-100 p-0">
              {folderKeyFiles.map((f) => (
                <div key={f.fileId} className="flex items-center gap-3 px-4 py-3">
                  {fileIcon(f.mimeType, f.fileName)}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">{f.fileName}</p>
                    <p className="text-xs text-gray-500">
                      {formatSize(f.size)} · {formatDate(f.createdAt)}
                      {f.uploadedByName ? ` · by ${f.uploadedByName}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void handleDownload(f)}
                      aria-label="Download"
                    >
                      <Download className="size-4 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(f)}
                      aria-label="Delete"
                      className="hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="size-4 text-red-500" />
                    </Button>
                  </div>
                </div>
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
                  <Card key={r.recordId} className="border-blue-100">
                    <CardContent className="p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50">
                          {formatDate(r.visitDate)}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          Doctor: {doctorName(r.doctorId)}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                            Diagnosis
                          </p>
                          <p className="text-sm font-medium text-gray-800">{r.diagnosis}</p>
                        </div>
                        {r.symptoms && (
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                              Symptoms
                            </p>
                            <p className="text-sm text-gray-700">{r.symptoms}</p>
                          </div>
                        )}
                        {r.treatment && (
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                              Treatment
                            </p>
                            <p className="text-sm text-gray-700">{r.treatment}</p>
                          </div>
                        )}
                        {r.notes && (
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                              Notes
                            </p>
                            <p className="text-sm text-gray-700">{r.notes}</p>
                          </div>
                        )}
                      </div>
                      {r.attachments.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                          {r.attachments.map((a, i) => (
                            <a
                              key={i}
                              href={a.url ?? undefined}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => {
                                if (!a.url) e.preventDefault();
                              }}
                              className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1 text-xs text-gray-600 ring-1 ring-slate-200 hover:bg-slate-100"
                            >
                              <Download className="size-3" />
                              {a.name}
                            </a>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
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
                  <Card key={p.prescriptionId} className="border-emerald-100">
                    <CardContent className="p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                          {formatDate(p.visitDate)}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          Doctor: {doctorName(p.doctorId)}
                        </span>
                      </div>
                      {p.diagnosis && (
                        <div className="mt-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                            Diagnosis
                          </p>
                          <p className="text-sm font-medium text-gray-800">{p.diagnosis}</p>
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
                            {p.medicines.map((m, i) => (
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
                      {p.notes && (
                        <p className="mt-3 text-sm text-gray-700">
                          <span className="font-medium text-gray-500">Notes: </span>
                          {p.notes}
                        </p>
                      )}
                    </CardContent>
                  </Card>
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

  // ── Patient view (folders) ─────────────────────────────────────────────
  if (folder) {
    const stats = patientStats.get(folder.patientId);
    const age = calculateAge(folder.dateOfBirth);
    return (
      <div className="space-y-4">
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DEFAULT_FOLDER_KEYS.map((kind) => {
            const meta = FOLDER_META[kind];
            const filesInFolder = filesByFolderKey.get(kind) ?? [];
            const count =
              kind === "medicine"
                ? folderRecords.length + filesInFolder.length
                : kind === "medical"
                  ? filesInFolder.length
                  : folderPrescriptions.length + filesInFolder.length;
            const sub =
              kind === "medical" && filesInFolder.length > 0
                ? `${formatSize(filesInFolder.reduce((s, f) => s + f.size, 0))} stored`
                : kind === "medicine" && folderRecords.length > 0
                  ? `Last visit ${formatDate([...folderRecords].sort((a, b) => b.visitDate.localeCompare(a.visitDate))[0].visitDate)}`
                  : kind === "prescriptions" && folderPrescriptions.length > 0
                    ? `Last issued ${formatDate([...folderPrescriptions].sort((a, b) => b.visitDate.localeCompare(a.visitDate))[0].visitDate)}`
                    : "Empty folder";
            return (
              <button
                key={kind}
                onClick={() => setActiveFolder(kind)}
                className="group flex flex-col gap-3 rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4 text-left transition-all hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${meta.bg} ${meta.tint}`}>
                    <meta.icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-800">{meta.title}</p>
                    <p className="text-xs text-gray-500">{meta.hint}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {count} {kind === "medicine" ? "item" : kind === "medical" ? "file" : "item"}
                    {count === 1 ? "" : "s"} · {sub}
                  </span>
                  <span className="text-blue-600 opacity-0 transition-opacity group-hover:opacity-100">
                    Open →
                  </span>
                </div>
              </button>
            );
          })}

          {customFoldersForPatient.map((fo) => {
            const meta = customFolderMeta(fo.folderId);
            const filesInFolder = filesByFolderKey.get(fo.folderId) ?? [];
            return (
              <div
                key={fo.folderId}
                className="group relative flex flex-col gap-3 rounded-xl border border-violet-200 bg-gradient-to-b from-violet-50/40 to-white p-4 text-left transition-all hover:border-violet-300 hover:shadow-md"
              >
                <button
                  onClick={() => setActiveFolder(fo.folderId)}
                  className="flex flex-1 flex-col gap-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${meta.bg} ${meta.tint}`}>
                      <meta.icon className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-800">{fo.name}</p>
                      <p className="text-xs text-gray-500">{meta.hint}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {filesInFolder.length} file{filesInFolder.length === 1 ? "" : "s"}
                      {filesInFolder.length > 0
                        ? ` · ${formatSize(filesInFolder.reduce((s, f) => s + f.size, 0))}`
                        : ""}
                    </span>
                    <span className="text-blue-600 opacity-0 transition-opacity group-hover:opacity-100">
                      Open →
                    </span>
                  </div>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete folder ${fo.name}`}
                  onClick={() => setDeleteFolderTarget(fo)}
                  className="absolute right-2 top-2 size-7 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="size-3.5 text-red-400" />
                </Button>
              </div>
            );
          })}

          <button
            onClick={() => setNewFolderOpen(true)}
            className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 p-4 text-center text-slate-400 transition-all hover:border-violet-300 hover:bg-violet-50/40 hover:text-violet-500"
          >
            <FolderPlus className="size-6" />
            <span className="text-sm font-medium">New Folder</span>
            <span className="text-xs">Create a custom folder for {folder.fullName}</span>
          </button>
        </div>

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
    <div className="space-y-4">
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