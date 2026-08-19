"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MapPin, Search, Stethoscope } from "lucide-react";
import indiaCities from "@/lib/india-cities.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STATES = Object.keys(indiaCities.states).sort();

interface AppointmentBookingFormProps {
  className?: string;
}

/**
 * Home page appointment form. The patient picks their State and City, adds
 * their name and WhatsApp number, and submits. The backend automatically
 * creates a patient portal account for the clinic with a generated password
 * and sends the login credentials to the WhatsApp number.
 */
export function AppointmentBookingForm({ className }: AppointmentBookingFormProps) {
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState("");

  const cities = useMemo(
    () => (state ? indiaCities.states[state as keyof typeof indiaCities.states] ?? [] : []),
    [state]
  );

  // ── searchable dropdown state ────────────────────────────────────────────
  const [stateOpen, setStateOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [stateQuery, setStateQuery] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const stateRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (stateRef.current && !stateRef.current.contains(e.target as Node)) setStateOpen(false);
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) setCityOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const filteredStates = useMemo(() => {
    const q = stateQuery.trim().toLowerCase();
    return q ? STATES.filter((s) => s.toLowerCase().includes(q)) : STATES;
  }, [stateQuery]);

  const filteredCities = useMemo(() => {
    const q = cityQuery.trim().toLowerCase();
    return q ? cities.filter((c) => c.toLowerCase().includes(q)) : cities;
  }, [cities, cityQuery]);

  function pickState(value: string) {
    setState(value);
    setCity("");
    setCityQuery("");
    setStateOpen(false);
  }

  function pickCity(value: string) {
    setCity(value);
    setCityOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setDone(null);

    if (!state) {
      setError("Please select your state");
      return;
    }
    if (!city) {
      setError("Please select your city");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/public/appointments/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          mobile: mobile.trim(),
          city,
          state,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        clinicName?: string;
      };
      if (!res.ok) {
        throw new Error(body.error ?? "Could not register. Please try again.");
      }
      setDone(
        body.message ??
          `Your patient account was created at ${body.clinicName ?? "the clinic"}. Login details were sent to your WhatsApp.`
      );
      setFullName("");
      setMobile("");
      setCity("");
      setState("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`mx-auto w-full max-w-4xl rounded-3xl border border-white/50 bg-white/60 p-8 shadow-2xl shadow-[#0D47A1]/20 backdrop-blur-xl ${className ?? ""}`}
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-[#0D47A1]/10">
          <Stethoscope className="size-5 text-[#0D47A1]" aria-hidden="true" />
        </div>
        <div className="text-left">
          <h2 className="text-lg font-bold text-gray-900">Book an appointment</h2>
          <p className="text-sm text-gray-600">
            Pick your city and state — we&apos;ll create your patient account and
            send your login details on WhatsApp.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* State */}
        <div ref={stateRef} className="relative">
          <Label htmlFor="appt-state" className="mb-1.5 block text-sm font-medium text-gray-700">
            State
          </Label>
          <button
            type="button"
            id="appt-state"
            onClick={() => {
              setStateQuery("");
              setStateOpen((v) => !v);
            }}
            aria-expanded={stateOpen}
            className={`flex h-11 w-full items-center justify-between gap-2 rounded-xl border bg-white px-3 text-left text-sm transition-colors outline-none focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-200 ${
              state ? "border-blue-300 text-gray-900" : "border-blue-200 text-gray-400"
            }`}
          >
            <span className="truncate">{state || "Select state"}</span>
            <Search className="size-4 shrink-0 text-gray-400" aria-hidden="true" />
          </button>
          {stateOpen && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-blue-200 bg-white shadow-lg">
              <div className="border-b border-blue-100 p-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                  <Input
                    value={stateQuery}
                    onChange={(e) => setStateQuery(e.target.value)}
                    placeholder="Search state..."
                    className="h-9 rounded-lg border-blue-200 bg-blue-50/40 pl-8 text-sm"
                    autoFocus
                  />
                </div>
              </div>
              <div role="listbox" className="max-h-56 overflow-y-auto p-1">
                {filteredStates.length === 0 && (
                  <div className="px-2.5 py-4 text-center text-sm text-gray-400">No states found</div>
                )}
                {filteredStates.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => pickState(s)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-blue-50 ${
                      s === state ? "bg-blue-50 font-medium text-gray-800" : "text-gray-700"
                    }`}
                  >
                    <MapPin className="size-3.5 shrink-0 text-blue-400" aria-hidden="true" />
                    <span className="truncate">{s}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* City */}
        <div ref={cityRef} className="relative">
          <Label htmlFor="appt-city" className="mb-1.5 block text-sm font-medium text-gray-700">
            City
          </Label>
          <button
            type="button"
            id="appt-city"
            disabled={!state}
            onClick={() => {
              setCityQuery("");
              setCityOpen((v) => !v);
            }}
            aria-expanded={cityOpen}
            className={`flex h-11 w-full items-center justify-between gap-2 rounded-xl border bg-white px-3 text-left text-sm transition-colors outline-none focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60 ${
              city ? "border-blue-300 text-gray-900" : "border-blue-200 text-gray-400"
            }`}
          >
            <span className="truncate">{city || (state ? "Select city" : "Select state first")}</span>
            <Search className="size-4 shrink-0 text-gray-400" aria-hidden="true" />
          </button>
          {cityOpen && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-blue-200 bg-white shadow-lg">
              <div className="border-b border-blue-100 p-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                  <Input
                    value={cityQuery}
                    onChange={(e) => setCityQuery(e.target.value)}
                    placeholder="Search city..."
                    className="h-9 rounded-lg border-blue-200 bg-blue-50/40 pl-8 text-sm"
                    autoFocus
                  />
                </div>
              </div>
              <div role="listbox" className="max-h-56 overflow-y-auto p-1">
                {filteredCities.length === 0 && (
                  <div className="px-2.5 py-4 text-center text-sm text-gray-400">No cities found</div>
                )}
                {filteredCities.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => pickCity(c)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-blue-50 ${
                      c === city ? "bg-blue-50 font-medium text-gray-800" : "text-gray-700"
                    }`}
                  >
                    <MapPin className="size-3.5 shrink-0 text-blue-400" aria-hidden="true" />
                    <span className="truncate">{c}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="appt-name" className="text-sm font-medium text-gray-700">
            Full name
          </Label>
          <Input
            id="appt-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
            required
            className="h-11 rounded-xl border-blue-200 bg-white text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="appt-mobile" className="text-sm font-medium text-gray-700">
            WhatsApp number
          </Label>
          <Input
            id="appt-mobile"
            type="tel"
            inputMode="tel"
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/[^\d+]/g, "").slice(0, 15))}
            placeholder="+91 98765 43210"
            required
            className="h-11 rounded-xl border-blue-200 bg-white text-sm"
          />
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
      {done && (
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <span className="mt-0.5">✓</span>
          {done}
        </p>
      )}

      <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
        <p className="text-xs text-gray-500">
          Your login credentials are sent securely to your WhatsApp number.
        </p>
        <Button type="submit" disabled={loading} size="lg" className="w-full sm:w-auto sm:px-8">
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Creating account...
            </>
          ) : (
            "Book appointment"
          )}
        </Button>
      </div>
    </form>
  );
}