"use client";

import { useState } from "react";

export type DoctorOption = { id: string; name: string };

const locations = [
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

const today = new Date().toISOString().split("T")[0];

export default function AppointmentForm({
  doctors,
}: {
  doctors: DoctorOption[];
}) {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState<{
    name: string;
    doctor: string;
    date: string;
    time: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim() || !mobile.trim() || !doctorId || !date || !time) {
      setError("Please fill in your name, phone, doctor, date and time.");
      return;
    }

    const doctor = doctors.find((d) => d.id === doctorId);

    setLoading(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: name.trim(),
          mobile: mobile.trim(),
          doctorId,
          doctorName: doctor?.name ?? null,
          department: location || null,
          date,
          time,
          type: "in-person",
          bookingSource: "manual",
          reason: null,
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
      });
    } catch {
      setLoading(false);
      setError("Could not reach the server. Please try again.");
    }
  }

  const inputClass =
    "w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-lg shadow-[#0D47A1]/10">
      <h2 className="text-lg font-semibold text-foreground">
        Book an Appointment
      </h2>
      {confirmed ? (
        <div className="mt-4 text-sm text-muted-foreground">
          <p className="text-emerald-600 dark:text-emerald-400">
            Thanks, {confirmed.name}! Your appointment request has been
            submitted.
          </p>
          <ul className="mt-3 space-y-1">
            <li>
              <span className="font-medium text-foreground">
                Doctor:
              </span>{" "}
              {confirmed.doctor}
            </li>
            <li>
              <span className="font-medium text-foreground">
                Date:
              </span>{" "}
              {confirmed.date} at {confirmed.time}
            </li>
            {location && (
              <li>
                <span className="font-medium text-foreground">
                  Location:
                </span>{" "}
                {location}
              </li>
            )}
          </ul>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className={inputClass}
          />
          <input
            type="tel"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder="Phone number"
            className={inputClass}
          />
          <select
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            className={inputClass}
          >
            <option value="">Select a doctor</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
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
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={inputClass}
          >
            <option value="">Select a location</option>
            {locations.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Submitting…" : "Submit"}
          </button>
        </form>
      )}
    </div>
  );
}
