"use client";

import { useEffect, useState } from "react";
import { listDoctors, listPatients } from "@/lib/clinic-api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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