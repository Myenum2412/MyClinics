"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2Icon } from "lucide-react";

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  state_district?: string;
};

type NominatimResult = {
  address?: NominatimAddress;
};

function cityNameFromAddress(address: NominatimAddress): string | null {
  const city =
    address.city ??
    address.town ??
    address.village ??
    address.municipality ??
    address.state_district ??
    null;
  return typeof city === "string" && city.trim() ? city.trim() : null;
}

export function LocationPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const initialParts = value ? value.split(",").map((s) => s.trim()) : [];

  const [state, setState] = useState(initialParts[1] ?? "");
  const [cities, setCities] = useState<string[]>([]);
  const [city, setCity] = useState(initialParts[0] ?? "");
  const [loadingCities, setLoadingCities] = useState(false);

  useEffect(() => {
    if (!state) return;
    let cancelled = false;
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=50&country=India&state=${encodeURIComponent(state)}`;
    fetch(url)
      .then((r) => r.json())
      .then((results: NominatimResult[]) => {
        if (cancelled) return;
        const seen = new Set<string>();
        const list: string[] = [];
        for (const r of results) {
          const name = cityNameFromAddress(r.address ?? {});
          if (!name) continue;
          const key = name.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          list.push(name);
        }
        setCities(list.sort());
      })
      .catch(() => setCities([]))
      .finally(() => {
        if (!cancelled) setLoadingCities(false);
      });
    return () => {
      cancelled = true;
    };
  }, [state]);

  const selectedLabel = useMemo(
    () => (city && state ? `${city}, ${state}` : ""),
    [city, state]
  );

  const selectClass =
    "w-full rounded-lg border border-black bg-white px-3 py-2 text-sm text-black outline-none placeholder:text-black/40 focus:border-black focus:ring-2 focus:ring-black/20";

  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <select
          value={state}
          onChange={(e) => {
            setState(e.target.value);
            setCity("");
            setCities([]);
            if (e.target.value) setLoadingCities(true);
            onChange("");
          }}
          className={selectClass}
        >
          <option value="">Select state *</option>
          {INDIAN_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={city}
          onChange={(e) => {
            setCity(e.target.value);
            onChange(e.target.value ? `${e.target.value}, ${state}` : "");
          }}
          disabled={!state || loadingCities}
          className={selectClass + " disabled:cursor-not-allowed disabled:opacity-60"}
        >
          <option value="">
            {loadingCities ? "Loading cities…" : "Select city *"}
          </option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {loadingCities && (
        <p className="flex items-center gap-1.5 text-xs text-black/60">
          <Loader2Icon className="size-3.5 animate-spin" />
          Fetching cities from OpenStreetMap…
        </p>
      )}

      {selectedLabel && (
        <p className="text-xs text-black/60">
          Selected location:{" "}
          <span className="font-medium text-black">{selectedLabel}</span>
        </p>
      )}
    </div>
  );
}