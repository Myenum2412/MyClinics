"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  type MedicalRecordFile,
  type Patient,
  deleteMedicalRecordFile,
  getMedicalRecordDownloadUrl,
  listMedicalRecordFiles,
  listPatients,
  uploadMedicalRecordFile,
} from "@/lib/clinic-api";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Download,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  Loader2,
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

export default function MedicalRecordPage() {
  const session = useRequireRole("doctor");
  const clinicId = session?.clinicId ?? "";

  const [patients, setPatients] = useState<Patient[]>([]);
  const [files, setFiles] = useState<MedicalRecordFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [folder, setFolder] = useState<Patient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MedicalRecordFile | null>(null);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    if (!clinicId) return;
    Promise.all([
      listPatients(clinicId, { limit: 500 }),
      listMedicalRecordFiles(clinicId),
    ])
      .then(([p, f]) => {
        setPatients(p.items);
        setFiles(f.files);
      })
      .catch(() => toast.error("Failed to load medical records"))
      .finally(() => setLoading(false));
  }, [clinicId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const folderStats = useMemo(() => {
    const stats = new Map<string, { count: number; size: number; last: string | null }>();
    for (const f of files) {
      const cur = stats.get(f.patientId) ?? { count: 0, size: 0, last: null };
      cur.count += 1;
      cur.size += f.size;
      if (!cur.last || f.createdAt > cur.last) cur.last = f.createdAt;
      stats.set(f.patientId, cur);
    }
    return stats;
  }, [files]);

  const folderFiles = useMemo(
    () => (folder ? files.filter((f) => f.patientId === folder.patientId) : []),
    [files, folder]
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
          await uploadMedicalRecordFile(clinicId, folder.patientId, file);
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

  // ── Folder view (patient) ──────────────────────────────────────────────
  if (folder) {
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
            {folderFiles.length} file{folderFiles.length === 1 ? "" : "s"}
          </Badge>
        </div>

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
                Images, PDFs and Office documents (DOC, XLS, PPT, CSV, TXT) up to 25MB — a copy is sent
                to {folder.fullName}&apos;s WhatsApp number automatically
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

        {folderFiles.length > 0 ? (
          <Card>
            <CardContent className="divide-y divide-slate-100 p-0">
              {folderFiles.map((f) => (
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
      </div>
    );
  }

  // ── Root view (patient folders) ────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-gray-800">Medical Record</h1>
        <p className="hidden text-sm text-gray-500 sm:block">
          One folder per patient — uploads are sent to the patient&apos;s WhatsApp
        </p>
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
            const stats = folderStats.get(p.patientId);
            return (
              <button
                key={p.patientId}
                onClick={() => setFolder(p)}
                className="group flex flex-col gap-3 rounded-xl border border-blue-200 bg-gradient-to-b from-blue-50/40 to-white p-4 text-left transition-all hover:border-blue-400 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <Folder className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-800">{p.fullName}</p>
                    <p className="text-xs text-gray-500">
                      {p.mobile} {p.gender ? `· ${p.gender}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {stats?.count ?? 0} file{stats?.count === 1 ? "" : "s"}
                    {stats ? ` · ${formatSize(stats.size)}` : ""}
                  </span>
                  <span className="text-blue-600 opacity-0 transition-opacity group-hover:opacity-100">
                    Open folder →
                  </span>
                </div>
              </button>
            );
          })}
        </div>
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
    </div>
  );
}