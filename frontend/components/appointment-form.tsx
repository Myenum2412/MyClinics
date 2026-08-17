"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TimePicker } from "@/components/ui/time-picker";
import {
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import { PatientPicker, type PatientPick } from "@/components/patient-picker";
import { appointmentHtml } from "@/lib/print-documents";
import { fetchClinicName } from "@/lib/clinic-name-client";
import { saveReportCopy } from "@/components/report-copy";
import type { Appointment } from "@/components/appointments-table";

const departments = [
  "General Medicine",
  "Cardiology",
  "Dermatology",
  "Pediatrics",
  "Orthopedics",
  "Neurology",
  "ENT",
  "Ophthalmology",
  "Gynecology",
  "Dentistry",
  "Psychiatry",
  "General Surgery",
];

const genders = ["Male", "Female", "Other"];

const statuses: Appointment["status"][] = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "rescheduled",
  "no_show",
];

export type DoctorOption = { id: string; name: string };

export function AppointmentForm({
  doctors,
  onBooked,
  initial,
  patients,
}: {
  doctors: DoctorOption[];
  onBooked: () => Promise<void>;
  initial?: Appointment;
  patients?: PatientPick[];
}) {
  const isEditing = Boolean(initial);

  const initialDoctorId = initial?.doctorId
    ? doctors.some((d) => d.id === initial.doctorId)
      ? initial.doctorId
      : doctors.find((d) => d.name === initial.doctorName)?.id ?? ""
    : "";

  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [mobile, setMobile] = useState(initial?.mobile ?? "");
  const [secondaryMobile, setSecondaryMobile] = useState(
    initial?.secondaryMobile ?? ""
  );
  const [age, setAge] = useState(initial?.age != null ? String(initial.age) : "");
  const [gender, setGender] = useState(initial?.gender ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [whatsapp, setWhatsapp] = useState(initial?.whatsapp ?? "");
  const [doctorId, setDoctorId] = useState(initialDoctorId);
  const [department, setDepartment] = useState(initial?.department ?? "");
  const [date, setDate] = useState(initial?.date ?? "");
  const [time, setTime] = useState(initial?.time ?? "");
  const [type, setType] = useState(initial?.type ?? "in-person");
  const [status, setStatus] = useState(initial?.status ?? "pending");
  const [reason, setReason] = useState(initial?.reason ?? "");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [loading, setLoading] = useState(false);

  function handlePickPatient(patient: PatientPick) {
    setSelectedPatientId(patient.id);
    setFullName(patient.fullName);
    setMobile(patient.mobile);
    setSecondaryMobile(patient.secondaryMobile ?? "");
    setAge(patient.age != null ? String(patient.age) : "");
    setGender(patient.gender ?? "");
    setEmail(patient.email ?? "");
    setWhatsapp(patient.whatsapp ?? "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const doctor = doctors.find((d) => d.id === doctorId);

    const payload = {
      fullName,
      mobile,
      secondaryMobile: secondaryMobile || null,
      age: age ? Number(age) : null,
      gender: gender || null,
      email: email || null,
      whatsapp: whatsapp || null,
      doctorId,
      doctorName: doctor?.name ?? null,
      department: department || null,
      date,
      time,
      type,
      status,
      reason: reason || null,
    };

    const res = await fetch(
      isEditing ? `/api/appointments/${initial!.id}` : "/api/appointments",
      {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      toast.error(data.error || "Something went wrong. Please try again.");
      return;
    }

    const copySaved = await saveCopy();

    toast.success(isEditing ? "Appointment updated!" : "Appointment booked!", {
      description: copySaved
        ? `${fullName} · ${date} at ${time} · copy saved`
        : `${fullName} · ${date} at ${time}`,
    });

    if (!isEditing) {
      setFullName("");
      setMobile("");
      setSecondaryMobile("");
      setAge("");
      setGender("");
      setEmail("");
      setWhatsapp("");
      setDoctorId("");
      setDepartment("");
      setDate("");
      setTime("");
      setType("in-person");
      setReason("");
      setSelectedPatientId("");
    }

    await onBooked();
  }

  async function saveCopy(): Promise<boolean> {
    const name = fullName.trim();
    if (!name) return false;
    try {
      const doctor = doctors.find((d) => d.id === doctorId);
      const a: Appointment = {
        id: initial?.id ?? "",
        fullName: name,
        mobile,
        secondaryMobile: secondaryMobile || null,
        age: age ? Number(age) : null,
        gender: gender || null,
        email: email || null,
        whatsapp: whatsapp || null,
        doctorId: doctorId || null,
        doctorName: doctor?.name ?? null,
        department: department || null,
        date: date || "",
        time,
        type: type === "video" ? "video" : "in-person",
        status,
        reason: reason || null,
        notes: initial?.notes ?? null,
        bookingSource: initial?.bookingSource ?? "manual",
        counter: initial?.counter ?? null,
      };
      const matched = patients?.find(
        (pt) => pt.fullName.toLowerCase() === name.toLowerCase()
      );
      await saveReportCopy({
        html: appointmentHtml(a, await fetchClinicName()),
        fileName: `Appointment-${name.replace(/\s+/g, "-")}-${(date || new Date().toISOString().slice(0, 10)).replace(/-/g, "")}.html`,
        category: "appointment",
        patientId: selectedPatientId || matched?.id || null,
        patientName: name,
      });
      return true;
    } catch (error) {
      console.error("Save appointment copy error", error);
      return false;
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarDaysIcon className="size-5" />
          {isEditing ? "Edit Appointment" : "Book an Appointment"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <fieldset className="flex flex-col gap-4">
            <legend className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Patient Details
            </legend>
            <FieldGroup>
              {patients && patients.length > 0 && (
                <Field>
                  <FieldLabel htmlFor="patientPicker">Select Patient</FieldLabel>
                  <PatientPicker
                    id="patientPicker"
                    patients={patients}
                    value={selectedPatientId}
                    onPick={handlePickPatient}
                  />
                  <FieldDescription>
                    Selecting a patient auto-fills the details below.
                  </FieldDescription>
                </Field>
              )}
              <Field>
                <FieldLabel htmlFor="fullName">Full Name *</FieldLabel>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="mobile">Mobile Number *</FieldLabel>
                  <Input
                    id="mobile"
                    type="tel"
                    placeholder="+91 98765 43210"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="secondaryMobile">
                    Secondary Mobile Number
                  </FieldLabel>
                  <Input
                    id="secondaryMobile"
                    type="tel"
                    placeholder="+91 98765 43211"
                    value={secondaryMobile}
                    onChange={(e) => setSecondaryMobile(e.target.value)}
                  />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="age">Age</FieldLabel>
                  <Input
                    id="age"
                    type="number"
                    min={0}
                    max={120}
                    placeholder="35"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="gender">Gender</FieldLabel>
                  <Select value={gender} onValueChange={(v) => setGender(v ?? "")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {genders.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="whatsapp">WhatsApp Number</FieldLabel>
                  <Input
                    id="whatsapp"
                    type="tel"
                    placeholder="+91 98765 43212"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                  />
                </Field>
              </div>
            </FieldGroup>
          </fieldset>

          <fieldset className="flex flex-col gap-4">
            <legend className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Appointment Details
            </legend>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="doctor">Select Doctor *</FieldLabel>
                <Select
                  value={doctorId}
                  onValueChange={(v) => setDoctorId(v ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.length ? (
                      doctors.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        No doctors registered yet
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="department">
                  Select Department / Specialization
                </FieldLabel>
                <Select
                  value={department}
                  onValueChange={(v) => setDepartment(v ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="date">Preferred Date *</FieldLabel>
                  <Input
                    id="date"
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="time">Preferred Time *</FieldLabel>
                  <TimePicker value={time} onChange={setTime} />
                </Field>
              </div>
              <Field>
                <FieldLabel>Appointment Type</FieldLabel>
                <RadioGroup
                  value={type}
                  onValueChange={(v) => setType(v ?? "in-person")}
                  className="grid gap-3 sm:grid-cols-2"
                >
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm font-medium transition-colors has-data-checked:border-primary has-data-checked:bg-primary/5">
                    <RadioGroupItem value="in-person" />
                    In-person
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm font-medium transition-colors has-data-checked:border-primary has-data-checked:bg-primary/5">
                    <RadioGroupItem value="video" />
                    Video Consultation
                  </label>
                </RadioGroup>
              </Field>
              {isEditing && (
                <Field>
                  <FieldLabel htmlFor="status">Status</FieldLabel>
                  <Select
                    value={status}
                    onValueChange={(v) => setStatus(v ?? "pending")}
                  >
                    <SelectTrigger id="status" className="w-full">
                      <SelectValue className="capitalize" />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((s) => (
                        <SelectItem key={s} value={s}>
                          <span className="capitalize">{s.replace("_", " ")}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </FieldGroup>
          </fieldset>

          <fieldset className="flex flex-col gap-4">
            <legend className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Reason for Visit
            </legend>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="reason">
                  Symptoms / Reason for Appointment
                </FieldLabel>
                <Textarea
                  id="reason"
                  rows={4}
                  placeholder="Describe your symptoms or the reason for this visit..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <FieldDescription>
                  This helps the doctor prepare for your visit.
                </FieldDescription>
              </Field>
            </FieldGroup>
          </fieldset>

          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading
              ? isEditing
                ? "Updating..."
                : "Booking..."
              : isEditing
                ? "Update Appointment"
                : "Book Appointment"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
