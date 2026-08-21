"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  myAppointments,
  getMyPatient,
  listDoctors,
  bookAppointment,
  type Appointment,
  type Doctor,
  type Patient,
} from "@/lib/clinic-api";
import { formatDate, formatTime } from "@/lib/format-time";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, ChevronRight, ChevronLeft, CalendarPlus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

import {
  AppointmentForm,
  buildNotes,
  emptyAppointmentForm,
  type AppointmentFormState,
} from "@/components/clinic/appointment-form";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function PatientAppointmentsPage() {
  const session = useRequireRole("patient");
  const clinicId = session?.clinicId ?? "";
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === appointments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(appointments.map((a) => a.appointmentId)));
    }
  };


  const loadData = useCallback(async () => {
    if (!clinicId) return;
    try {
      const [patient, docsRes, apptRes] = await Promise.all([
        getMyPatient(clinicId),
        listDoctors(clinicId, { status: "active", limit: 100 }),
        myAppointments(clinicId, { limit: 100 }),
      ]);
      if (patient) {
        setPatients([patient]);
      }
      setDoctors(docsRes.items);
      setAppointments(apptRes.items);
    } catch {
      toast.error("Failed to load appointment details");
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleBook(form: AppointmentFormState) {
    if (!clinicId) return;
    setSaving(true);
    try {
      await bookAppointment(clinicId, {
        doctorId: form.doctorId,
        date: form.date,
        time: form.time,
        reason: form.reason || null,
        notes: buildNotes(form),
      });
      toast.success("Appointment booked. WhatsApp alerts queued!");
      setBooking(false);
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to book appointment");
    } finally {
      setSaving(false);
    }
  }

  const getStatusClass = (status: string) => {
    const classes: Record<string, string> = {
      scheduled: "bg-primary/10 text-primary",
      completed: "bg-success/10 text-success",
      cancelled: "bg-destructive/10 text-destructive",
      no_show: "bg-muted text-muted-foreground",
    };
    return classes[status] ?? "bg-muted text-muted-foreground";
  };

  const doctorMap = useMemo(() => {
    const map = new Map<string, Doctor>();
    for (const d of doctors) map.set(d.doctorId, d);
    return map;
  }, [doctors]);

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

  if (booking) {
    return (
      <div className="space-y-6">
        <div className="border-b border-border pb-4">
          <div className="flex items-start gap-4">
            <button
              onClick={() => setBooking(false)}
              className="mt-1 inline-flex items-center justify-center rounded-lg p-2 hover:bg-muted"
            >
              <ChevronLeft size={20} className="text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Book Appointment</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Schedule your visit. Automated WhatsApp alerts will be instantly queued for you and the doctor.
              </p>
            </div>
          </div>
        </div>

        {patients.length === 0 ? (
          <div className="rounded-xl border border-border bg-accent/40 p-12 text-center">
            <CalendarPlus className="mx-auto mb-4 size-12 text-primary/40" />
            <h3 className="text-lg font-medium text-foreground">Patient profile not found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              We couldn&apos;t find your patient profile. Please contact the clinic.
            </p>
          </div>
        ) : (
          <AppointmentForm
            clinicId={clinicId}
            appointments={appointments}
            patients={patients}
            doctors={doctors}
            initial={{
              ...emptyAppointmentForm(),
              patientId: patients[0].patientId,
            }}
            onSave={handleBook}
            saving={saving}
            lockPatient
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">My Appointments</h2>
          <p className="text-muted-foreground mt-1">View and manage your upcoming and past appointments</p>
        </div>
        <Button className="flex items-center gap-1.5 shadow-sm" onClick={() => setBooking(true)}>
          <CalendarPlus className="size-4" />
          Book Appointment
        </Button>
      </div>

      {appointments.length === 0 ? (
        <div className="rounded-xl border border-border bg-background p-12 text-center">
          <Calendar className="size-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">No appointments yet</h3>
          <p className="text-muted-foreground mt-2">Your upcoming appointments will appear here.</p>
        </div>
      ) : (
        <div className="border border-border bg-background shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border bg-muted/50">
                <TableHead className="w-12 pl-4">
                  <Checkbox
                    checked={selectedIds.size === appointments.length && appointments.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="font-medium text-muted-foreground">Date & Time</TableHead>
                <TableHead className="font-medium text-muted-foreground">Doctor</TableHead>
                <TableHead className="font-medium text-muted-foreground">Reason</TableHead>
                <TableHead className="font-medium text-muted-foreground">Status</TableHead>
                <TableHead className="font-medium text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.map((appt) => {
                const doc = doctorMap.get(appt.doctorId);
                const docName = doc ? doc.name : appt.doctorId?.slice(0, 8) || "Unknown";
                return (
                  <TableRow key={appt.appointmentId} className="border-b border-border hover:bg-muted/50">
                    <TableCell className="pl-4">
                      <Checkbox
                        checked={selectedIds.has(appt.appointmentId)}
                        onCheckedChange={() => toggleSelect(appt.appointmentId)}
                      />
                    </TableCell>
                    <TableCell className="font-medium text-foreground whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="size-4 text-muted-foreground" />
                        {formatDate(appt.date)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                        <Clock className="size-4" />
                        {formatTime(appt.time)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-foreground">Dr. {docName}</p>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{appt.reason || "General Consultation"}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusClass(appt.status)} variant="outline">
                        {appt.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="gap-1.5">
                        <ChevronRight className="size-4" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}