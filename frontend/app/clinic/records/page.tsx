"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  type MedicalRecord,
  createRecord,
  deleteRecord,
  listRecords,
  updateRecord,
  listPatients,
} from "@/lib/clinic-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Download, Columns, ChevronLeft, ChevronRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import StatsGeneric from "@/components/stats-generic";

const COLUMN_LABELS: Record<string, string> = {
  select: "Select",
  visitDate: "Visit Date",
  patient: "Patient",
  diagnosis: "Diagnosis",
  symptoms: "Symptoms",
  treatment: "Treatment",
};
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

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

interface RecordFormState {
  patientId: string;
  doctorId: string;
  diagnosis: string;
  symptoms: string;
  treatment: string;
  notes: string;
  visitDate: string;
}

const EMPTY_FORM: RecordFormState = {
  patientId: "",
  doctorId: "",
  diagnosis: "",
  symptoms: "",
  treatment: "",
  notes: "",
  visitDate: today(),
};

export default function RecordsPage() {
  const session = useRequireRole("doctor");
  const clinicId = session?.clinicId ?? "";
  const [items, setItems] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<MedicalRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Patient names lookup map
  const [patientLookup, setPatientLookup] = useState<Record<string, string>>({});

  // Search, pagination & selection states
  const [q, setQ] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      const [patientRes, recordRes] = await Promise.all([
        listPatients(clinicId, { limit: 500 }),
        listRecords(clinicId, { limit: 200 }),
      ]);

      const map: Record<string, string> = {};
      patientRes.items.forEach((p) => {
        map[p.patientId] = p.fullName;
      });

      setPatientLookup(map);
      setItems(recordRes.items);
      setCurrentPage(1);
      setSelectedIds(new Set());
    } catch {
      toast.error("Failed to load medical records");
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  // Reset pagination/selection on search
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [q]);

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    select: true,
    visitDate: true,
    patient: true,
    diagnosis: true,
    symptoms: true,
    treatment: true,
  });

  async function handleSave(form: RecordFormState) {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        patientId: form.patientId,
        doctorId: form.doctorId || undefined,
        diagnosis: form.diagnosis,
        symptoms: form.symptoms || null,
        treatment: form.treatment || null,
        notes: form.notes || null,
        visitDate: form.visitDate,
      };
      if (editing) {
        await updateRecord(clinicId, editing.recordId, payload);
        toast.success("Record updated");
      } else {
        await createRecord(clinicId, payload);
        toast.success("Record created");
      }
      setEditing(null);
      setCreating(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save record");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(record: MedicalRecord) {
    const patientName = patientLookup[record.patientId] || record.patientId;
    if (!confirm(`Delete medical record for patient ${patientName}?`)) return;
    try {
      await deleteRecord(clinicId, record.recordId);
      toast.success("Record deleted");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete record");
    }
  }

  const canManage = sessionCan(session, "clinic_admin");

  // Filtering of items locally
  const filteredItems = useMemo(() => {
    if (!q) return items;
    const lower = q.toLowerCase();
    return items.filter((r) => {
      const pName = (patientLookup[r.patientId] || "").toLowerCase();
      return (
        pName.includes(lower) ||
        r.patientId.toLowerCase().includes(lower) ||
        r.diagnosis.toLowerCase().includes(lower) ||
        (r.symptoms && r.symptoms.toLowerCase().includes(lower)) ||
        (r.treatment && r.treatment.toLowerCase().includes(lower))
      );
    });
  }, [items, q, patientLookup]);

  // Stats calculations
  const totalCount = items.length;
  const uniquePatients = new Set(items.map((i) => i.patientId)).size;
  const thisMonthRecords = items.filter((i) => {
    const recordDate = new Date(i.visitDate);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return recordDate >= thirtyDaysAgo;
  }).length;
  const withTreatmentCount = items.filter((i) => i.treatment).length;

  const recordsStats = useMemo(() => [
    {
      name: "Total Records",
      percentage: Math.min(100, Math.round((totalCount / 500) * 100)),
      current: totalCount,
      allowed: 500,
      allowedLabel: "target limit",
      fill: "var(--chart-1)",
    },
    {
      name: "Unique Patients Visited",
      percentage: totalCount ? Math.round((uniquePatients / totalCount) * 100) : 0,
      current: uniquePatients,
      allowed: totalCount,
      allowedLabel: "total patients",
      fill: "var(--chart-2)",
    },
    {
      name: "Recent Visits (30d)",
      percentage: totalCount ? Math.round((thisMonthRecords / totalCount) * 100) : 0,
      current: thisMonthRecords,
      allowed: totalCount,
      allowedLabel: "total records",
      fill: "var(--chart-3)",
    },
    {
      name: "Treatment Coverage",
      percentage: totalCount ? Math.round((withTreatmentCount / totalCount) * 100) : 0,
      current: withTreatmentCount,
      allowed: totalCount,
      allowedLabel: "documented",
      fill: "var(--chart-4)",
    },
  ], [totalCount, uniquePatients, thisMonthRecords, withTreatmentCount]);

  // Bulk actions helper
  const handleBulkExport = () => {
    const selected = items.filter((r) => selectedIds.has(r.recordId));
    const mappedSelected = selected.map((r) => ({
      ...r,
      patientName: patientLookup[r.patientId] || "Unknown",
    }));
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(mappedSelected, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `medical_records_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success(`Exported ${selected.length} medical records to JSON.`);
  };

  // Pagination calculation
  const totalPages = Math.ceil(filteredItems.length / pageSize);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredItems.slice(startIndex, startIndex + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedItems.map((r) => r.recordId)));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Stats Section with action slot */}
      {!loading && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <StatsGeneric
            title="Medical Records"
            description="Real-time insights on diagnoses, symptom records, and treatment coverages."
            items={recordsStats}
            action={
              <Dialog open={creating} onOpenChange={setCreating}>
                <DialogTrigger render={
                  <Button className="flex items-center gap-1.5 shadow-sm">
                    <Plus className="size-4" />
                    New Record
                  </Button>
                } />
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>New medical record</DialogTitle>
                    <DialogDescription>
                      Record a diagnosis, symptoms and treatment for a visit.
                    </DialogDescription>
                  </DialogHeader>
                  <RecordForm
                    clinicId={clinicId}
                    doctorId={session?.doctorId ?? ""}
                    initial={EMPTY_FORM}
                    saving={saving}
                    onSave={handleSave}
                  />
                </DialogContent>
              </Dialog>
            }
          />
        </div>
      )}

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
              onClick={handleBulkExport}
              className="h-8 gap-1.5 shadow-sm"
            >
              <Download className="size-3.5 text-muted-foreground" />
              Export Selected
            </Button>
          </div>
        </div>
      )}

      <Card className="border-border shadow-sm">
        <CardHeader className="border-b border-border bg-muted/20 px-6 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-semibold text-foreground">
                Medical Records Listing
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Search and manage client consultation history, diagnosis reports, and prescribed treatments.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search records..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger render={
                  <Button variant="outline" size="sm" className="h-9 gap-1.5">
                    <Columns className="size-4" />
                    Columns
                  </Button>
                } />
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {Object.keys(COLUMN_LABELS).map((colKey) => (
                    <DropdownMenuCheckboxItem
                      key={colKey}
                      checked={visibleColumns[colKey]}
                      onCheckedChange={(checked) =>
                        setVisibleColumns((prev) => ({ ...prev, [colKey]: !!checked }))
                      }
                    >
                      {COLUMN_LABELS[colKey]}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
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
              No medical records found.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    {visibleColumns.select && (
                      <TableHead className="w-12 pl-6">
                        <Checkbox
                          checked={selectedIds.size === paginatedItems.length && paginatedItems.length > 0}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all"
                        />
                      </TableHead>
                    )}
                    {visibleColumns.visitDate && <TableHead className="font-semibold text-foreground">Visit date</TableHead>}
                    {visibleColumns.patient && <TableHead className="font-semibold text-foreground">Patient</TableHead>}
                    {visibleColumns.diagnosis && <TableHead className="font-semibold text-foreground">Diagnosis</TableHead>}
                    {visibleColumns.symptoms && <TableHead className="font-semibold text-foreground">Symptoms</TableHead>}
                    {visibleColumns.treatment && <TableHead className="font-semibold text-foreground">Treatment</TableHead>}
                    <TableHead className="text-right pr-6 font-semibold text-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((r) => (
                    <TableRow
                      key={r.recordId}
                      className={`hover:bg-muted/30 border-b border-border last:border-0 ${selectedIds.has(r.recordId) ? "bg-muted/30" : ""}`}
                    >
                      {visibleColumns.select && (
                        <TableCell className="pl-6">
                          <Checkbox
                            checked={selectedIds.has(r.recordId)}
                            onCheckedChange={() => toggleSelectRow(r.recordId)}
                            aria-label={`Select record for ${patientLookup[r.patientId] || r.patientId}`}
                          />
                        </TableCell>
                      )}
                      {visibleColumns.visitDate && <TableCell className="text-muted-foreground">{formatDate(r.visitDate)}</TableCell>}
                      {visibleColumns.patient && (
                        <TableCell className="font-medium text-foreground">
                          {patientLookup[r.patientId] || r.patientId}
                        </TableCell>
                      )}
                      {visibleColumns.diagnosis && <TableCell className="max-w-48 truncate font-medium text-foreground">{r.diagnosis}</TableCell>}
                      {visibleColumns.symptoms && <TableCell className="max-w-40 truncate text-muted-foreground">{r.symptoms ?? "—"}</TableCell>}
                      {visibleColumns.treatment && <TableCell className="max-w-40 truncate text-muted-foreground">{r.treatment ?? "—"}</TableCell>}
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-2">
                          <Dialog>
                            <DialogTrigger render={<Button variant="ghost" size="sm">Edit</Button>} />
                            <DialogContent className="max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Edit Medical Record</DialogTitle>
                              </DialogHeader>
                              <RecordForm
                                clinicId={clinicId}
                                doctorId={session?.doctorId ?? ""}
                                initial={{
                                  patientId: r.patientId,
                                  doctorId: r.doctorId,
                                  diagnosis: r.diagnosis,
                                  symptoms: r.symptoms ?? "",
                                  treatment: r.treatment ?? "",
                                  notes: r.notes ?? "",
                                  visitDate: r.visitDate,
                                }}
                                saving={saving}
                                onSave={handleSave}
                              />
                            </DialogContent>
                          </Dialog>
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(r)}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-muted/10">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Showing <span className="font-medium">{filteredItems.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to{" "}
                      <span className="font-medium">
                        {Math.min(currentPage * pageSize, filteredItems.length)}
                      </span>{" "}
                      of <span className="font-medium">{filteredItems.length}</span> results
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="size-4 mr-1" />
                      Previous
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="size-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RecordForm({
  clinicId,
  doctorId,
  initial,
  saving,
  onSave,
}: {
  clinicId: string;
  doctorId: string;
  initial: RecordFormState;
  saving: boolean;
  onSave: (form: RecordFormState) => Promise<void>;
}) {
  const [form, setForm] = useState<RecordFormState>({
    ...initial,
    doctorId: initial.doctorId || doctorId,
  });
  const set = <K extends keyof RecordFormState>(key: K, value: RecordFormState[K] | null) =>
    setForm((f) => ({ ...f, [key]: (value ?? "") as RecordFormState[K] }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await onSave(form);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Patient</Label>
            <PatientSelect clinicId={clinicId} value={form.patientId} onChange={(v) => set("patientId", v)} required />
          </div>
          <div className="grid gap-2">
            <Label>Visit date</Label>
            <Input type="date" value={form.visitDate} onChange={(e) => set("visitDate", e.target.value)} required />
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Diagnosis</Label>
          <Textarea value={form.diagnosis} onChange={(e) => set("diagnosis", e.target.value)} required rows={2} />
        </div>
        <div className="grid gap-2">
          <Label>Symptoms</Label>
          <Textarea value={form.symptoms} onChange={(e) => set("symptoms", e.target.value)} rows={2} />
        </div>
        <div className="grid gap-2">
          <Label>Treatment</Label>
          <Textarea value={form.treatment} onChange={(e) => set("treatment", e.target.value)} rows={2} />
        </div>
        <div className="grid gap-2">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save record"}
        </Button>
      </DialogFooter>
    </form>
  );
}