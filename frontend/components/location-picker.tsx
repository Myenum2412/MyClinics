"use client";

import { useMemo, useState } from "react";
import {
  BuildingOfficeIcon as Building2Icon,
  ChevronDownIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import {
  INDIAN_STATES,
  citiesForState,
} from "@/lib/india-locations";

export function LocationPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const initialParts = value ? value.split(",").map((s) => s.trim()) : [];

  const [state, setState] = useState(initialParts[1] ?? "");
  const [cities, setCities] = useState<string[]>(() =>
    state ? citiesForState(state) : []
  );
  const [city, setCity] = useState(initialParts[0] ?? "");

  const selectedLabel = useMemo(
    () => (city && state ? `${city}, ${state}` : ""),
    [city, state]
  );

  const selectClass =
    "w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm text-black outline-none transition-colors focus:border-[#2196F3] focus:ring-2 focus:ring-[#2196F3]/20 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="relative">
          <Building2Icon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-black/40" />
          <select
            value={state}
            onChange={(e) => {
              setState(e.target.value);
              setCity("");
              setCities(e.target.value ? citiesForState(e.target.value) : []);
              onChange("");
            }}
            className={selectClass + " appearance-none pl-9 pr-8"}
          >
            <option value="">Select state *</option>
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-black/40" />
        </div>

        <div className="relative">
          <MapPinIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-black/40" />
          <select
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              onChange(e.target.value ? `${e.target.value}, ${state}` : "");
            }}
            disabled={!state}
            className={selectClass + " appearance-none pl-9 pr-8"}
          >
            <option value="">Select city *</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-black/40" />
        </div>
      </div>

      {selectedLabel && (
        <p className="text-xs text-black/50">
          Selected location:{" "}
          <span className="font-medium text-black">{selectedLabel}</span>
        </p>
      )}
    </div>
  );
}