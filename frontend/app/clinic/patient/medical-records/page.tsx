"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Download,
  Eye,
  FileText,
  Folder,
  Loader2,
} from "lucide-react";

const APPT_STATUS_CLASS: Record<string, string> = {
  scheduled: "bg-primary/10 text-primary",
  completed: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
  no_show: "bg-muted text-muted-foreground",
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
  const [previewFile, setPreviewFile] = useState<MedicalRecordFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  const load = useCallback(async () => {
    if (!session?.clinicId) return;
    try {
      const [recordsRes, apptRes, docsRes, filesRes, foldersRes] = await Promise.all([
        myRecords(session.clinicId),
        myAppointments(session.clinicId, { limit: 50 }),
        listDoctors(session.clinicId, { status: "active", limit: 50 }),
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

  async function handleOpen(file: MedicalRecordFile) {
    if (!session?.clinicId) return;
    setPreviewFile(file);
    setPreviewUrl("");
    setPreviewLoading(true);
    try {
      const { url } = await getMedicalRecordDownloadUrl(session.clinicId, file.fileId);
      setPreviewUrl(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open file");
    } finally {
      setPreviewLoading(false);
    }
  }

  const isPreviewable = useMemo(() => {
    if (!previewFile?.mimeType) return false;
    return (
      previewFile.mimeType === "application/pdf" ||
      previewFile.mimeType.startsWith("image/") ||
      previewFile.mimeType === "text/plain"
    );
  }, [previewFile?.mimeType]);

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
        <div className="h-8 bg-muted rounded w-1/4 animate-pulse" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-muted rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">My Medical Records</h2>
        <p className="text-muted-foreground mt-1">
          Access your appointments and medical history.
        </p>
      </div>

      {/* My Appointments */}
      <Card>
        <CardHeader className="border-b border-border px-5 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-foreground">My Appointments</CardTitle>
            <Badge variant="outline" className="text-xs">{appointments.length}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          {appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No appointments yet.</p>
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
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatTime(a.time)}</TableCell>
                      <TableCell className="text-sm">{doctorName(doctors, a.doctorId)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.reason || "—"}</TableCell>
                      <TableCell>
                        <Badge className={APPT_STATUS_CLASS[a.status] ?? "bg-muted text-muted-foreground"} variant="outline">
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
        <CardHeader className="border-b border-border px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-full bg-muted text-primary">
                <Folder className="size-4" />
              </span>
              <CardTitle className="text-sm font-semibold text-foreground">My Files & Documents</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">{files.length}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          {folders.length === 0 && files.length === 0 ? (
            <div className="rounded-xl border border-border bg-background p-10 text-center">
              <Folder className="size-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">No files uploaded yet</h3>
              <p className="text-muted-foreground mt-2">
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
                      <Folder className="size-4 text-muted-foreground" />
                      <h4 className="text-sm font-semibold text-foreground">{folder.name}</h4>
                      <span className="text-xs text-muted-foreground">({folderFiles.length})</span>
                    </div>
                    {folderFiles.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                        No files in this folder yet.
                      </p>
                    ) : (
                      <div className="overflow-x-auto border border-border">
                        <Table>
                          <TableBody>
                            {folderFiles.map((f) => (
                              <TableRow key={f.fileId} className="hover:bg-muted/50">
                                <TableCell className="min-w-0">
                                  <div className="flex items-center gap-3">
                                    <FileText className="size-4 shrink-0 text-primary" />
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium text-foreground">{f.fileName}</p>
                                      <p className="text-xs text-muted-foreground">
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
                                    onClick={() => handleOpen(f)}
                                  >
                                    <Eye className="size-4" />
                                    View
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
                    <Folder className="size-4 text-muted-foreground" />
                    <h4 className="text-sm font-semibold text-foreground">Other Documents</h4>
                    <span className="text-xs text-muted-foreground">({orphanFiles.length})</span>
                  </div>
                  <div className="overflow-x-auto border border-border">
                    <Table>
                      <TableBody>
                        {orphanFiles.map((f) => (
                          <TableRow key={f.fileId} className="hover:bg-muted/50">
                            <TableCell className="min-w-0">
                              <div className="flex items-center gap-3">
                                <FileText className="size-4 shrink-0 text-primary" />
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-foreground">{f.fileName}</p>
                                  <p className="text-xs text-muted-foreground">
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
                                onClick={() => handleOpen(f)}
                              >
                                <Eye className="size-4" />
                                View
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
        <CardHeader className="border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-muted text-primary">
              <FileText className="size-4" />
            </span>
            <CardTitle className="text-sm font-semibold text-foreground">Medical Records</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          {records.length === 0 ? (
            <div className="rounded-xl border border-border bg-background p-12 text-center">
              <FileText className="size-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">No medical records yet</h3>
              <p className="text-muted-foreground mt-2">Your medical records will appear here.</p>
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
                        <p className="font-medium text-foreground">Dr. {record.doctorId?.slice(0, 8) || "Unknown"}</p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{record.diagnosis || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{record.symptoms || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{record.treatment || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* File Preview Dialog */}
      <Dialog open={previewFile !== null} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent
          showCloseButton
          className="gap-0 overflow-hidden p-0 max-w-[calc(100%-2rem)] sm:max-w-4xl"
        >
          {previewFile && (
            <>
              {/* Toolbar */}
              <div className="flex items-center gap-3 border-b border-border bg-background px-5 py-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                  <FileText className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-foreground sm:text-base">
                    {previewFile.fileName}
                  </h3>
                  <p className="truncate text-xs text-muted-foreground">
                    Uploaded {formatDate(previewFile.createdAt)} · {formatBytes(previewFile.size)} ·{" "}
                    {previewFile.mimeType ?? "Unknown type"}
                  </p>
                </div>
                {previewUrl && (
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => toast.success("Download started")}
                  >
                    <Button
                      className="gap-1.5 rounded-lg px-3 shadow-sm"
                      size="sm"
                    >
                      <Download className="size-4" />
                      Download
                    </Button>
                  </a>
                )}
              </div>

              {/* Preview body */}
              <div className="h-[70vh] bg-muted/70 sm:h-[72vh]">
                {previewLoading ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
                    <Loader2 className="size-7 animate-spin text-primary" />
                    <p className="text-sm font-medium">Loading preview…</p>
                  </div>
                ) : isPreviewable && previewUrl ? (
                  <iframe
                    src={previewUrl}
                    title={previewFile.fileName}
                    className="size-full border-0 bg-background"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-4 p-10 text-center">
                    <span className="flex size-16 items-center justify-center rounded-2xl bg-background text-muted-foreground shadow-sm ring-1 ring-border">
                      <FileText className="size-8" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Preview not available for this file type
                      </p>
                      <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                        {previewFile.fileName} ({previewFile.mimeType ?? "unknown type"}) can&apos;t be
                        previewed in the browser. Use Download to save it to your device.
                      </p>
                    </div>
                    {previewUrl && (
                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => toast.success("Download started")}
                      >
                        <Button variant="outline" className="gap-1.5">
                          <Download className="size-4" />
                          Download file
                        </Button>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}