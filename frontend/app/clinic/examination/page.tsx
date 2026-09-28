"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useRequireRole, sessionCan } from "@/hooks/use-clinic-session";
import {
  type Examination,
  type ExaminationStatus,
  createExamination,
  deleteExamination,
  listExaminations,
  updateExamination,
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

const STATUS_OPTIONS: { value: ExaminationStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_BADGE: Record<ExaminationStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  "in-progress": "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-slate-100 text-slate-600",
};

type Screen =
  | { name: "table" }
  | { name: "form"; mode: "create" }
  | { name: "form"; mode: "edit"; record: Examination }
  | { name: "form"; mode: "view"; record: Examination };

interface FormState {
  patientId: string;
  visitDate: string;
  status: ExaminationStatus;
  oralFindings: string;
  notes: string;
}

function emptyForm(): FormState {
  return {
    patientId: "",
    visitDate: todayISO(),
    status: "pending",
    oralFindings: "",
    notes: "",
  };
}

export default function ExaminationPage() {
  const session = useRequireRole("patient");
  const clinicId = session?.clinicId ?? "";
  const canManage = sessionCan(session, "doctor");
  const canDelete = sessionCan(session, "clinic_admin");

  const [screen, setScreen] = useState<Screen>({ name: "table" });
  const [items, setItems] = useState<Examination[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Examination | null>(null);

  const load = useCallback(() => {
    if (!clinicId) return;
    setLoading(true);
    listExaminations(clinicId, { limit: 100 })
      .then((res) => {
        setItems(res.items ?? []);
        setTotal(res.total ?? 0);
      })
      .catch((e) =>
        toast.error(e instanceof Error ? e.message : "Failed to load examinations")
      )
      .finally(() => setLoading(false));
  }, [clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!term) return true;
      return (
        item.patientName.toLowerCase().includes(term) ||
        item.oralFindings.toLowerCase().includes(term) ||
        (item.notes ?? "").toLowerCase().includes(term)
      );
    });
  }, [items, searchTerm, statusFilter]);

  function openCreate() {
    setForm(emptyForm());
    setScreen({ name: "form", mode: "create" });
  }

  function openEdit(record: Examination) {
    setForm({
      patientId: record.patientId,
      visitDate: record.visitDate,
      status: record.status,
      oralFindings: record.oralFindings,
      notes: record.notes ?? "",
    });
    setScreen({ name: "form", mode: "edit", record });
  }

  function openView(record: Examination) {
    setScreen({ name: "form", mode: "view", record });
  }

  async function handleSave() {
    if (screen.name !== "form" || screen.mode === "view") return;
    if (!form.patientId) {
      toast.error("Please select a patient");
      return;
    }
    if (form.oralFindings.trim().length < 2) {
      toast.error("Please enter the oral findings");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        visitDate: form.visitDate,
        status: form.status,
        oralFindings: form.oralFindings.trim(),
        notes: form.notes.trim() || null,
      };
      if (screen.mode === "create") {
        payload.patientId = form.patientId;
        await createExamination(clinicId, payload);
        toast.success("Examination created successfully");
      } else {
        await updateExamination(clinicId, screen.record.examinationId, payload);
        toast.success("Examination updated successfully");
      }
      setScreen({ name: "table" });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save examination");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteExamination(clinicId, deleteTarget.examinationId);
      toast.success("Examination deleted successfully");
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete examination");
    }
  }

  if (screen.name === "form") {
    const mode = screen.mode;
    const readOnly = mode === "view";
    const patientName =
      mode === "create" ? "" : screen.record.patientName;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setScreen({ name: "table" })}
          >
            <ArrowLeft className="size-4" />
            Back to examinations
          </Button>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {mode === "create"
              ? "New Examination"
              : mode === "edit"
                ? "Edit Examination"
                : "View Examination"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === "view"
              ? "Read-only examination record."
              : "Select the patient and record the oral findings."}
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
                    setForm((f) => ({ ...f, patientId: v ?? "" }))
                  }
                  required
                />
              ) : (
                <Input value={patientName} disabled />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="exam-date">Visit date</Label>
              <Input
                id="exam-date"
                type="date"
                value={mode === "view" ? screen.record.visitDate : form.visitDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, visitDate: e.target.value }))
                }
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              {readOnly ? (
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
                      status: v as ExaminationStatus,
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
              <Label htmlFor="exam-oral">Oral findings</Label>
              <Textarea
                id="exam-oral"
                value={readOnly ? (screen.record.oralFindings ?? "") : form.oralFindings}
                onChange={(e) =>
                  setForm((f) => ({ ...f, oralFindings: e.target.value }))
                }
                placeholder="Describe the oral examination findings…"
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="exam-notes">Notes</Label>
              <Textarea
                id="exam-notes"
                value={readOnly ? (screen.record.notes ?? "") : form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Additional notes for this examination…"
                disabled={readOnly}
              />
            </div>
          </CardContent>
        </Card>

        {mode !== "view" && (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setScreen({ name: "table" })}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {mode === "create" ? "Save examination" : "Save changes"}
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
          <h1 className="text-2xl font-bold tracking-tight">Examinations</h1>
          <p className="text-sm text-muted-foreground">
            Clinical examinations with oral findings
            {total > 0 ? ` — ${total} total` : ""}.
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            New Examination
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by patient, findings or notes…"
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
              <p className="font-medium">No examinations found</p>
              <p className="text-sm text-muted-foreground">
                {canManage
                  ? "Click “New Examination” to record the first one."
                  : "Examinations created for you will appear here."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Oral findings</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.examinationId}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(item.visitDate)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.patientName}
                      </TableCell>
                      <TableCell className="max-w-56 truncate">
                        {item.oralFindings}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_BADGE[item.status]}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="View"
                            onClick={() => openView(item)}
                          >
                            <Eye className="size-4" />
                          </Button>
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Edit"
                              onClick={() => openEdit(item)}
                            >
                              <Pencil className="size-4" />
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
        title="Delete examination?"
        description={
          deleteTarget
            ? `The examination for ${deleteTarget.patientName} will be permanently removed.`
            : undefined
        }
        onConfirm={handleDelete}
      />
    </div>
  );
}
