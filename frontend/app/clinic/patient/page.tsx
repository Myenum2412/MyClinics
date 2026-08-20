"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  listMedicalRecordFiles,
  listMedicalRecordFolders,
  type MedicalRecordFile,
  type MedicalRecordFolder,
} from "@/lib/clinic-api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Folder, FolderOpen } from "lucide-react";

export default function PatientPortalPage() {
  const session = useRequireRole("patient");
  const [files, setFiles] = useState<MedicalRecordFile[]>([]);
  const [folders, setFolders] = useState<MedicalRecordFolder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session?.clinicId) return;
    try {
      const [filesRes, foldersRes] = await Promise.all([
        listMedicalRecordFiles(session.clinicId),
        session.patientId
          ? listMedicalRecordFolders(session.clinicId, session.patientId)
          : Promise.resolve({ folders: [] }),
      ]);
      setFiles(filesRes.files);
      setFolders(foldersRes.folders);
    } catch {
      // leave the empty state visible
    } finally {
      setLoading(false);
    }
  }, [session?.clinicId, session?.patientId]);

  useEffect(() => {
    if (!session?.clinicId) return;
    load();
  }, [session?.clinicId, load]);

  const folderCards = useMemo(() => {
    const cards: { key: string; name: string; count: number }[] = folders.map((folder) => ({
      key: folder.folderId,
      name: folder.name,
      count: files.filter(
        (f) => f.folder === folder.defaultKey || f.folder === folder.folderId
      ).length,
    }));
    const orphanCount = files.filter(
      (f) => !folders.some((fo) => fo.folderId === f.folder || fo.defaultKey === f.folder)
    ).length;
    if (orphanCount > 0) {
      cards.push({ key: "orphan", name: "Other Documents", count: orphanCount });
    }
    return cards;
  }, [folders, files]);

  const firstName = useMemo(
    () => (session?.name ?? "there").trim().split(/\s+/)[0],
    [session?.name]
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Welcome card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="mx-auto max-w-[1400px] w-full px-4 py-8 md:px-6">
          <h1 className="text-2xl font-bold md:text-3xl">Welcome, {firstName}</h1>
          <p className="mt-1 text-sm text-blue-100">
            Your medical files and documents are organized in the folders below.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] w-full p-4 md:p-6 lg:p-8">
        {/* Folder grid */}
        <Card className="border-slate-200 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-blue-600">
                <Folder className="size-4" />
              </span>
              <h2 className="text-sm font-semibold text-slate-900">My Files & Documents</h2>
            </div>
          </div>
          <div className="p-5">
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            ) : folderCards.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
                <FolderOpen className="size-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900">No files uploaded yet</h3>
                <p className="text-slate-500 mt-2">
                  Files uploaded to your medical record by the clinic will appear here.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {folderCards.map((f) => (
                  <div
                    key={f.key}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-blue-200 hover:bg-blue-50/40"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <FileText className="size-5" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{f.name}</p>
                        <p className="text-xs text-slate-500">
                          {f.count} {f.count === 1 ? "file" : "files"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <div className="mt-4 flex justify-end">
          <Link href="/clinic/patient/medical-records">
            <Button variant="ghost" size="sm" className="text-blue-600">
              View all medical records
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}