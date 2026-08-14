"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type PatientPick = {
  id: string;
  fullName: string;
  mobile: string;
  secondaryMobile?: string | null;
  age?: number | null;
  gender?: string | null;
  email?: string | null;
  whatsapp?: string | null;
};

export function PatientPicker({
  patients,
  value,
  onPick,
  id,
}: {
  patients: PatientPick[];
  value?: string;
  onPick: (patient: PatientPick) => void;
  id?: string;
}) {
  return (
    <Select
      value={value ?? ""}
      onValueChange={(selectedId) => {
        const patient = patients.find((p) => p.id === selectedId);
        if (patient) onPick(patient);
      }}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder="Select existing patient" />
      </SelectTrigger>
      <SelectContent>
        {patients.length ? (
          patients.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              <span>{p.fullName}</span>
              {p.mobile ? (
                <span className="ml-auto text-muted-foreground">{p.mobile}</span>
              ) : null}
            </SelectItem>
          ))
        ) : (
          <SelectItem value="none" disabled>
            No patients registered yet
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
