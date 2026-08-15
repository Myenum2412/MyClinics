"use client";

import { useMemo, useState } from "react";
import { SearchIcon, StethoscopeIcon, VideoIcon } from "lucide-react";
import { LocationPicker } from "@/components/location-picker";
import { cn } from "@/lib/utils";

export type DoctorOption = {
  id: string;
  name: string;
  specialty?: string | null;
  qualifications?: string | null;
  city?: string | null;
};

const genders = ["Male", "Female", "Other"];

const TYPE_OPTIONS = [
  { value: "in-person", label: "In-person visit", icon: StethoscopeIcon },
  { value: "video", label: "Video consultation", icon: VideoIcon },
];

const today = new Date().toISOString().split("T")[0];

const inputClass =
  "w-full rounded-lg border border-black bg-white px-3 py-2 text-sm text-black outline-none placeholder:text-black/40 focus:border-black focus:ring-2 focus:ring-black/20";

const chipClass = (active: boolean) =>
  cn(
    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
    active
      ? "border-black bg-black text-white"
      : "border-black/40 bg-white text-black hover:border-black hover:bg-black/5"
  );

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
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("All");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState<{
    name: string;
    doctor: string;
    date: string;
    time: string;
    type: string;
  } | null>(null);

  const currentDoctorId = onDoctorIdChange
    ? (controlledDoctorId ?? "")
    : doctorId;
  const currentType = onTypeChange ? (controlledType ?? "in-person") : type;

  const [selectedCity, selectedState] = location
    ? location.split(",").map((s) => s.trim())
    : ["", ""];

  const specialties = useMemo(() => {
    const set = new Set<string>();
    for (const d of doctors) {
      if (d.specialty) set.add(d.specialty);
    }
    return ["All", ...Array.from(set)];
  }, [doctors]);

  const visibleDoctors = useMemo(() => {
    const q = query.trim().toLowerCase();
    const city = selectedCity.toLowerCase();
    return doctors.filter((d) => {
      if (selectedCity && !(d.city ?? "").toLowerCase().includes(city)) {
        return false;
      }
      if (specialty !== "All" && d.specialty !== specialty) return false;
      if (
        q &&
        !d.name.toLowerCase().includes(q) &&
        !(d.specialty ?? "").toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [doctors, query, specialty, selectedCity]);

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
      setError("Please fill in your name, phone, doctor, date and time.");
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
      });
    } catch {
      setLoading(false);
      setError("Could not reach the server. Please try again.");
    }
  }

  const sectionLabel =
    "text-xs font-semibold uppercase tracking-widest text-black/60";

  return (
    <div className="w-full rounded-3xl border-2 border-black bg-white p-6 text-black shadow-2xl shadow-black/30 md:p-8">
      <h2 className="text-2xl font-bold text-black">Book an Appointment</h2>
      <p className="mt-1 text-sm text-black/60">
        Fill in your details and pick a doctor — we&apos;ll confirm shortly.
      </p>

      {confirmed ? (
        <div className="mt-6 rounded-xl border border-black/30 bg-black/5 p-4 text-sm text-black">
          <p className="font-semibold text-black">
            Thanks, {confirmed.name}! Your appointment request has been
            submitted.
          </p>
          <ul className="mt-3 space-y-1">
            <li>
              <span className="font-medium">Doctor:</span> {confirmed.doctor}
            </li>
            <li>
              <span className="font-medium">Date:</span> {confirmed.date} at{" "}
              {confirmed.time}
            </li>
            <li>
              <span className="font-medium">Type:</span>{" "}
              {confirmed.type === "video" ? "Video Consultation" : "In-person"}
            </li>
            {location && (
              <li>
                <span className="font-medium">Location:</span> {location}
              </li>
            )}
          </ul>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-6">
          {/* 1 · Choose your doctor */}
          <div className="space-y-3">
            <p className={sectionLabel}>1 · Choose your doctor</p>

            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-black/50" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search doctors by name or specialty…"
                className={inputClass + " pl-9"}
              />
            </div>

            {specialties.length > 1 && (
              <div className="flex flex-wrap items-center gap-2">
                {specialties.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSpecialty(s)}
                    className={chipClass(specialty === s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {TYPE_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setSelectedType(t.value)}
                  className={cn(
                    chipClass(currentType === t.value),
                    "flex items-center gap-1.5"
                  )}
                >
                  <t.icon className="size-3.5" />
                  {t.label}
                </button>
              ))}
            </div>

            {visibleDoctors.length === 0 ? (
              <p className="rounded-xl border border-dashed border-black/40 px-3 py-4 text-center text-sm text-black/60">
                {selectedCity
                  ? "No doctors in this city yet. Try another city."
                  : "No doctors match your search."}
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {visibleDoctors.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => pickDoctor(d.id)}
                    className={cn(
                      "flex flex-col items-start gap-0.5 rounded-xl border p-3 text-left transition-colors",
                      currentDoctorId === d.id
                        ? "border-black bg-black text-white"
                        : "border-black/40 bg-white text-black hover:border-black hover:bg-black/5"
                    )}
                  >
                    <span className="text-sm font-semibold">{d.name}</span>
                    <span
                      className={cn(
                        "text-xs",
                        currentDoctorId === d.id
                          ? "text-white/70"
                          : "text-black/60"
                      )}
                    >
                      {[d.specialty, d.qualifications, d.city]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2 · Your location */}
          <div className="space-y-3">
            <p className={sectionLabel}>2 · Your location</p>
            <LocationPicker
              value={location}
              onChange={(v) => {
                setLocation(v);
                setError("");
              }}
            />
          </div>

          {/* 3 · Your details */}
          <div className="space-y-3">
            <p className={sectionLabel}>3 · Your details</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name *"
                className={inputClass}
              />
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="Phone number *"
                className={inputClass}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                type="number"
                min={0}
                max={120}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Age"
                className={inputClass}
              />
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className={inputClass}
              >
                <option value="">Gender</option>
                {genders.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email (optional)"
                className={inputClass}
              />
            </div>
          </div>

          {/* 4 · Date & time */}
          <div className="space-y-3">
            <p className={sectionLabel}>4 · Date &amp; time</p>
            <div className="flex gap-3">
              <input
                type="date"
                value={date}
                min={today}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass + " flex-1"}
              />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={inputClass + " flex-1"}
              />
            </div>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Symptoms or reason for visit (optional)"
              rows={3}
              className={inputClass}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-[#2196F3] px-3 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1976D2] disabled:opacity-50"
          >
            {loading ? "Submitting…" : "Book Appointment"}
          </button>
        </form>
      )}
    </div>
  );
}