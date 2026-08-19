"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { listDoctors, listPatients } from "@/lib/clinic-api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Check, ChevronsUpDown, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";

/** Doctor options loader, cached per clinicId. */
export function useDoctorOptions(clinicId: string) {
  const [doctors, setDoctors] = useState<{ doctorId: string; name: string }[]>([]);
  useEffect(() => {
    if (!clinicId) return;
    let active = true;
    listDoctors(clinicId, { status: "active", limit: 200 })
      .then((res) => {
        if (active) setDoctors(res.items.map((d) => ({ doctorId: d.doctorId, name: d.name })));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [clinicId]);
  return doctors;
}

/** Patient options loader, cached per clinicId. */
export function usePatientOptions(clinicId: string) {
  const [patients, setPatients] = useState<{ patientId: string; fullName: string }[]>([]);
  useEffect(() => {
    if (!clinicId) return;
    let active = true;
    listPatients(clinicId, { status: "active", limit: 200 })
      .then((res) => {
        if (active) setPatients(res.items.map((p) => ({ patientId: p.patientId, fullName: p.fullName })));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [clinicId]);
  return patients;
}

export function DoctorSelect({
  clinicId,
  value,
  onChange,
  required,
  allowEmpty,
}: {
  clinicId: string;
  value: string | null;
  onChange: (v: string | null) => void;
  required?: boolean;
  allowEmpty?: boolean;
}) {
  const doctors = useDoctorOptions(clinicId);
  return (
    <Select
      value={value ?? ""}
      onValueChange={(v) => onChange(v === "" ? null : v)}
      required={required}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select doctor" />
      </SelectTrigger>
      <SelectContent>
        {allowEmpty && <SelectItem value="">None</SelectItem>}
        {doctors.map((d) => (
          <SelectItem key={d.doctorId} value={d.doctorId}>
            {d.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Searchable doctor combobox — type to filter, click to select.
 */
export function DoctorComboBox({
  clinicId,
  value,
  onChange,
  required,
  placeholder = "Search doctor...",
  searchPlaceholder = "Type to search doctors...",
}: {
  clinicId: string;
  value: string | null;
  onChange: (v: string | null) => void;
  required?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
}) {
  const doctors = useDoctorOptions(clinicId);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = doctors.find((d) => d.doctorId === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter((d) => d.name.toLowerCase().includes(q));
  }, [doctors, query]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setQuery("");
          requestAnimationFrame(() => searchRef.current?.focus());
        }}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-xl border bg-white px-3 text-left text-sm",
          open ? "border-blue-400 ring-2 ring-blue-200" : "border-blue-200",
          required && !value && "border-blue-200"
        )}
      >
        <span className={cn("truncate", selected ? "text-gray-900" : "text-gray-400")}>
          {selected ? selected.name : placeholder}
        </span>
        <ChevronsUpDown className="ml-2 size-4 shrink-0 text-gray-400" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-blue-200 bg-white shadow-lg">
          <div className="relative border-b border-blue-100">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <Input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-10 border-0 bg-transparent pl-9 focus-visible:ring-0"
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-center text-sm text-gray-500">
                No doctors found
              </p>
            )}
            {filtered.map((d) => (
              <button
                key={d.doctorId}
                type="button"
                onClick={() => {
                  onChange(d.doctorId);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-blue-50",
                  d.doctorId === value && "bg-blue-50 text-blue-700"
                )}
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <User className="size-3.5" />
                </span>
                <span className="flex-1 truncate">{d.name}</span>
                {d.doctorId === value && <Check className="size-4 text-blue-600" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function PatientSelect({
  clinicId,
  value,
  onChange,
  required,
}: {
  clinicId: string;
  value: string | null;
  onChange: (v: string | null) => void;
  required?: boolean;
}) {
  const patients = usePatientOptions(clinicId);
  return (
    <Select value={value ?? ""} onValueChange={onChange} required={required}>
      <SelectTrigger>
        <SelectValue placeholder="Select patient" />
      </SelectTrigger>
      <SelectContent>
        {patients.map((p) => (
          <SelectItem key={p.patientId} value={p.patientId}>
            {p.fullName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}