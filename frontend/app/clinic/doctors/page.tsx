"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  type Doctor,
  createDoctor,
  deleteDoctor,
  listDoctors,
  updateDoctor,
} from "@/lib/clinic-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Download, Trash } from "lucide-react";
import StatsGeneric from "@/components/stats-generic";
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
import { Skeleton } from "@/components/ui/skeleton";
import { formatTime } from "@/lib/format-time";
import { sessionCan } from "@/hooks/use-clinic-session";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface ScheduleEntry {
  day: string;
  start: string;
  end: string;
}

interface DoctorFormState {
  name: string;
  specialization: string;
  licenseNo: string;
  qualification: string;
  phone: string;
  email: string;
  fee: string;
  status: string;
  schedule: ScheduleEntry[];
}

const EMPTY_FORM: DoctorFormState = {
  name: "",
  specialization: "",
  licenseNo: "",
  qualification: "",
  phone: "",
  email: "",
  fee: "",
  status: "active",
  schedule: [{ day: "Mon", start: "09:00", end: "17:00" }],
};

export default function DoctorsPage() {
  const session = useRequireRole("doctor");
  const clinicId = session?.clinicId ?? "";
  const [items, setItems] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Doctor | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Search, pagination & selection states
  const [q, setQ] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    if (!clinicId) return;
    setLoading(true);
    listDoctors(clinicId, { limit: 100 })
      .then((res) => {
        setItems(res.items);
        setCurrentPage(1);
        setSelectedIds(new Set());
      })
      .catch(() => toast.error("Failed to load doctors"))
      .finally(() => setLoading(false));
  }, [clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  // Reset page/selection on search
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [q]);

  async function handleSave(form: DoctorFormState) {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        specialization: form.specialization,
        licenseNo: form.licenseNo || null,
        qualification: form.qualification || null,
        phone: form.phone || null,
        email: form.email || null,
        fee: form.fee ? Number(form.fee) : null,
        status: form.status,
        schedule: form.schedule.filter(
          (s) => s.day && s.start && s.end && s.end > s.start
        ),
      };
      if (editing) {
        await updateDoctor(clinicId, editing.doctorId, payload);
        toast.success("Doctor updated");
      } else {
        await createDoctor(clinicId, payload);
        toast.success("Doctor added");
      }
      setEditing(null);
      setCreating(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save doctor");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(doctor: Doctor) {
    if (!confirm(`Delete doctor ${doctor.name}?`)) return;
    try {
      await deleteDoctor(clinicId, doctor.doctorId);
      toast.success("Doctor deleted");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete doctor");
    }
  }

  const canManage = sessionCan(session, "clinic_admin");

  // Filtering of items locally
  const filteredItems = useMemo(() => {
    if (!q) return items;
    const lower = q.toLowerCase();
    return items.filter(
      (d) =>
        d.name.toLowerCase().includes(lower) ||
        d.specialization.toLowerCase().includes(lower) ||
        (d.email && d.email.toLowerCase().includes(lower))
    );
  }, [items, q]);

  // Stats calculations
  const totalCount = items.length;
  const activeCount = items.filter((d) => d.status === "active").length;
  const avgFee = totalCount ? Math.round(items.reduce((acc, d) => acc + (d.fee || 0), 0) / totalCount) : 0;
  const scheduledCount = items.filter((d) => d.schedule && d.schedule.length > 0).length;

  const doctorStats = useMemo(() => [
    {
      name: "Total Doctors",
      percentage: Math.min(100, Math.round((totalCount / 50) * 100)),
      current: totalCount,
      allowed: 50,
      allowedLabel: "target",
      fill: "var(--chart-1)",
    },
    {
      name: "Active Doctors",
      percentage: totalCount ? Math.round((activeCount / totalCount) * 100) : 0,
      current: activeCount,
      allowed: totalCount,
      allowedLabel: "registered",
      fill: "var(--chart-2)",
    },
    {
      name: "Avg Fee",
      percentage: Math.min(100, Math.round((avgFee / 2000) * 100)),
      current: `₹${avgFee}`,
      allowed: "₹2000",
      allowedLabel: "target avg",
      fill: "var(--chart-3)",
    },
    {
      name: "Scheduled Doctors",
      percentage: totalCount ? Math.round((scheduledCount / totalCount) * 100) : 0,
      current: scheduledCount,
      allowed: totalCount,
      allowedLabel: "active",
      fill: "var(--chart-4)",
    },
  ], [totalCount, activeCount, avgFee, scheduledCount]);

  // Bulk actions helper
  const handleBulkExport = () => {
    const selected = items.filter((d) => selectedIds.has(d.doctorId));
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selected, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `doctors_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success(`Exported ${selected.length} doctors to JSON.`);
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
      setSelectedIds(new Set(paginatedItems.map((d) => d.doctorId)));
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
            title="Doctors Registry"
            description="Real-time analytics on doctor specializations, shift coverage, and active rosters."
            items={doctorStats}
            action={
              canManage && (
                <Dialog open={creating} onOpenChange={setCreating}>
                  <DialogTrigger render={
                    <Button className="flex items-center gap-1.5 shadow-sm">
                      <Plus className="size-4" />
                      Add Doctor
                    </Button>
                  } />
                  <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add Doctor</DialogTitle>
                      <DialogDescription>
                        Register a doctor at this clinic.
                      </DialogDescription>
                    </DialogHeader>
                    <DoctorForm clinicId={clinicId} initial={EMPTY_FORM} saving={saving} onSave={handleSave} />
                  </DialogContent>
                </Dialog>
              )
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

      {/* Main card containing listing */}
      <Card className="border-border shadow-sm">
        <CardHeader className="border-b border-border bg-muted/20 px-6 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-xl font-semibold text-foreground">
              Doctors Listing
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search doctors..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9 h-9"
              />
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
              No doctors found.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-12 pl-6">
                      <Checkbox
                        checked={selectedIds.size === paginatedItems.length && paginatedItems.length > 0}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead className="font-semibold text-foreground">Name</TableHead>
                    <TableHead className="font-semibold text-foreground">Specialization</TableHead>
                    <TableHead className="font-semibold text-foreground">Phone</TableHead>
                    <TableHead className="font-semibold text-foreground">Email</TableHead>
                    <TableHead className="font-semibold text-foreground">Fee</TableHead>
                    <TableHead className="font-semibold text-foreground">Status</TableHead>
                    {canManage && <TableHead className="text-right pr-6 font-semibold text-foreground">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((d) => (
                    <TableRow
                      key={d.doctorId}
                      className="hover:bg-muted/30 border-b border-border last:border-0"
                    >
                      <TableCell className="pl-6">
                        <Checkbox
                          checked={selectedIds.has(d.doctorId)}
                          onCheckedChange={() => toggleSelectRow(d.doctorId)}
                          aria-label={`Select ${d.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{d.name}</TableCell>
                      <TableCell>{d.specialization}</TableCell>
                      <TableCell>{d.phone ?? "—"}</TableCell>
                      <TableCell>{d.email ?? "—"}</TableCell>
                      <TableCell>{d.fee != null ? `₹${d.fee}` : "—"}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            d.status === "active"
                              ? "bg-green-100 text-green-700 hover:bg-green-100 border-0"
                              : "bg-slate-200 text-slate-600 hover:bg-slate-200 border-0"
                          }
                        >
                          {d.status}
                        </Badge>
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end gap-2">
                            <Dialog>
                              <DialogTrigger render={<Button variant="ghost" size="sm">Edit</Button>} />
                              <DialogContent className="max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Edit Doctor</DialogTitle>
                                </DialogHeader>
                                <DoctorForm
                                  clinicId={clinicId}
                                  initial={{
                                    name: d.name,
                                    specialization: d.specialization,
                                    licenseNo: d.licenseNo ?? "",
                                    qualification: d.qualification ?? "",
                                    phone: d.phone ?? "",
                                    email: d.email ?? "",
                                    fee: d.fee != null ? String(d.fee) : "",
                                    status: d.status,
                                    schedule: d.schedule ?? [],
                                  }}
                                  saving={saving}
                                  onSave={handleSave}
                                />
                              </DialogContent>
                            </Dialog>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(d)}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-muted/10">
                  <div className="flex flex-1 justify-between sm:hidden">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{" "}
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
                      </Button>
                    </div>
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

function DoctorForm({
  clinicId,
  initial,
  saving,
  onSave,
}: {
  clinicId: string;
  initial: DoctorFormState;
  saving: boolean;
  onSave: (form: DoctorFormState) => Promise<void>;
}) {
  const [form, setForm] = useState<DoctorFormState>(initial);
  const set = <K extends keyof DoctorFormState>(key: K, value: DoctorFormState[K] | null) =>
    setForm((f) => ({ ...f, [key]: (value ?? "") as DoctorFormState[K] }));

  function setScheduleEntry(i: number, patch: Partial<ScheduleEntry>) {
    setForm((f) => ({
      ...f,
      schedule: f.schedule.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    }));
  }

  function addScheduleEntry() {
    setForm((f) => ({
      ...f,
      schedule: [...f.schedule, { day: "Mon", start: "09:00", end: "17:00" }],
    }));
  }

  function removeScheduleEntry(i: number) {
    setForm((f) => ({
      ...f,
      schedule: f.schedule.length > 1 ? f.schedule.filter((_, idx) => idx !== i) : f.schedule,
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await onSave(form);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} required minLength={2} />
          </div>
          <div className="grid gap-2">
            <Label>Specialization</Label>
            <Input value={form.specialization} onChange={(e) => set("specialization", e.target.value)} required minLength={2} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>License no.</Label>
            <Input value={form.licenseNo} onChange={(e) => set("licenseNo", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Qualification</Label>
            <Input value={form.qualification} onChange={(e) => set("qualification", e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Consultation fee</Label>
            <Input type="number" min="0" value={form.fee} onChange={(e) => set("fee", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">active</SelectItem>
                <SelectItem value="inactive">inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Schedule</Label>
          {form.schedule.map((entry, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] items-end gap-2">
              <Select value={entry.day} onValueChange={(v) => setScheduleEntry(i, { day: v ?? "Mon" })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="time" value={entry.start} onChange={(e) => setScheduleEntry(i, { start: e.target.value })} className="w-28" />
              <Input type="time" value={entry.end} onChange={(e) => setScheduleEntry(i, { end: e.target.value })} className="w-28" />
              <Button type="button" variant="ghost" size="sm" onClick={() => removeScheduleEntry(i)}>
                Remove
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addScheduleEntry}>
            Add schedule entry
          </Button>
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save doctor"}
        </Button>
      </DialogFooter>
    </form>
  );
}