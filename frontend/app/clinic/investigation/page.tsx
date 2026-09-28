"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";

// Load odontogram + its CSS only when a chart screen opens — keeps the list
// view light and avoids CSS leaking into the clinic sidebar.
const OdontogramShell = dynamic(
  () => import("./odontogram-lazy").then((m) => m.OdontogramShell),
  { ssr: false, loading: () => <div className="h-[420px] animate-pulse rounded-xl bg-muted/40" /> }
);

async function odontogramApi() {
  return import("./odontogram-lazy");
}
import { useRequireRole, sessionCan } from "@/hooks/use-clinic-session";
import {
  type Investigation,
  type InvestigationStatus,
  type MedicineRecord,
  createInvestigation,
  deleteInvestigation,
  getInvestigation,
  listInvestigations,
  listRecords,
  updateInvestigation,
} from "@/lib/clinic-api";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { formatDate } from "@/lib/format-time";
import { todayISO } from "@/lib/datetime";
import {
  ArrowLeft,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Search,
  Stethoscope,
  Trash,
} from "lucide-react";

const STATUS_OPTIONS: { value: InvestigationStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_BADGE: Record<InvestigationStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  "in-progress": "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-slate-100 text-slate-600",
};

type Screen =
  | { name: "table" }
  | { name: "form"; mode: "create" }
  | { name: "form"; mode: "edit"; record: Investigation }
  | { name: "form"; mode: "view"; record: Investigation };

interface FormState {
  patientId: string;
  title: string;
  visitDate: string;
  status: InvestigationStatus;
  notes: string;
  medicalRecordId: string;
}

function emptyForm(): FormState {
  return {
    patientId: "",
    title: "",
    visitDate: todayISO(),
    status: "pending",
    notes: "",
    medicalRecordId: "",
  };
}

export default function InvestigationPage() {
  const session = useRequireRole("patient");
  const clinicId = session?.clinicId ?? "";
  const canManage = sessionCan(session, "doctor");
  const canDelete = sessionCan(session, "clinic_admin");

  const [screen, setScreen] = useState<Screen>({ name: "table" });
  const [items, setItems] = useState<Investigation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [form, setForm] = useState<FormState>(emptyForm());
  const [records, setRecords] = useState<MedicineRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Investigation | null>(null);
  // Row-level pending id for view/edit opens (list rows carry no chartData —
  // the full record is fetched on demand).
  const [pendingRowId, setPendingRowId] = useState<string | null>(null);
  // True while a charted record's chart is being fetched/hydrated.
  const [chartLoading, setChartLoading] = useState(false);

  // Remount the odontogram shell per opened record so every form starts from
  // a clean chart (the provider inits on mount / destroys on unmount).
  const shellKey =
    screen.name === "form"
      ? screen.mode === "create"
        ? "new"
        : screen.record.investigationId
      : "none";
  const chartData =
    screen.name === "form" && screen.mode !== "create"
      ? screen.record.chartData
      : null;
  const readOnly = screen.name === "form" && screen.mode === "view";

  const load = useCallback(() => {
    if (!clinicId) return;
    setLoading(true);
    listInvestigations(clinicId, { limit: 100 })
      .then((res) => {
        setItems(res.items ?? []);
        setTotal(res.total ?? 0);
      })
      .catch((e) =>
        toast.error(e instanceof Error ? e.message : "Failed to load investigations")
      )
      .finally(() => setLoading(false));
  }, [clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  // Load the selected patient's medical records for the link picker
  // (medical record connection).
  useEffect(() => {
    if (screen.name !== "form" || screen.mode === "view" || !clinicId) return;
    const patientId =
      screen.mode === "create" ? form.patientId : screen.record.patientId;
    if (!patientId) {
      setRecords([]);
      return;
    }
    setRecordsLoading(true);
    listRecords(clinicId, { patientId, limit: 50 })
      .then((res) => setRecords(res.items ?? []))
      .catch(() => setRecords([]))
      .finally(() => setRecordsLoading(false));
  }, [screen, form.patientId, clinicId]);

  // Hydrate a saved chart into the freshly mounted shell. The grid builds
  // asynchronously, so observe for it instead of polling — the chart imports
  // the moment the grid appears (with a 5s safety timeout).
  useEffect(() => {
    if (screen.name !== "form" || !chartData) return;
    let cancelled = false;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      if (!cancelled) setChartLoading(false);
    };
    const observer = new MutationObserver(() => {
      if (tryImport()) observer.disconnect();
    });
    const tryImport = () => {
      const grid = document.getElementById("toothGrid");
      if (grid && grid.childElementCount > 0) {
        observer.disconnect();
        void odontogramApi()
          .then(({ importStatus }) => {
            if (cancelled) return;
            try {
              importStatus(chartData as Record<string, unknown>);
            } catch (e) {
              toast.error(
                e instanceof Error ? e.message : "Failed to load saved chart"
              );
            } finally {
              finish();
            }
          })
          .catch((e) => {
            if (!cancelled) {
              toast.error(
                e instanceof Error ? e.message : "Failed to load saved chart"
              );
            }
            finish();
          });
        return true;
      }
      return false;
    };
    setChartLoading(true);
    if (!tryImport()) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
    const timer = setTimeout(() => {
      observer.disconnect();
      finish();
    }, 5000);
    return () => {
      cancelled = true;
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [screen, shellKey, chartData]);

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!term) return true;
      return (
        item.title.toLowerCase().includes(term) ||
        item.patientName.toLowerCase().includes(term) ||
        (item.notes ?? "").toLowerCase().includes(term)
      );
    });
  }, [items, searchTerm, statusFilter]);

  function openCreate() {
    setForm(emptyForm());
    setPendingRowId(null);
    setChartLoading(false);
    setScreen({ name: "form", mode: "create" });
  }

  function openEdit(record: Investigation) {
    // List rows omit chartData for speed — fetch the full record first so the
    // chart is intact when the editor opens.
    setPendingRowId(record.investigationId);
    getInvestigation(clinicId, record.investigationId)
      .then((full) => {
        setForm({
          patientId: full.patientId,
          title: full.title,
          visitDate: full.visitDate,
          status: full.status,
          notes: full.notes ?? "",
          medicalRecordId: full.medicalRecordId ?? "",
        });
        setScreen({ name: "form", mode: "edit", record: full });
      })
      .catch((e) =>
        toast.error(e instanceof Error ? e.message : "Failed to open investigation")
      )
      .finally(() => setPendingRowId(null));
  }

  function openView(record: Investigation) {
    // Open instantly with the row data, then fetch the full record (with
    // chartData) in the background — the chart hydrates when it arrives.
    const hasChart = record.hasChart ?? record.chartData != null;
    setChartLoading(hasChart && record.chartData == null);
    setScreen({ name: "form", mode: "view", record });
    if (record.chartData != null) return;
    if (!hasChart) {
      setChartLoading(false);
      return;
    }
    getInvestigation(clinicId, record.investigationId)
      .then((full) => {
        setScreen((prev) =>
          prev.name === "form" &&
          prev.mode === "view" &&
          prev.record.investigationId === record.investigationId
            ? { name: "form", mode: "view", record: full }
            : prev
        );
      })
      .catch(() => setChartLoading(false));
  }

  async function handleSave() {
    if (screen.name !== "form" || screen.mode === "view") return;
    if (!form.patientId) {
      toast.error("Please select a patient");
      return;
    }
    if (form.title.trim().length < 2) {
      toast.error("Please enter a title");
      return;
    }
    setSaving(true);
    try {
      let chartData: Record<string, unknown> | null = null;
      try {
        const { getStatusChart } = await odontogramApi();
        const chart = getStatusChart() as unknown;
        if (chart && typeof chart === "object") {
          chartData = chart as Record<string, unknown>;
        }
      } catch {
        chartData = null;
      }
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        visitDate: form.visitDate,
        status: form.status,
        notes: form.notes.trim() || null,
        medicalRecordId: form.medicalRecordId || null,
        chartData,
      };
      if (screen.mode === "create") {
        payload.patientId = form.patientId;
        await createInvestigation(clinicId, payload);
        toast.success("Investigation created successfully");
      } else {
        await updateInvestigation(clinicId, screen.record.investigationId, payload);
        toast.success("Investigation updated successfully");
      }
      setScreen({ name: "table" });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save investigation");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteInvestigation(clinicId, deleteTarget.investigationId);
      toast.success("Investigation deleted successfully");
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete investigation");
    }
  }

  if (screen.name === "form") {
    const mode = screen.mode;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setScreen({ name: "table" })}
          >
            <ArrowLeft className="size-4" />
            Back to investigations
          </Button>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {mode === "create"
              ? "New Investigation"
              : mode === "edit"
                ? "Edit Investigation"
                : "View Investigation"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === "view"
              ? "Read-only investigation record with the charted odontogram."
              : "Select the patient, fill in the details and chart the odontogram."}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Patient</Label>
              {mode === "create" ? (
                <PatientSelect
                  clinicId={clinicId}
                  value={form.patientId || null}
                  onChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      patientId: v ?? "",
                      medicalRecordId: "",
                    }))
                  }
                  required
                />
              ) : (
                <Input
                  value={screen.record.patientName}
                  disabled
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-title">Title</Label>
              <Input
                id="inv-title"
                value={mode === "view" ? screen.record.title : form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="e.g. Root canal assessment — 46"
                disabled={mode === "view"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-date">Visit date</Label>
              <Input
                id="inv-date"
                type="date"
                value={mode === "view" ? screen.record.visitDate : form.visitDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, visitDate: e.target.value }))
                }
                disabled={mode === "view"}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              {mode === "view" ? (
                <div>
                  <Badge className={STATUS_BADGE[screen.record.status]}>
                    {screen.record.status}
                  </Badge>
                </div>
              ) : (
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      status: v as InvestigationStatus,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Linked medical record (optional)</Label>
              {mode === "view" ? (
                <Input
                  value={screen.record.medicalRecordId ?? "Not linked"}
                  disabled
                />
              ) : (
                <Select
                  value={form.medicalRecordId || "__none"}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      medicalRecordId: !v || v === "__none" ? "" : v,
                    }))
                  }
                  disabled={
                    recordsLoading ||
                    (!form.patientId && mode === "create")
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        mode === "create" && !form.patientId
                          ? "Select a patient first"
                          : recordsLoading
                            ? "Loading records…"
                            : "No linked record"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">No linked record</SelectItem>
                    {records.map((r) => (
                      <SelectItem key={r.recordId} value={r.recordId}>
                        {r.visitDate} — {r.diagnosis}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="inv-notes">Notes</Label>
              <Textarea
                id="inv-notes"
                value={mode === "view" ? (screen.record.notes ?? "") : form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Clinical notes for this investigation…"
                disabled={mode === "view"}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Dental odontogram
              {chartLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="isolate overflow-auto rounded-xl border bg-white">
              <OdontogramShell
                key={shellKey}
                language="en"
                readOnly={readOnly}
              />
            </div>
            {!chartData && !chartLoading && mode === "view" && (
              <p className="pt-2 text-sm text-muted-foreground">
                No chart was recorded for this investigation.
              </p>
            )}
          </CardContent>
        </Card>

        {mode !== "view" && (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setScreen({ name: "table" })}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {mode === "create" ? "Save investigation" : "Save changes"}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Investigations</h1>
          <p className="text-sm text-muted-foreground">
            Dental investigations with odontogram charting
            {total > 0 ? ` — ${total} total` : ""}.
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            New Investigation
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by title, patient or notes…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v ?? "all")}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
              <Stethoscope className="size-8 text-muted-foreground" />
              <p className="font-medium">No investigations found</p>
              <p className="text-sm text-muted-foreground">
                {canManage
                  ? "Click “New Investigation” to chart the first one."
                  : "Investigations created for you will appear here."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Chart</TableHead>
                    <TableHead>Medical record</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.investigationId}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(item.visitDate)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.patientName}
                      </TableCell>
                      <TableCell className="max-w-56 truncate">
                        {item.title}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_BADGE[item.status]}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(item.hasChart ?? item.chartData != null) ? (
                          <Badge variant="outline">Charted</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.medicalRecordId ? (
                          <Badge variant="outline">Linked</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="View"
                            onClick={() => openView(item)}
                            disabled={pendingRowId === item.investigationId}
                          >
                            {pendingRowId === item.investigationId ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                          </Button>
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Edit"
                              onClick={() => openEdit(item)}
                              disabled={pendingRowId === item.investigationId}
                            >
                              {pendingRowId === item.investigationId ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Pencil className="size-4" />
                              )}
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Delete"
                              onClick={() => setDeleteTarget(item)}
                            >
                              <Trash className="size-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete investigation?"
        description={
          deleteTarget
            ? `“${deleteTarget.title}” for ${deleteTarget.patientName} will be permanently removed.`
            : undefined
        }
        onConfirm={handleDelete}
      />
    </div>
  );
}
