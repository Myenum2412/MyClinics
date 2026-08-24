"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { useDropdownOptions } from "@/lib/dropdown-options";

/** Static suggestions for prescription fields — free text is always allowed. */
export const DOSAGE_SUGGESTIONS = [
  "1 Tablet",
  "2 Tablets",
  "1/2 Tablet",
  "1 Capsule",
  "5 ml Syrup",
  "10 ml Syrup",
  "2 Puffs",
  "1 Sachet",
  "2 Drops",
  "1 Application",
];

export const FREQUENCY_SUGGESTIONS = [
  "1-0-1 (After food)",
  "1-1-1",
  "0-0-1 (Night)",
  "1-0-0 (Morning)",
  "Once a day",
  "Twice daily",
  "Thrice daily",
  "4 times a day",
  "Alternate day",
  "Weekly once",
  "SOS (As needed)",
];

export const DURATION_SUGGESTIONS = [
  "3 days",
  "5 days",
  "7 days",
  "10 days",
  "14 days",
  "21 days",
  "1 month",
  "2 months",
  "3 months",
  "Continue",
];

/**
 * Autocomplete text input: filters `options` as the user types and shows a
 * dropdown of matches. Typing a custom value is always allowed.
 */
export function SuggestionInput({
  value,
  onChange,
  options,
  placeholder,
  className,
  required,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return options.slice(0, 8);
    return options.filter((o) => o.toLowerCase().includes(q)).slice(0, 8);
  }, [value, options]);

  function update(v: string) {
    onChange(v);
    const rect = containerRef.current?.getBoundingClientRect();
    setDropUp(Boolean(rect) && window.innerHeight - (rect as DOMRect).bottom < 280 && (rect as DOMRect).top > 280);
    setOpen(true);
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={(e) => update(e.target.value)}
        onFocus={() => update(value)}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
        required={required}
      />
      {open && suggestions.length > 0 && (
        <div
          className={`absolute left-0 right-0 z-50 overflow-hidden rounded-xl border border-border bg-background shadow-lg ${
            dropUp ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          <div className="max-h-56 overflow-y-auto p-1">
            {suggestions.map((o) => (
              <button
                key={o}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(o);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-accent ${
                  o.toLowerCase() === value.trim().toLowerCase()
                    ? "bg-accent font-medium text-foreground"
                    : "text-foreground"
                }`}
              >
                <span className="truncate">{o}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Medicine-name input with autocomplete suggestions from the clinic's
 * "Common Medicines" dropdown options. Free text is saved as a new name.
 */
export function MedicineNameInput({
  clinicId,
  value,
  onChange,
  placeholder,
  className,
  required,
}: {
  clinicId: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}) {
  const { getOptions } = useDropdownOptions(clinicId);
  return (
    <SuggestionInput
      value={value}
      onChange={onChange}
      options={getOptions("medicines")}
      placeholder={placeholder || "Search or type medicine name..."}
      className={className}
      required={required}
    />
  );
}
