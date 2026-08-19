"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import { useDropdownOptions } from "@/lib/dropdown-options";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import {
  type Report,
  type Patient,
  createReport,
  deleteReport,
  listReports,
  listPatients,
  updateReport,
} from "@/lib/clinic-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { DoctorSelect, PatientSelect } from "@/components/clinic/pickers";
import {
  AttachmentUploader,
  makeAttachmentFile,
  type AttachmentFile,
} from "@/components/clinic/attachment-uploader";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { sessionCan } from "@/hooks/use-clinic-session";
import {
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  Search,
  Plus,
  Download,
  ChevronLeft,
  ChevronRight,
  Trash,
} from "lucide-react";

const REPORT_STATUSES = ["uploaded", "processing", "ready", "failed"];


const STATUS_CLASS: Record<string, string> = {
  uploaded: "bg-blue-50 text-blue-700 border-blue-200",
  processing: "bg-amber-50 text-amber-700 border-amber-200",
  ready: "bg-green-50 text-green-700 border-green-200",
  failed: "bg-red-50 text-red-700 border-red-200",
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
  const session = useRequireRole("doctor");
  const clinicId = session?.clinicId ?? "";
  const { getOptions } = useDropdownOptions(clinicId);
  const reportTypes = getOptions("report_types");
  const isDoctor = session?.role === "doctor";

  // Core States
  const [items, setItems] = useState<Report[]>([]);
  const [patientLookup, setPatientLookup] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Report | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Report | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Table options (sorting, filtering, selection, visibility, pagination)
  const [sortField, setSortField] = useState<"createdAt" | null>("createdAt");
  const [sortDesc, setSortDesc] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleColumns] = useState<Record<string, boolean>>({
    select: true,
    title: true,
    type: true,
    patient: true,
    createdAt: true,
    status: true,
  });

  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 10;

  const load = useCallback(() => {
    if (!clinicId) return;
    Promise.all([
      listReports(clinicId, { limit: 500 }),
      listPatients(clinicId, { limit: 500 }),
    ])
      .then(([reportsRes, patientsRes]) => {
        const map: Record<string, string> = {};
        patientsRes.items.forEach((p) => {
          map[p.patientId] = p.fullName;
        });
        setPatientLookup(map);
        setItems(reportsRes.items);
        setSelectedIds(new Set());
        setPageIndex(0);
      })
      .catch(() => {
        toast.error("Failed to load reports");
      })
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
    try {
      await deleteReport(clinicId, report.reportId);
      toast.success("Report deleted");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete report");
    }
  }

  // Row Selection logic
  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(paginatedItems.map((r) => r.reportId));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelectRow = (reportId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(reportId);
      } else {
        next.delete(reportId);
      }
      return next;
    });
  };

  // Bulk actions
  const handleBulkExport = () => {
    const selectedRows = items.filter((r) => selectedIds.has(r.reportId));
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selectedRows, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `reports_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success(`Exported ${selectedIds.size} reports.`);
  };

  // Filtering & Search
  const filteredItems = useMemo(() => {
    return items.filter((r) => {
      const patientName = patientLookup[r.patientId]?.toLowerCase() ?? "";
      const title = r.title.toLowerCase();
      const type = r.type.toLowerCase();
      const term = searchTerm.toLowerCase();

      // Apply statusFilter if not 'all'
      if (statusFilter !== "all" && r.status !== statusFilter) return false;

      return (
        patientName.includes(term) ||
        title.includes(term) ||
        type.includes(term)
      );
    });
  }, [items, searchTerm, statusFilter, patientLookup]);

  // Sorting
  const sortedItems = useMemo(() => {
    if (!sortField) return filteredItems;

    return [...filteredItems].sort((a, b) => {
      let valA: string = a[sortField] || "";
      let valB: string = b[sortField] || "";

      if (sortField === "createdAt") {
        valA = a.createdAt;
        valB = b.createdAt;
      }

      if (sortDesc) {
        return valB.localeCompare(valA);
      }
      return valA.localeCompare(valB);
    });
  }, [filteredItems, sortField, sortDesc]);

  // Pagination
  const paginatedItems = useMemo(() => {
    const start = pageIndex * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, pageIndex]);

  const pageCount = Math.ceil(sortedItems.length / pageSize);
  const canManage = sessionCan(session, "clinic_admin");

  const toggleSort = (field: "createdAt") => {
    if (sortField === field) {
      setSortDesc(!sortDesc);
    } else {
      setSortField(field);
      setSortDesc(true);
    }
  };

  if (creating) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreating(false)}
            className="h-9 gap-1.5"
          >
            <ChevronLeft className="size-4" />
            Back to Reports
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Add Report</h1>
            <p className="text-sm text-muted-foreground">Register a medical report for a patient.</p>
          </div>
        </div>
        <Card className="border-border shadow-sm max-w-2xl">
          <CardHeader className="border-b border-border bg-muted/20 px-6 py-4">
            <CardTitle className="text-lg font-semibold">Report Information</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ReportForm
              clinicId={clinicId}
              initial={EMPTY_FORM}
              saving={saving}
              onSave={async (form) => {
                await handleSave(form);
                setCreating(false);
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(null)}
            className="h-9 gap-1.5"
          >
            <ChevronLeft className="size-4" />
            Back to Reports
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Edit Report</h1>
            <p className="text-sm text-muted-foreground">Modify report metadata or file attachment information.</p>
          </div>
        </div>
        <Card className="border-border shadow-sm max-w-2xl">
          <CardHeader className="border-b border-border bg-muted/20 px-6 py-4">
            <CardTitle className="text-lg font-semibold">Report Information</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ReportForm
              clinicId={clinicId}
              initial={{
                patientId: editing.patientId,
                doctorId: editing.doctorId ?? "",
                type: editing.type,
                title: editing.title,
                description: editing.description ?? "",
                fileUrl: editing.fileUrl ?? "",
                mimeType: editing.mimeType ?? "",
                status: editing.status,
              }}
              saving={saving}
              onSave={async (form) => {
                await handleSave(form);
                setEditing(null);
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div>
          <h2 className="text-balance font-medium text-foreground text-xl">Reports Dashboard</h2>
          <p className="mt-1 text-pretty text-muted-foreground text-sm leading-6">
            View digital medical records, diagnostics, and lab report attachments.
            {isDoctor && " Only reports for your own patients are shown."}
          </p>
        </div>
        {!isDoctor && (
          <Button className="flex items-center gap-1.5 shadow-sm shrink-0" onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            Add Report
          </Button>
        )}
      </div>

      {/* Bulk actions bar if selected */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 shadow-sm transition-all animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-primary tabular-nums">
              {selectedIds.size} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-muted-foreground hover:text-foreground text-xs"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear selection
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 shadow-sm"
              onClick={handleBulkExport}
            >
              <Download className="size-3.5 text-muted-foreground" />
              Export Selected
            </Button>
          </div>
        </div>
      )}

      {/* Main card containing listing */}
      <Card className="border-border shadow-sm">
        <CardHeader className="border-b border-border bg-muted/20 px-6 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-semibold text-foreground">
                Reports Listing
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Search and manage lab test results and clinical document uploads.
              </p>
            </div>
            <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:w-auto">
              <div className="relative mx-auto w-full max-w-md sm:w-72">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPageIndex(0);
                  }}
                  className="h-9 w-full pl-9"
                />
              </div>

              {/* Status Filter */}
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v ?? "all");
                  setPageIndex(0);
                }}
              >
                <SelectTrigger className="h-9 w-36">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {REPORT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No reports found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                  {visibleColumns.select && (
                    <TableHead className="w-12 pl-6">
                      <Checkbox
                        checked={
                          paginatedItems.length > 0 &&
                          paginatedItems.every((r) => selectedIds.has(r.reportId))
                        }
                        onCheckedChange={(checked) => handleToggleSelectAll(!!checked)}
                      />
                    </TableHead>
                  )}
                  {visibleColumns.title && (
                    <TableHead>Title</TableHead>
                  )}
                  {visibleColumns.type && (
                    <TableHead>Type</TableHead>
                  )}
                  {visibleColumns.patient && (
                    <TableHead>Patient</TableHead>
                  )}
                  {visibleColumns.createdAt && (
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("createdAt")}>
                      <div className="flex items-center gap-1">
                        Date
                        {sortField === "createdAt" ? (
                          sortDesc ? <ArrowDown className="size-3.5" /> : <ArrowUp className="size-3.5" />
                        ) : (
                          <ChevronsUpDown className="size-3.5 text-muted-foreground" />
                        )}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.status && (
                    <TableHead>Status</TableHead>
                  )}
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((r) => (
                  <TableRow key={r.reportId} className={selectedIds.has(r.reportId) ? "bg-muted/30" : ""}>
                    {visibleColumns.select && (
                      <TableCell className="pl-6">
                        <Checkbox
                          checked={selectedIds.has(r.reportId)}
                          onCheckedChange={(checked) => handleToggleSelectRow(r.reportId, !!checked)}
                        />
                      </TableCell>
                    )}
                    {visibleColumns.title && (
                      <TableCell className="max-w-48 truncate font-medium text-foreground">{r.title}</TableCell>
                    )}
                    {visibleColumns.type && (
                      <TableCell className="text-muted-foreground">{r.type}</TableCell>
                    )}
                    {visibleColumns.patient && (
                      <TableCell className="text-muted-foreground font-medium">
                        {patientLookup[r.patientId] || r.patientId}
                      </TableCell>
                    )}
                    {visibleColumns.createdAt && (
                      <TableCell className="text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
                    )}
                    {visibleColumns.status && (
                      <TableCell>
                        <Badge variant="outline" className={STATUS_CLASS[r.status] ?? "bg-slate-100 text-slate-600"}>
                          {r.status}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell className="text-right pr-6 whitespace-nowrap">
                      {!isDoctor && (
                        <Button variant="ghost" size="sm" className="h-8" onClick={() => setEditing(r)}>Edit</Button>
                      )}
                      {canManage && (
                        <Button variant="ghost" size="sm" className="h-8 text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(r)}>
                          Delete
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination Footer */}
          {!loading && sortedItems.length > 0 && (
            <Pagination
              page={pageIndex + 1}
              pageSize={pageSize}
              totalItems={sortedItems.length}
              onPageChange={(p) => setPageIndex(Math.max(0, Math.min(p - 1, pageCount - 1)))}
              itemLabel="results"
            />
          )}
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`Delete report "${deleteTarget?.title ?? ""}"?`}
        description="This will permanently delete the report and its file. This action cannot be undone."
        onConfirm={async () => {
          if (deleteTarget) await handleDelete(deleteTarget);
          setDeleteTarget(null);
        }}
      />
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
  const { getOptions } = useDropdownOptions(clinicId);
  const reportTypes = getOptions("report_types");
  const [attachment, setAttachment] = useState<AttachmentFile[]>(() =>
    initial.fileUrl
      ? [
          makeAttachmentFile(null, {
            name: initial.fileUrl.split("/").pop() ?? initial.fileUrl,
            url: initial.fileUrl,
            mimeType: initial.mimeType || null,
          }),
        ]
      : []
  );
  const set = <K extends keyof ReportFormState>(key: K, value: ReportFormState[K] | null) =>
    setForm((f) => ({ ...f, [key]: (value ?? "") as ReportFormState[K] }));

  function handleAttachmentChange(files: AttachmentFile[]) {
    setAttachment(files);
    const first = files[0];
    set("fileUrl", first?.url ?? "");
    set("mimeType", first?.file?.type ?? first?.mimeType ?? "");
  }

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
            <Select value={form.type} onValueChange={(v) => set("type", v)} required>
              <SelectTrigger>
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                {reportTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} required minLength={2} />
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Attachment</Label>
          <AttachmentUploader
            files={attachment}
            onChange={handleAttachmentChange}
            maxFiles={1}
            allowUrl
            allowDescription={false}
            description="Attach the report file (PDF, PNG, JPG up to 25 MB) or paste its URL."
          />
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
            <DoctorSelect clinicId={clinicId} value={form.doctorId || null} onChange={(v) => set("doctorId", v)} allowEmpty />
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