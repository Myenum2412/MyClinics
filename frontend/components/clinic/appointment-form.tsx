"use client";

import { useMemo, useState } from "react";
import { useDropdownOptions } from "@/lib/dropdown-options";
import type { Appointment, Doctor, Patient } from "@/lib/clinic-api";
import { TimePicker } from "@/components/ui/time-picker";
import { formatTime } from "@/lib/format-time";
import { now, toLocalDateISO } from "@/lib/datetime";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle } from "lucide-react";

export function today(): string {
  return toLocalDateISO(now());
}

export interface AppointmentFormState {
  patientId: string;
  doctorId: string;
  department: string;
  visitType: string;
  date: string;
  time: string;
  duration: number;
  reason: string;
  priority: string;
  symptoms: string;
  previousVisit: string;
  notes: string;
  reminder: string;
  whatsappAlert: boolean;
  doctorNotification: boolean;
}

export function emptyAppointmentForm(): AppointmentFormState {
  return {
    patientId: "",
    doctorId: "",
    department: "",
    visitType: "New Visit",
    date: today(),
    time: "10:00",
    duration: 30,
    reason: "",
    priority: "Normal",
    symptoms: "",
    previousVisit: "",
    notes: "",
    reminder: "Same Day",
    whatsappAlert: true,
    doctorNotification: true,
  };
}

export function appointmentToForm(appt: Appointment): AppointmentFormState {
  return {
    patientId: appt.patientId,
    doctorId: appt.doctorId,
    department: "",
    visitType: "New Visit",
    date: appt.date,
    time: appt.time,
    duration: 30,
    reason: appt.reason ?? "",
    notes: appt.notes ?? "",
    priority: "Normal",
    symptoms: "",
    previousVisit: "",
    reminder: "Same Day",
    whatsappAlert: true,
    doctorNotification: true,
  };
}

export function buildNotes(form: {
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  reason: string;
  notes: string;
  department?: string;
  visitType?: string;
  duration?: number;
  priority?: string;
  symptoms?: string;
  previousVisit?: string;
  reminder?: string;
  whatsappAlert?: boolean;
  doctorNotification?: boolean;
}): string | null {
  const additionalInfo = [
    form.department ? `Department: ${form.department}` : null,
    form.visitType ? `Visit Type: ${form.visitType}` : null,
    form.duration ? `Duration: ${form.duration} min` : null,
    form.priority ? `Priority: ${form.priority}` : null,
    form.symptoms ? `Symptoms: ${form.symptoms}` : null,
    form.previousVisit ? `Previous Visit: ${form.previousVisit}` : null,
    form.reminder ? `Reminder: ${form.reminder}` : null,
    form.whatsappAlert !== undefined ? `WhatsApp Alert: ${form.whatsappAlert ? "Yes" : "No"}` : null,
    form.doctorNotification !== undefined ? `Doctor Notification: ${form.doctorNotification ? "Yes" : "No"}` : null,
  ].filter(Boolean).join("\n");

  return [form.notes, additionalInfo].filter(Boolean).join("\n\n") || null;
}

export function AppointmentForm({
  clinicId,
  appointments,
  patients,
  doctors,
  initial,
  onSave,
  saving,
  readOnly,
  lockPatient,
}: {
  clinicId: string;
  appointments: Appointment[];
  patients: Patient[];
  doctors: Doctor[];
  initial: AppointmentFormState;
  onSave?: (form: AppointmentFormState) => Promise<void>;
  saving: boolean;
  readOnly?: boolean;
  isEdit?: boolean;
  lockPatient?: boolean;
}) {
  const [patientId, setPatientId] = useState(initial.patientId);
  const [doctorId, setDoctorId] = useState(initial.doctorId);
  const [department, setDepartment] = useState(initial.department);
  const [visitType, setVisitType] = useState(initial.visitType);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const { getOptions } = useDropdownOptions(clinicId);
  const [duration, setDuration] = useState(initial.duration);
  const [reason, setReason] = useState(initial.reason);
  const [priority, setPriority] = useState(initial.priority);
  const [symptoms, setSymptoms] = useState(initial.symptoms);
  const [previousVisit, setPreviousVisit] = useState(initial.previousVisit);
  const [notes, setNotes] = useState(initial.notes);
  const [reminder, setReminder] = useState(initial.reminder);
  const [whatsappAlert, setWhatsappAlert] = useState(initial.whatsappAlert);
  const [doctorNotification, setDoctorNotification] = useState(initial.doctorNotification);
  const [patientQuery, setPatientQuery] = useState(
    initial.patientId ? patients.find((p) => p.patientId === initial.patientId)?.fullName ?? "" : ""
  );
  const [doctorQuery, setDoctorQuery] = useState(
    initial.doctorId ? doctors.find((d) => d.doctorId === initial.doctorId)?.name ?? "" : ""
  );
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const [error, setError] = useState("");
  const [showOptionalInfo, setShowOptionalInfo] = useState(false);

  const selectedPatient = useMemo(
    () => patients.find((p) => p.patientId === patientId) ?? null,
    [patients, patientId]
  );
  const selectedDoctor = useMemo(
    () => doctors.find((d) => d.doctorId === doctorId) ?? null,
    [doctors, doctorId]
  );

  const filteredPatients = useMemo(() => {
    const q = patientQuery.trim().toLowerCase();
    if (!q) return patients.slice(0, 20);
    return patients.filter((p) => p.fullName.toLowerCase().includes(q) || (p.mobile ?? "").includes(q));
  }, [patients, patientQuery]);

  const filteredDoctors = useMemo(() => {
    const q = doctorQuery.trim().toLowerCase();
    if (!q) return doctors.slice(0, 20);
    return doctors.filter((d) => d.name.toLowerCase().includes(q) || d.specialization?.toLowerCase().includes(q));
  }, [doctors, doctorQuery]);

  const endTime = useMemo(() => {
    if (!time) return "--:--";
    const [hours, minutes] = time.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes + duration;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    const suffix = endHours >= 12 ? "PM" : "AM";
    const h12 = ((endHours + 11) % 12) + 1;
    return `${String(h12).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")} ${suffix}`;
  }, [time, duration]);

  const occupiedSlots = useMemo(() => {
    if (!doctorId || !date) return [] as string[];
    const chosen = appointments.filter((appt) => appt.doctorId === doctorId && appt.date === date);
    return chosen.map((appt) => appt.time).sort();
  }, [appointments, doctorId, date]);

  function timeToMinutes(value: string) {
    if (!value) return 0;
    const [h, m] = value.split(":").map(Number);
    return h * 60 + m;
  }

  function conflictExists() {
    if (!doctorId || !date || !time) return false;
    const slotStart = timeToMinutes(time);
    const slotEnd = slotStart + duration;

    return appointments.some((appt) => {
      if (appt.doctorId !== doctorId || appt.date !== date) return false;
      const apptStart = timeToMinutes(appt.time);
      const apptEnd = apptStart + 30;
      return slotStart < apptEnd && slotEnd > apptStart;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly || !onSave) return;
    setError("");

    if (!patientId || !doctorId) {
      setError("Patient and doctor are required.");
      return;
    }
    if (!date || !time) {
      setError("Date and time are required.");
      return;
    }
    if (!reason.trim()) {
      setError("Reason for visit is required.");
      return;
    }
    if (conflictExists()) {
      setError("This doctor already has an appointment at the selected time. Please choose another slot.");
      return;
    }

    await onSave({
      patientId,
      doctorId,
      date,
      time,
      reason,
      notes,
      department,
      visitType,
      duration,
      priority,
      symptoms,
      previousVisit,
      reminder,
      whatsappAlert,
      doctorNotification,
    });
  }

  function resetForm() {
    setPatientId(initial.patientId);
    setDoctorId(initial.doctorId);
    setDepartment(initial.department);
    setVisitType(initial.visitType);
    setDate(initial.date);
    setTime(initial.time);
    setDuration(initial.duration);
    setReason(initial.reason);
    setPriority(initial.priority);
    setSymptoms(initial.symptoms);
    setPreviousVisit(initial.previousVisit);
    setNotes(initial.notes);
    setReminder(initial.reminder);
    setWhatsappAlert(initial.whatsappAlert);
    setDoctorNotification(initial.doctorNotification);
    setPatientQuery(initial.patientId ? patients.find((p) => p.patientId === initial.patientId)?.fullName ?? "" : "");
    setDoctorQuery(initial.doctorId ? doctors.find((d) => d.doctorId === initial.doctorId)?.name ?? "" : "");
    setShowPatientDropdown(false);
    setShowDoctorDropdown(false);
    setError("");
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <fieldset disabled={readOnly} className="space-y-6 border-0 p-0 m-0">
      {/* 1. PATIENT & DOCTOR */}
      <Card className="overflow-visible border-border bg-gradient-to-b from-muted/50 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            1. Patient &amp; Doctor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Patient <span className="ml-1 text-destructive">*</span>
              </Label>
              {lockPatient ? (
                <div className="rounded-lg border border-border bg-accent/50 px-3 py-2.5 text-sm font-medium text-primary">
                  {selectedPatient?.fullName ?? patientQuery}
                </div>
              ) : (
              <div className="relative">
                <Input
                  value={selectedPatient ? selectedPatient.fullName : patientQuery}
                  onChange={(e) => {
                    setPatientId("");
                    setPatientQuery(e.target.value);
                    setShowPatientDropdown(true);
                  }}
                  onFocus={() => {
                    setShowPatientDropdown(true);
                    setPatientQuery(selectedPatient?.fullName ?? patientQuery);
                  }}
                  onBlur={() => setTimeout(() => setShowPatientDropdown(false), 150)}
                  placeholder="Search patient"
                  className={`border ${
                    error && !patientId ? "border-destructive focus:ring-destructive" : "border-border focus:ring-ring"
                  }`}
                />
                {showPatientDropdown && (
                  <div className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-background p-1 shadow-xl">
                    {filteredPatients.length === 0 ? (
                      <div className="px-2 py-2 text-xs text-muted-foreground">
                        {patients.length === 0
                          ? "No patients found. Add patients first."
                          : "No matching patients"}
                      </div>
                    ) : (
                      filteredPatients.slice(0, 8).map((p) => (
                        <button
                          key={p.patientId}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setPatientId(p.patientId);
                            setPatientQuery(p.fullName);
                            setShowPatientDropdown(false);
                          }}
                          className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-xs transition hover:bg-accent"
                        >
                          <span className="font-medium text-foreground">{p.fullName}</span>
                          <span className="text-muted-foreground">{p.mobile}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Doctor <span className="ml-1 text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  value={selectedDoctor ? selectedDoctor.name : doctorQuery}
                  onChange={(e) => {
                    setDoctorId("");
                    setDoctorQuery(e.target.value);
                    setShowDoctorDropdown(true);
                  }}
                  onFocus={() => {
                    setShowDoctorDropdown(true);
                    setDoctorQuery(selectedDoctor?.name ?? doctorQuery);
                  }}
                  onBlur={() => setTimeout(() => setShowDoctorDropdown(false), 150)}
                  placeholder="Search doctor"
                  className={`border ${
                    error && !doctorId ? "border-destructive focus:ring-destructive" : "border-border focus:ring-ring"
                  }`}
                />
                {showDoctorDropdown && (
                  <div className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-background p-1 shadow-xl">
                    {filteredDoctors.length === 0 ? (
                      <div className="px-2 py-2 text-xs text-muted-foreground">
                        {doctors.length === 0
                          ? "No doctors found. Add doctors first."
                          : "No matching doctors"}
                      </div>
                    ) : (
                      filteredDoctors.slice(0, 8).map((d) => (
                        <button
                          key={d.doctorId}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setDoctorId(d.doctorId);
                            setDoctorQuery(d.name);
                            setShowDoctorDropdown(false);
                          }}
                          className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-xs transition hover:bg-accent"
                        >
                          <span className="font-medium text-foreground">{d.name}</span>
                          <span className="text-muted-foreground">{d.specialization || "General"}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. VISIT DETAILS */}
      <Card className="border-border bg-gradient-to-b from-muted/50 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            2. Visit Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Department</Label>
              <Input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Optional"
                className="border border-border focus:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Visit Type</Label>
              <Select value={visitType} onValueChange={(value) => setVisitType(value ?? "New Visit")}>
                <SelectTrigger className="border border-border focus:ring-ring">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getOptions("visit_types").map((vt) => (
                    <SelectItem key={vt} value={vt}>{vt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Date <span className="ml-1 text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className={`border ${
                  error && !date ? "border-destructive focus:ring-destructive" : "border-border focus:ring-ring"
                }`}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Time <span className="ml-1 text-destructive">*</span>
              </Label>
              <TimePicker
                value={time}
                onChange={setTime}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Duration</Label>
              <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                <SelectTrigger className="border border-border focus:ring-ring">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getOptions("appointment_durations").map((mins) => (
                    <SelectItem key={mins} value={mins}>{mins} minutes</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Reason for Visit <span className="ml-1 text-destructive">*</span>
              </Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Fever, checkup, follow-up..."
                required
                className={`border ${
                  error && !reason.trim() ? "border-destructive focus:ring-destructive" : "border-border focus:ring-ring"
                }`}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Priority</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value ?? "Normal")}>
                <SelectTrigger className="border border-border focus:ring-ring">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getOptions("appointment_priorities").map((pr) => (
                    <SelectItem key={pr} value={pr}>{pr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">End Time</Label>
              <div className="rounded-lg border border-border bg-accent/50 px-3 py-2.5 text-sm text-primary">
                {endTime}
              </div>
            </div>
          </div>

          {doctorId && date && (
            <div className="rounded-lg border border-border bg-accent/50 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-foreground">Doctor schedule</p>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Available / occupied</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00"].map((slot) => {
                  const busy = occupiedSlots.includes(slot);
                  const selected = slot === time;
                  return (
                    <button
                      type="button"
                      key={slot}
                      onClick={() => setTime(slot)}
                      className={`rounded-full border px-2 py-1 text-[10px] font-medium transition ${
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : busy
                            ? "border-destructive/25 bg-destructive/10 text-destructive"
                            : "border-border bg-background text-primary hover:bg-muted"
                      }`}
                    >
{formatTime(slot)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. ADDITIONAL INFORMATION */}
      <Card className="border-border bg-gradient-to-b from-muted/50 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold text-foreground">
              3. Additional Information (Optional)
            </CardTitle>
            <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] text-primary">
              {showOptionalInfo ? "Hide" : "Show"}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <button
            type="button"
            onClick={() => setShowOptionalInfo((v) => !v)}
            className="w-full rounded-lg border border-border bg-accent/50 px-3 py-2 text-left text-xs font-semibold text-foreground hover:bg-muted"
          >
            {showOptionalInfo ? "Hide optional fields" : "Show optional fields"}
          </button>

          {showOptionalInfo && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-medium text-foreground">Symptoms</Label>
                <Textarea value={symptoms} onChange={(e) => setSymptoms(e.target.value)} rows={2} className="border border-border focus:ring-ring" placeholder="Brief symptoms or complaints" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Previous Visit</Label>
                <Input value={previousVisit} onChange={(e) => setPreviousVisit(e.target.value)} placeholder="Optional" className="border border-border focus:ring-ring" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Internal Notes</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Staff notes" className="border border-border focus:ring-ring" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. NOTIFICATIONS */}
      <Card className="border-border bg-gradient-to-b from-muted/50 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            4. Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Patient Reminder</Label>
              <Select value={reminder} onValueChange={(value) => setReminder(value ?? "Same Day")}>
                <SelectTrigger className="border border-border focus:ring-ring">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getOptions("reminder_options").map((rm) => (
                    <SelectItem key={rm} value={rm}>{rm}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">WhatsApp Alert</Label>
              <Select value={whatsappAlert ? "Yes" : "No"} onValueChange={(v) => setWhatsappAlert(v === "Yes")}>
                <SelectTrigger className="border border-border focus:ring-ring">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Doctor Notification</Label>
              <Select value={doctorNotification ? "Yes" : "No"} onValueChange={(v) => setDoctorNotification(v === "Yes")}>
                <SelectTrigger className="border border-border focus:ring-ring">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {whatsappAlert || doctorNotification
              ? "Patient and staff notifications will be sent based on the selected reminder and alert preferences."
              : "No notifications will be sent for this appointment."}
          </p>
        </CardContent>
      </Card>
      </fieldset>

      {error && (
        <div className="flex items-center gap-1.5 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {!readOnly && (
        <div className="flex gap-3 border-t border-border pt-8">
          <Button type="button" variant="outline" onClick={resetForm} className="border-primary/30 text-primary hover:bg-accent">
            Reset
          </Button>
          <div className="flex-1" />
          <Button type="submit" disabled={saving} size="lg">
            {saving ? "Saving..." : "Save Appointment"}
          </Button>
        </div>
      )}
    </form>
  );
}