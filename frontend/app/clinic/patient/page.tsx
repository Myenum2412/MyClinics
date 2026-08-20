"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  getMedicalRecordDownloadUrl,
  getOwnClinic,
  listMedicalRecordFiles,
  myAppointments,
  myRecords,
  type MedicalRecordFile,
} from "@/lib/clinic-api";
import { formatDate } from "@/lib/format-time";
import { openInNewTab } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  CalendarPlus,
  ChevronRight,
  Download,
  FileArchive,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderOpen,
  HeartPulse,
  Newspaper,
  Pill,
  UserRound,
} from "lucide-react";

const RECENT_LIMIT = 6;

function fileMeta(name: string): { icon: React.ReactNode; tint: string } {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  const map: Record<string, { icon: React.ReactNode; tint: string }> = {
    pdf: { icon: <FileText className="size-5" />, tint: "bg-rose-50 text-rose-600" },
    jpg: { icon: <FileImage className="size-5" />, tint: "bg-emerald-50 text-emerald-600" },
    jpeg: { icon: <FileImage className="size-5" />, tint: "bg-emerald-50 text-emerald-600" },
    png: { icon: <FileImage className="size-5" />, tint: "bg-emerald-50 text-emerald-600" },
    tif: { icon: <FileImage className="size-5" />, tint: "bg-emerald-50 text-emerald-600" },
    tiff: { icon: <FileImage className="size-5" />, tint: "bg-emerald-50 text-emerald-600" },
    doc: { icon: <Newspaper className="size-5" />, tint: "bg-blue-50 text-blue-600" },
    docx: { icon: <Newspaper className="size-5" />, tint: "bg-blue-50 text-blue-600" },
    xls: { icon: <FileSpreadsheet className="size-5" />, tint: "bg-green-50 text-green-600" },
    xlsx: { icon: <FileSpreadsheet className="size-5" />, tint: "bg-green-50 text-green-600" },
    dcm: { icon: <Activity className="size-5" />, tint: "bg-violet-50 text-violet-600" },
  };
  return map[ext] ?? { icon: <FileArchive className="size-5" />, tint: "bg-slate-100 text-slate-600" };
}

function folderLabel(folder?: string | null): string {
  if (!folder) return "Medical Records";
  return folder.replace(/-/g, " ");
}

export default function PatientPortalPage() {
  const session = useRequireRole("patient");
  const [files, setFiles] = useState<MedicalRecordFile[]>([]);
  const [appointmentCount, setAppointmentCount] = useState(0);
  const [recordCount, setRecordCount] = useState(0);
  const [clinicName, setClinicName] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session?.clinicId) return;
    try {
      const [{ files: allFiles }, apptRes, recRes] = await Promise.all([
        listMedicalRecordFiles(session.clinicId),
        myAppointments(session.clinicId, { limit: 100 }),
        myRecords(session.clinicId, { limit: 100 }),
      ]);
      setFiles(allFiles.slice(0, RECENT_LIMIT));
      setAppointmentCount(apptRes.total ?? apptRes.items.length);
      setRecordCount(recRes.total ?? recRes.items.length);
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

  useEffect(() => {
    if (!session?.clinicId) return;
    getOwnClinic(session.clinicId)
      .then((c) => setClinicName(c.name))
      .catch(() => void 0);
  }, [session?.clinicId]);

  const firstName = useMemo(() => (session?.name ?? "there").trim().split(/\s+/)[0], [session?.name]);

  async function handleDownload(file: MedicalRecordFile) {
    if (!session?.clinicId) return;
    try {
      const { url } = await getMedicalRecordDownloadUrl(session.clinicId, file.fileId);
      openInNewTab(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open file");
    }
  }

  const stats = [
    {
      label: "Files Uploaded",
      value: loading ? "—" : files.length,
      icon: <FolderOpen className="size-5" />,
      tint: "bg-blue-50 text-blue-600",
    },
    {
      label: "Appointments",
      value: loading ? "—" : appointmentCount,
      icon: <CalendarPlus className="size-5" />,
      tint: "bg-fuchsia-50 text-fuchsia-600",
    },
    {
      label: "Medical Records",
      value: loading ? "—" : recordCount,
      icon: <HeartPulse className="size-5" />,
      tint: "bg-emerald-50 text-emerald-600",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Hero header ── */}
      <header className="bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 text-white">
        <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between gap-4 px-4 py-6 md:px-6 md:py-8">
          <div className="flex items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
              <UserRound className="size-6" />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-blue-100">
                {clinicName || "Patient Portal"}
              </p>
              <h1 className="text-2xl font-bold md:text-3xl">Hi, {firstName} 👋</h1>
              <p className="mt-0.5 text-sm text-blue-100">
                Here are your latest medical files from the clinic.
              </p>
            </div>
          </div>
          <Link href="/clinic/profile">
            <Button
              variant="secondary"
              size="sm"
              className="shrink-0 gap-1.5 bg-white/15 text-white ring-1 ring-white/25 hover:bg-white/25"
            >
              Profile
            </Button>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] w-full p-4 md:p-6 lg:p-8">
        {/* ── Quick stats ── */}
        <div className="grid gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <Card key={s.label} className="flex items-center gap-4 border-slate-200 p-4 shadow-sm">
              <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${s.tint}`}>
                {s.icon}
              </span>
              <div>
                <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                <p className="text-xs font-medium text-slate-500">{s.label}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* ── Quick actions ── */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/clinic/patient/medical-records">
            <Button className="gap-2 rounded-xl bg-blue-600 px-5 shadow-sm hover:bg-blue-700">
              <CalendarPlus className="size-4" />
              Book an Appointment
            </Button>
          </Link>
          <Link href="/clinic/patient/medical-records">
            <Button
              variant="outline"
              className="gap-2 rounded-xl border-slate-200 bg-white px-5 shadow-sm hover:bg-slate-50"
            >
              <Folder className="size-4" />
              Browse All Folders
            </Button>
          </Link>
        </div>

        {/* ── Recently uploaded files ── */}
        <Card className="mt-6 overflow-hidden border-slate-200 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <FileText className="size-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Recently Uploaded Files</h2>
                <p className="text-xs text-slate-500">Latest documents added to your records</p>
              </div>
            </div>
            <Link
              href="/clinic/patient/medical-records"
              className="group flex items-center gap-0.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              View all
              <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="p-5">
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : files.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center">
                <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <FolderOpen className="size-7" />
                </span>
                <h3 className="text-base font-semibold text-slate-900">No files uploaded yet</h3>
                <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500">
                  Files uploaded to your medical record by the clinic will appear here as soon as
                  they&apos;re added.
                </p>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {files.map((f) => {
                  const meta = fileMeta(f.fileName);
                  return (
                    <li
                      key={f.fileId}
                      className="group flex items-center gap-3.5 rounded-xl border border-slate-100 bg-white p-3.5 transition-colors hover:border-blue-200 hover:bg-blue-50/40"
                    >
                      <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${meta.tint}`}>
                        {meta.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{f.fileName}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 font-medium capitalize text-slate-600">
                            <Folder className="size-3" />
                            {folderLabel(f.folder)}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span>{formatDate(f.createdAt)}</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 gap-1.5 border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:text-blue-600"
                        onClick={() => handleDownload(f)}
                      >
                        <Download className="size-4" />
                        Open
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}