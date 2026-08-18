"use client";

import { useCallback, useEffect, useState } from "react";
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

  const load = useCallback(() => {
    if (!clinicId) return;
    setLoading(true);
    listDoctors(clinicId, { limit: 100 })
      .then((res) => setItems(res.items))
      .catch(() => toast.error("Failed to load doctors"))
      .finally(() => setLoading(false));
  }, [clinicId]);

  useEffect(() => {
    load();
  }, [load]);

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

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <div className="flex items-center justify-end">
          <Dialog open={creating} onOpenChange={setCreating}>
            <DialogTrigger render={<Button>Add doctor</Button>} />
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add doctor</DialogTitle>
                <DialogDescription>
                  Register a doctor at this clinic.
                </DialogDescription>
              </DialogHeader>
              <DoctorForm clinicId={clinicId} initial={EMPTY_FORM} saving={saving} onSave={handleSave} />
            </DialogContent>
          </Dialog>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Doctors</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No doctors yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((d) => (
                  <TableRow key={d.doctorId}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>{d.specialization}</TableCell>
                    <TableCell>{d.phone ?? "—"}</TableCell>
                    <TableCell>{d.email ?? "—"}</TableCell>
                    <TableCell>{d.fee != null ? `₹${d.fee}` : "—"}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          d.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-200 text-slate-600"
                        }
                      >
                        {d.status}
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger render={<Button variant="ghost" size="sm">Edit</Button>} />
                          <DialogContent className="max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Edit doctor</DialogTitle>
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
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(d)}>
                          Delete
                        </Button>
                      </TableCell>
                    )}
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