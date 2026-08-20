"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  getMedicalRecordDownloadUrl,
  listMedicalRecordFiles,
  type MedicalRecordFile,
} from "@/lib/clinic-api";
import { formatDate } from "@/lib/format-time";
import { openInNewTab } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileText, Folder } from "lucide-react";

const RECENT_LIMIT = 10;

export default function PatientPortalPage() {
  const session = useRequireRole("patient");
  const [files, setFiles] = useState<MedicalRecordFile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session?.clinicId) return;
    try {
      const { files: allFiles } = await listMedicalRecordFiles(session.clinicId);
      setFiles(allFiles.slice(0, RECENT_LIMIT));
    } catch {
      // leave the empty state visible
    } finally {
      setLoading(false);
    }
  }, [session?.clinicId]);

  useEffect(() => {
    if (!session?.clinicId) return;
    load();
  }, [session?.clinicId, load]);

  async function handleDownload(file: MedicalRecordFile) {
    if (!session?.clinicId) return;
    try {
      const { url } = await getMedicalRecordDownloadUrl(session.clinicId, file.fileId);
      openInNewTab(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open file");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-slate-900">Medical Records</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/clinic/profile">
            <Button variant="ghost" size="sm" className="gap-1.5">
              Profile
            </Button>
          </Link>
        </div>
      </div>

      <div className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto w-full">
        <Card>
          <CardHeader className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-blue-600">
                  <Folder className="size-4" />
                </span>
                <CardTitle className="text-sm font-semibold text-gray-800">
                  Recently Uploaded Files
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-xs">{files.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : files.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
                <FileText className="size-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900">No files uploaded yet</h3>
                <p className="text-slate-500 mt-2">
                  Files uploaded to your medical record by the clinic will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {files.map((f) => (
                  <div
                    key={f.fileId}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <FileText className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{f.fileName}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                        <Folder className="size-3" />
                        <span className="truncate capitalize">{f.folder?.replace(/-/g, " ") ?? "Medical Records"}</span>
                        <span>· {formatDate(f.createdAt)}</span>
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 shrink-0"
                      onClick={() => handleDownload(f)}
                    >
                      <Download className="size-4" />
                      Open
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-4 flex justify-end">
          <Link href="/clinic/patient/medical-records">
            <Button variant="ghost" size="sm" className="gap-1.5 text-blue-600">
              View all medical records
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}