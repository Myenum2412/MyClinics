"use client";

import { useMemo, useState } from "react";
import {
  CakeIcon,
  CalendarIcon,
  CalendarPlusIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ClockIcon,
  MailIcon,
  PhoneIcon,
  ShieldCheckIcon,
  StethoscopeIcon,
  UserIcon,
  UserRoundIcon,
  VideoIcon,
} from "lucide-react";
import { LocationPicker } from "@/components/location-picker";
import { cn } from "@/lib/utils";

export type DoctorOption = {
  id: string;
  name: string;
  specialty?: string | null;
  qualifications?: string | null;
  city?: string | null;
};

const genders = ["Male", "Female", "Transgender", "Other"];

const TYPE_OPTIONS = [
  { value: "in-person", label: "In-person visit", icon: StethoscopeIcon },
  { value: "video", label: "Video consultation", icon: VideoIcon },
];

const BLUE = "#2196F3";

const today = new Date().toISOString().split("T")[0];

const inputClass =
  "w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm text-black outline-none transition-colors placeholder:text-black/40 focus:border-[#2196F3] focus:ring-2 focus:ring-[#2196F3]/20";

function RequiredMark() {
  return <span className="text-[#2196F3]">*</span>;
}

function Field({
  label,
  required,
  optional,
  icon: Icon,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-black/70">
        {label} {required && <RequiredMark />}
        {optional && (
          <span className="font-normal text-black/40"> (optional)</span>
        )}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-black/40" />
        {children}
      </div>
    </div>
  );
}

function StepHeader({ number, label }: { number: number; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2196F3] text-sm font-semibold text-white">
        {number}
      </span>
      <p className="text-sm font-semibold text-black">{label}</p>
    </div>
  );
}

export default function AppointmentForm({
  doctors,
  doctorId: controlledDoctorId,
  onDoctorIdChange,
  type: controlledType,
  onTypeChange,
}: {
  doctors: DoctorOption[];
  doctorId?: string;
  onDoctorIdChange?: (id: string) => void;
  type?: string;
  onTypeChange?: (type: string) => void;
}) {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("in-person");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState<{
    name: string;
    doctor: string;
    date: string;
    time: string;
    type: string;
    accountCreated?: boolean;
  } | null>(null);

  const currentDoctorId = onDoctorIdChange
    ? (controlledDoctorId ?? "")
    : doctorId;
  const currentType = onTypeChange ? (controlledType ?? "in-person") : type;

  const [selectedCity] = location
    ? location.split(",").map((s) => s.trim())
    : [""];

  const visibleDoctors = useMemo(() => {
    if (!selectedCity) return doctors;
    const city = selectedCity.toLowerCase();
    return doctors.filter((d) =>
      (d.city ?? "").toLowerCase().includes(city)
    );
  }, [doctors, selectedCity]);

  function pickDoctor(id: string) {
    if (onDoctorIdChange) {
      onDoctorIdChange(id);
    } else {
      setDoctorId(id);
    }
    setError("");
  }

  function setSelectedType(t: string) {
    if (onTypeChange) {
      onTypeChange(t);
    } else {
      setType(t);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim() || !mobile.trim() || !currentDoctorId || !date || !time) {
      setError(
        "Please fill in your name, WhatsApp number, doctor, date and time."
      );
      return;
    }

    const doctor = doctors.find((d) => d.id === currentDoctorId);

    setLoading(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: name.trim(),
          mobile: mobile.trim(),
          age: age ? Number(age) : null,
          gender: gender || null,
          email: email || null,
          doctorId: currentDoctorId,
          doctorName: doctor?.name ?? null,
          department: location || null,
          date,
          time,
          type: currentType,
          reason: reason || null,
          bookingSource: "manual",
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      setConfirmed({
        name: name.trim(),
        doctor: doctor?.name ?? "",
        date,
        time,
        type: currentType,
        accountCreated: data.patientAccountCreated === true,
      });
    } catch {
      setLoading(false);
      setError("Could not reach the server. Please try again.");
    }
  }

  return (
    <div className="w-full rounded-2xl border border-black/10 bg-white p-6 text-black shadow-lg shadow-[#0D47A1]/10 md:p-8">
      {/* header */}
      <div className="flex items-start gap-3.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#2196F3]/10 text-[#2196F3]">
          <CalendarPlusIcon className="size-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-black md:text-2xl">
            Book an Appointment
          </h2>
          <p className="mt-0.5 text-sm text-black/60">
            Fill in your details and pick a doctor — we&apos;ll confirm shortly.
          </p>
        </div>
      </div>

      {confirmed ? (
        <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-black">
          <p className="flex items-center gap-1.5 font-medium text-emerald-700">
            <CheckCircle2Icon className="size-4" />
            Thanks, {confirmed.name}! Your appointment request has been
            submitted.
          </p>
          <ul className="mt-3 space-y-1 text-black/70">
            <li>
              <span className="font-medium text-black">Doctor:</span>{" "}
              {confirmed.doctor}
            </li>
            <li>
              <span className="font-medium text-black">Date:</span>{" "}
              {confirmed.date} at {confirmed.time}
            </li>
            <li>
              <span className="font-medium text-black">Type:</span>{" "}
              {confirmed.type === "video" ? "Video Consultation" : "In-person"}
            </li>
            {location && (
              <li>
                <span className="font-medium text-black">Location:</span>{" "}
                {location}
              </li>
            )}
          </ul>
          {confirmed.accountCreated && (
            <p className="mt-3 rounded-lg border border-[#2196F3]/30 bg-[#2196F3]/10 px-3 py-2 text-xs text-black/70">
              Your patient account was created automatically — your login
              email and password were sent to your WhatsApp number.
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-8">
          {/* Step 1 — Your Details */}
          <div className="space-y-4">
            <StepHeader number={1} label="Your Details" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full Name" required icon={UserIcon}>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ravi Kumar"
                  className={inputClass + " pl-9"}
                />
              </Field>
              <Field label="WhatsApp Number" required icon={PhoneIcon}>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="+91 98765 43210"
                  className={inputClass + " pl-9"}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Age" icon={CakeIcon}>
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="25"
                  className={inputClass + " pl-9"}
                />
              </Field>
              <Field label="Gender" icon={UserRoundIcon}>
                <div className="relative">
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className={inputClass + " appearance-none pl-9 pr-8"}
                  >
                    <option value="">Select gender</option>
                    {genders.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-black/40" />
                </div>
              </Field>
              <Field label="Email" optional icon={MailIcon}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputClass + " pl-9"}
                />
              </Field>
            </div>
          </div>

          {/* Step 2 — Your Location & Doctor */}
          <div className="space-y-4">
            <StepHeader number={2} label="Your Location & Doctor" />
            <LocationPicker
              value={location}
              onChange={(v) => {
                setLocation(v);
                setError("");
              }}
            />

            <div className="grid gap-2 sm:grid-cols-2">
              {TYPE_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setSelectedType(t.value)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                    currentType === t.value
                      ? "border-[#2196F3] bg-[#2196F3]/10 text-[#2196F3]"
                      : "border-black/10 bg-white text-black/70 hover:border-[#2196F3]/50 hover:text-black"
                  )}
                >
                  <t.icon className="size-4" />
                  {t.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <StethoscopeIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-black/40" />
              <select
                value={currentDoctorId}
                onChange={(e) => pickDoctor(e.target.value)}
                disabled={!selectedCity || visibleDoctors.length === 0}
                className={inputClass + " appearance-none pl-9 pr-8 disabled:cursor-not-allowed disabled:opacity-60"}
              >
                <option value="">
                  {!selectedCity
                    ? "Select a doctor *"
                    : visibleDoctors.length === 0
                      ? `No doctors in ${selectedCity}`
                      : "Select a doctor *"}
                </option>
                {visibleDoctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                    {d.specialty ? ` — ${d.specialty}` : ""}
                    {d.city ? ` · ${d.city}` : ""}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-black/40" />
            </div>
          </div>

          {/* Step 3 — Date & Time */}
          <div className="space-y-4">
            <StepHeader number={3} label="Date & Time" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Preferred Date" required icon={CalendarIcon}>
                <input
                  type="date"
                  value={date}
                  min={today}
                  onChange={(e) => setDate(e.target.value)}
                  className={cn(inputClass, "pl-9", !date && "text-transparent")}
                />
                {!date && (
                  <span className="pointer-events-none absolute top-1/2 left-9 -translate-y-1/2 text-sm text-black/40">
                    dd/mm/yyyy
                  </span>
                )}
              </Field>
              <Field label="Preferred Time" required icon={ClockIcon}>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className={cn(inputClass, "pl-9", !time && "text-transparent")}
                />
                {!time && (
                  <span className="pointer-events-none absolute top-1/2 left-9 -translate-y-1/2 text-sm text-black/40">
                    Select time
                  </span>
                )}
              </Field>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-black/70">
                Symptoms or reason for visit
                <span className="font-normal text-black/40"> (optional)</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please describe your symptoms or reason for visit"
                rows={4}
                className={inputClass + " resize-none"}
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ backgroundColor: BLUE }}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1976D2] disabled:opacity-60"
          >
            <CalendarPlusIcon className="size-4" />
            {loading ? "Booking…" : "Book Appointment"}
          </button>

          <p className="flex items-center justify-center gap-1.5 text-xs text-black/50">
            <ShieldCheckIcon className="size-3.5 text-emerald-600" />
            Your information is secure and confidential.
          </p>
        </form>
      )}
    </div>
  );
}