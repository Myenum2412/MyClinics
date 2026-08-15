"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2Icon,
  ChevronDownIcon,
  Loader2Icon,
  MapPinIcon,
} from "lucide-react";

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

type NominatimResult = {
  osm_type?: string;
  osm_id?: number;
};

type OverpassElement = {
  tags?: { name?: string };
};

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function loadCitiesForState(state: string): Promise<string[]> {
  const boundary = (await fetchJson(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&country=India&state=${encodeURIComponent(state)}`
  )) as NominatimResult[];

  if (!boundary.length || !boundary[0].osm_id) return [];

  const { osm_type, osm_id } = boundary[0];
  if (osm_type !== "relation" && osm_type !== "way") return [];
  const areaId = (osm_type === "relation" ? 3600000000 : 2400000000) + osm_id;

  const query = `
[out:json][timeout:30];
area(${areaId})->.a;
(node["place"~"^(city|town|village)$"](area.a););
out tags 400;
`;

  let elements: OverpassElement[] = [];
  let lastError: unknown = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const data = (await fetchJson(
        `${endpoint}?data=${encodeURIComponent(query)}`
      )) as { elements?: OverpassElement[] };
      elements = data.elements ?? [];
      break;
    } catch (error) {
      lastError = error;
    }
  }
  if (!elements.length && lastError) throw lastError;

  const seen = new Set<string>();
  const list: string[] = [];
  for (const e of elements) {
    const name = e.tags?.name;
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(name);
  }
  return list.sort();
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
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!state) return;
    let cancelled = false;
    loadCitiesForState(state)
      .then((list) => {
        if (cancelled) return;
        setCities(list);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Could not load cities. Try again.");
      })
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
              setCities([]);
              setLoadError("");
              if (e.target.value) setLoadingCities(true);
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
            disabled={!state || loadingCities}
            className={selectClass + " appearance-none pl-9 pr-8"}
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
          <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-black/40" />
        </div>
      </div>

      {loadingCities && (
        <p className="flex items-center gap-1.5 text-xs text-black/50">
          <Loader2Icon className="size-3.5 animate-spin" />
          Loading cities…
        </p>
      )}

      {loadError && <p className="text-xs text-red-600">{loadError}</p>}

      {selectedLabel && (
        <p className="text-xs text-black/50">
          Selected location:{" "}
          <span className="font-medium text-black">{selectedLabel}</span>
        </p>
      )}
    </div>
  );
}