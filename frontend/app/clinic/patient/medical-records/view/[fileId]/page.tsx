"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  getMedicalRecordDownloadUrl,
  listMedicalRecordFiles,
  type MedicalRecordFile,
} from "@/lib/clinic-api";
import { formatDate } from "@/lib/format-time";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Download, FileText } from "lucide-react";

function formatBytes(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PatientFileViewPage() {
  const session = useRequireRole("patient");
  const router = useRouter();
  const params = useParams<{ fileId: string }>();
  const fileId = params?.fileId ?? "";
  const [file, setFile] = useState<MedicalRecordFile | null>(null);
  const [url, setUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session?.clinicId || !fileId) return;
    try {
      const [filesRes, { url: downloadUrl }] = await Promise.all([
        listMedicalRecordFiles(session.clinicId),
        getMedicalRecordDownloadUrl(session.clinicId, fileId),
      ]);
      const found = filesRes.files.find((f) => f.fileId === fileId);
      if (!found) {
        toast.error("File not found");
        router.replace("/clinic/patient/medical-records");
        return;
      }
      setFile(found);
      setUrl(downloadUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load file");
      router.replace("/clinic/patient/medical-records");
    } finally {
      setLoading(false);
    }
  }, [session?.clinicId, fileId, router]);

  useEffect(() => {
    load();
  }, [load]);

  const isPreviewable = useMemo(() => {
    if (!file?.mimeType) return false;
    return (
      file.mimeType === "application/pdf" ||
      file.mimeType.startsWith("image/") ||
      file.mimeType === "text/plain"
    );
  }, [file?.mimeType]);

  if (loading) {
    return (
      <div className="flex h-[calc(100svh-8rem)] flex-col">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4">
          <Skeleton className="size-9 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
        <Skeleton className="m-4 flex-1 rounded-xl" />
      </div>
    );
  }

  if (!file) {
    return (
      <div className="flex h-[calc(100svh-8rem)] flex-col items-center justify-center gap-3 text-center">
        <FileText className="size-12 text-slate-300" />
        <p className="text-sm text-slate-500">File could not be loaded.</p>
        <Button variant="outline" onClick={() => router.replace("/clinic/patient/medical-records")}>
          Back to Medical Records
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100svh-8rem)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center justify-center rounded-lg p-2 hover:bg-slate-100"
        >
          <ChevronLeft size={20} className="text-slate-600" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <FileText className="size-5" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-slate-900">{file.fileName}</h1>
            <p className="text-xs text-slate-500">
              Uploaded {formatDate(file.createdAt)} · {formatBytes(file.size)} ·{" "}
              {file.mimeType ?? "Unknown type"}
            </p>
          </div>
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="gap-1.5">
            <Download className="size-4" />
            Download
          </Button>
        </a>
      </div>

      {/* Preview */}
      <div className="flex flex-1 flex-col items-center justify-center overflow-hidden bg-slate-50">
        {isPreviewable ? (
          <iframe
            src={url}
            title={file.fileName}
            className="size-full border-0"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <FileText className="size-12 text-slate-300" />
            <p className="text-sm font-medium text-slate-700">Preview not available for this file type</p>
            <p className="max-w-sm text-xs text-slate-500">
              {file.fileName} ({file.mimeType ?? "unknown type"}) cannot be previewed in the browser.
              Click Download to save it to your device.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}