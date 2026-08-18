"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  type Report,
  createReport,
  deleteReport,
  listReports,
  updateReport,
} from "@/lib/clinic-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PatientSelect } from "@/components/clinic/pickers";
import { Skeleton } from "@/components/ui/skeleton";
import { sessionCan } from "@/hooks/use-clinic-session";

const REPORT_STATUSES = ["uploaded", "processing", "ready", "failed"];

const STATUS_CLASS: Record<string, string> = {
  uploaded: "bg-blue-100 text-blue-700",
  processing: "bg-amber-100 text-amber-700",
  ready: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

interface ReportFormState {
  patientId: string;
  doctorId: string;
  type: string;
  title: string;
  description: string;
  fileUrl: string;
  mimeType: string;
  status: string;
}

const EMPTY_FORM: ReportFormState = {
  patientId: "",
  doctorId: "",
  type: "",
  title: "",
  description: "",
  fileUrl: "",
  mimeType: "",
  status: "uploaded",
};

export default function ReportsPage() {
  const session = useRequireRole("staff");
  const clinicId = session?.clinicId ?? "";
  const [items, setItems] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Report | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!clinicId) return;
    setLoading(true);
    listReports(clinicId, { limit: 100 })
      .then((res) => setItems(res.items))
      .catch(() => toast.error("Failed to load reports"))
      .finally(() => setLoading(false));
  }, [clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(form: ReportFormState) {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        patientId: form.patientId,
        doctorId: form.doctorId || undefined,
        type: form.type,
        title: form.title,
        description: form.description || null,
        fileUrl: form.fileUrl || null,
        mimeType: form.mimeType || null,
        status: form.status,
      };
      if (editing) {
        await updateReport(clinicId, editing.reportId, payload);
        toast.success("Report updated");
      } else {
        await createReport(clinicId, payload);
        toast.success("Report added");
      }
      setEditing(null);
      setCreating(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save report");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(report: Report) {
    if (!confirm(`Delete report "${report.title}"?`)) return;
    try {
      await deleteReport(clinicId, report.reportId);
      toast.success("Report deleted");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete report");
    }
  }

  const canManage = sessionCan(session, "clinic_admin");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger render={<Button>Add report</Button>} />
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add report</DialogTitle>
              <DialogDescription>
                Register a medical report for a patient.
              </DialogDescription>
            </DialogHeader>
            <ReportForm
              clinicId={clinicId}
              initial={EMPTY_FORM}
              saving={saving}
              onSave={handleSave}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No reports yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((r) => (
                  <TableRow key={r.reportId}>
                    <TableCell className="max-w-48 truncate font-medium">{r.title}</TableCell>
                    <TableCell>{r.type}</TableCell>
                    <TableCell>{r.patientId}</TableCell>
                    <TableCell>{formatDate(r.createdAt)}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_CLASS[r.status] ?? "bg-slate-100 text-slate-600"}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger render={<Button variant="ghost" size="sm">Edit</Button>} />
                        <DialogContent className="max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Edit report</DialogTitle>
                          </DialogHeader>
                          <ReportForm
                            clinicId={clinicId}
                            initial={{
                              patientId: r.patientId,
                              doctorId: r.doctorId ?? "",
                              type: r.type,
                              title: r.title,
                              description: r.description ?? "",
                              fileUrl: r.fileUrl ?? "",
                              mimeType: r.mimeType ?? "",
                              status: r.status,
                            }}
                            saving={saving}
                            onSave={handleSave}
                          />
                        </DialogContent>
                      </Dialog>
                      {canManage && (
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(r)}>
                          Delete
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReportForm({
  clinicId,
  initial,
  saving,
  onSave,
}: {
  clinicId: string;
  initial: ReportFormState;
  saving: boolean;
  onSave: (form: ReportFormState) => Promise<void>;
}) {
  const [form, setForm] = useState<ReportFormState>(initial);
  const set = <K extends keyof ReportFormState>(key: K, value: ReportFormState[K] | null) =>
    setForm((f) => ({ ...f, [key]: (value ?? "") as ReportFormState[K] }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await onSave(form);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3">
        <div className="grid gap-2">
          <Label>Patient</Label>
          <PatientSelect clinicId={clinicId} value={form.patientId} onChange={(v) => set("patientId", v)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Report type</Label>
            <Input value={form.type} onChange={(e) => set("type", e.target.value)} required minLength={2} placeholder="Blood test, X-ray..." />
          </div>
          <div className="grid gap-2">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} required minLength={2} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>File URL</Label>
            <Input value={form.fileUrl} onChange={(e) => set("fileUrl", e.target.value)} placeholder="https://..." />
          </div>
          <div className="grid gap-2">
            <Label>MIME type</Label>
            <Input value={form.mimeType} onChange={(e) => set("mimeType", e.target.value)} placeholder="application/pdf" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Doctor</Label>
            <Input value={form.doctorId} onChange={(e) => set("doctorId", e.target.value)} placeholder="doc_..." />
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Description</Label>
          <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save report"}
        </Button>
      </DialogFooter>
    </form>
  );
}