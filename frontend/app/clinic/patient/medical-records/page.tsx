"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  getMedicalRecordDownloadUrl,
  listDoctors,
  listMedicalRecordFiles,
  listMedicalRecordFolders,
  myAppointments,
  myRecords,
  type Appointment,
  type Doctor,
  type MedicalRecordFile,
  type MedicalRecordFolder,
  type MedicineRecord,
} from "@/lib/clinic-api";
import { formatDate, formatTime } from "@/lib/format-time";
import { openInNewTab } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Download,
  FileText,
  Folder,
} from "lucide-react";

const APPT_STATUS_CLASS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-slate-200 text-slate-600",
};

function doctorName(doctors: Doctor[], id: string): string {
  return doctors.find((d) => d.doctorId === id)?.name ?? "Unknown";
}

export default function PatientMedicalRecordsPage() {
  const session = useRequireRole("patient");
  const [records, setRecords] = useState<MedicineRecord[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [files, setFiles] = useState<MedicalRecordFile[]>([]);
  const [folders, setFolders] = useState<MedicalRecordFolder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session?.clinicId) return;
    try {
      const [recordsRes, apptRes, docsRes, filesRes, foldersRes] = await Promise.all([
        myRecords(session.clinicId),
        myAppointments(session.clinicId, { limit: 100 }),
        listDoctors(session.clinicId, { status: "active", limit: 100 }),
        listMedicalRecordFiles(session.clinicId),
        session.patientId
          ? listMedicalRecordFolders(session.clinicId, session.patientId)
          : Promise.resolve({ folders: [] }),
      ]);
      setRecords(recordsRes.items);
      setAppointments(
        apptRes.items.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
      );
      setDoctors(docsRes.items);
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

  async function handleDownload(file: MedicalRecordFile) {
    if (!session?.clinicId) return;
    try {
      const { url } = await getMedicalRecordDownloadUrl(session.clinicId, file.fileId);
      openInNewTab(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open file");
    }
  }

  function formatBytes(bytes: number): string {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

const orphanFiles = files.filter(
    (f) => !folders.some((fo) => fo.folderId === f.folder || fo.defaultKey === f.folder)
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-slate-200 rounded w-1/4 animate-pulse" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-slate-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">My Medical Records</h2>
        <p className="text-slate-500 mt-1">
          Access your appointments and medical history.
        </p>
      </div>

      {/* My Appointments */}
      <Card>
        <CardHeader className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-800">My Appointments</CardTitle>
            <Badge variant="outline" className="text-xs">{appointments.length}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          {appointments.length === 0 ? (
            <p className="text-sm text-gray-500">No appointments yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((a) => (
                    <TableRow key={a.appointmentId}>
                      <TableCell className="text-sm whitespace-nowrap">{formatDate(a.date)}</TableCell>
                      <TableCell className="text-sm text-gray-600 whitespace-nowrap">{formatTime(a.time)}</TableCell>
                      <TableCell className="text-sm">{doctorName(doctors, a.doctorId)}</TableCell>
                      <TableCell className="text-sm text-gray-600">{a.reason || "—"}</TableCell>
                      <TableCell>
                        <Badge className={APPT_STATUS_CLASS[a.status] ?? "bg-slate-100 text-slate-600"} variant="outline">
                          {a.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* My Files & Documents */}
      <Card>
        <CardHeader className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-blue-600">
                <Folder className="size-4" />
              </span>
              <CardTitle className="text-sm font-semibold text-gray-800">My Files & Documents</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">{files.length}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          {folders.length === 0 && files.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
              <Folder className="size-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No files uploaded yet</h3>
              <p className="text-slate-500 mt-2">
                Files uploaded to your medical record by the clinic will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {folders.map((folder) => {
                const folderFiles = files.filter(
                  (f) => f.folder === folder.defaultKey || f.folder === folder.folderId
                );
                return (
                  <div key={folder.folderId}>
                    <div className="mb-2 flex items-center gap-2">
                      <Folder className="size-4 text-slate-400" />
                      <h4 className="text-sm font-semibold text-slate-700">{folder.name}</h4>
                      <span className="text-xs text-slate-400">({folderFiles.length})</span>
                    </div>
                    {folderFiles.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-400">
                        No files in this folder yet.
                      </p>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <Table>
                          <TableBody>
                            {folderFiles.map((f) => (
                              <TableRow key={f.fileId} className="hover:bg-slate-50/50">
                                <TableCell className="min-w-0">
                                  <div className="flex items-center gap-3">
                                    <FileText className="size-4 shrink-0 text-blue-500" />
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium text-slate-900">{f.fileName}</p>
                                      <p className="text-xs text-slate-500">
                                        {formatDate(f.createdAt)} · {formatBytes(f.size)}
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5"
                                    onClick={() => handleDownload(f)}
                                  >
                                    <Download className="size-4" />
                                    Open
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                );
              })}
              {orphanFiles.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <Folder className="size-4 text-slate-400" />
                    <h4 className="text-sm font-semibold text-slate-700">Other Documents</h4>
                    <span className="text-xs text-slate-400">({orphanFiles.length})</span>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <Table>
                      <TableBody>
                        {orphanFiles.map((f) => (
                          <TableRow key={f.fileId} className="hover:bg-slate-50/50">
                            <TableCell className="min-w-0">
                              <div className="flex items-center gap-3">
                                <FileText className="size-4 shrink-0 text-blue-500" />
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-slate-900">{f.fileName}</p>
                                  <p className="text-xs text-slate-500">
                                    {formatDate(f.createdAt)} · {formatBytes(f.size)}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                onClick={() => handleDownload(f)}
                              >
                                <Download className="size-4" />
                                Open
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Medical Records */}
      <Card>
        <CardHeader className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-blue-600">
              <FileText className="size-4" />
            </span>
            <CardTitle className="text-sm font-semibold text-gray-800">Medical Records</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          {records.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
              <FileText className="size-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No medical records yet</h3>
              <p className="text-slate-500 mt-2">Your medical records will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Diagnosis</TableHead>
                    <TableHead>Symptoms</TableHead>
                    <TableHead>Treatment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.recordId}>
                      <TableCell className="text-sm whitespace-nowrap">{formatDate(record.visitDate)}</TableCell>
                      <TableCell className="text-sm">
                        <p className="font-medium text-slate-900">Dr. {record.doctorId?.slice(0, 8) || "Unknown"}</p>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 max-w-xs truncate">{record.diagnosis || "—"}</TableCell>
                      <TableCell className="text-sm text-gray-600 max-w-xs truncate">{record.symptoms || "—"}</TableCell>
                      <TableCell className="text-sm text-gray-600 max-w-xs truncate">{record.treatment || "—"}</TableCell>
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