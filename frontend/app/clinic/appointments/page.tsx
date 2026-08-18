"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  type Appointment,
  type AppointmentStatus,
  createAppointment,
  deleteAppointment,
  listAppointments,
  updateAppointment,
} from "@/lib/clinic-api";
import { formatTime } from "@/lib/format-time";
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
import { DoctorSelect, PatientSelect } from "@/components/clinic/pickers";
import { Skeleton } from "@/components/ui/skeleton";
import { sessionCan } from "@/hooks/use-clinic-session";

const STATUSES: AppointmentStatus[] = ["scheduled", "completed", "cancelled", "no_show"];

const STATUS_CLASS: Record<AppointmentStatus, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-slate-200 text-slate-600",
};

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function AppointmentsPage() {
  const session = useRequireRole("doctor");
  const clinicId = session?.clinicId ?? "";
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<string>(today());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!clinicId) return;
    setLoading(true);
    listAppointments(clinicId, {
      date: dateFilter || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
      limit: 100,
    })
      .then((res) => setItems(res.items))
      .catch(() => toast.error("Failed to load appointments"))
      .finally(() => setLoading(false));
  }, [clinicId, dateFilter, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(form: {
    patientId: string;
    doctorId: string;
    date: string;
    time: string;
    reason: string;
    notes: string;
  }) {
    setSaving(true);
    try {
      await createAppointment(clinicId, {
        patientId: form.patientId,
        doctorId: form.doctorId,
        date: form.date,
        time: form.time,
        reason: form.reason || null,
        notes: form.notes || null,
      });
      toast.success("Appointment created");
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create appointment");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(appointment: Appointment, status: AppointmentStatus) {
    try {
      await updateAppointment(clinicId, appointment.appointmentId, { status });
      toast.success("Appointment updated");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update appointment");
    }
  }

  async function handleDelete(appointment: Appointment) {
    if (!confirm(`Delete appointment for patient ${appointment.patientId}?`)) return;
    try {
      await deleteAppointment(clinicId, appointment.appointmentId);
      toast.success("Appointment deleted");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete appointment");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-44"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button>New appointment</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New appointment</DialogTitle>
              <DialogDescription>
                Book an appointment for a patient with a doctor.
              </DialogDescription>
            </DialogHeader>
            <NewAppointmentForm
              clinicId={clinicId}
              onSave={handleCreate}
              saving={saving}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No appointments found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((a) => (
                  <TableRow key={a.appointmentId}>
                    <TableCell>{a.date}</TableCell>
                    <TableCell>{formatTime(a.time)}</TableCell>
                    <TableCell>{a.patientId}</TableCell>
                    <TableCell>{a.doctorId}</TableCell>
                    <TableCell className="max-w-40 truncate">{a.reason ?? "—"}</TableCell>
                    <TableCell>
                      <Select
                        value={a.status}
                        onValueChange={(v) => handleStatus(a, v as AppointmentStatus)}
                      >
                        <SelectTrigger className="h-7 w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s.replace("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      {sessionCan(session, "clinic_admin") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(a)}
                        >
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

function NewAppointmentForm({
  clinicId,
  onSave,
  saving,
}: {
  clinicId: string;
  onSave: (form: {
    patientId: string;
    doctorId: string;
    date: string;
    time: string;
    reason: string;
    notes: string;
  }) => Promise<void>;
  saving: boolean;
}) {
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState(today());
  const [time, setTime] = useState("10:00");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!patientId || !doctorId) {
      setError("Patient and doctor are required");
      return;
    }
    await onSave({ patientId, doctorId, date, time, reason, notes });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3">
        <div className="grid gap-2">
          <Label>Patient</Label>
          <PatientSelect clinicId={clinicId} value={patientId} onChange={(v) => setPatientId(v ?? "")} required />
        </div>
        <div className="grid gap-2">
          <Label>Doctor</Label>
          <DoctorSelect clinicId={clinicId} value={doctorId} onChange={(v) => setDoctorId(v ?? "")} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label>Time</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Reason</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Fever, checkup..." />
        </div>
        <div className="grid gap-2">
          <Label>Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <DialogFooter>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Create appointment"}
        </Button>
      </DialogFooter>
    </form>
  );
}