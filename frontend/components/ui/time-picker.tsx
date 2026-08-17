"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) =>
  String(i * 5).padStart(2, "0")
);

function parse24(value: string): { hour: number; minute: number; period: "AM" | "PM" } | null {
  const [hh, mm] = value.split(":").map(Number);
  if (!Number.isInteger(hh) || !Number.isInteger(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) {
    return null;
  }
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;
  return { hour: hour12, minute: mm, period: hh >= 12 ? "PM" : "AM" };
}

function to24(hour: number, minute: number, period: "AM" | "PM"): string {
  const hh = period === "AM" ? hour % 12 : (hour % 12) + 12;
  return `${String(hh).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function TimePicker({ value, onChange, disabled }: TimePickerProps) {
  const [prevValue, setPrevValue] = useState(value);
  const [hour, setHour] = useState(() => parse24(value)?.hour ?? 12);
  const [minute, setMinute] = useState(() => parse24(value)?.minute ?? 0);
  const [period, setPeriod] = useState<"AM" | "PM">(
    () => parse24(value)?.period ?? "AM"
  );

  if (value !== prevValue) {
    setPrevValue(value);
    const parsed = parse24(value);
    if (parsed) {
      setHour(parsed.hour);
      setMinute(parsed.minute);
      setPeriod(parsed.period);
    }
  }

  function emit(nextHour: number, nextMinute: number, nextPeriod: "AM" | "PM") {
    onChange(to24(nextHour, nextMinute, nextPeriod));
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={String(hour)}
        disabled={disabled}
        onValueChange={(v) => emit(Number(v), minute, period)}
      >
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {HOURS.map((h) => (
            <SelectItem key={h} value={String(h)}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={String(minute)}
        disabled={disabled}
        onValueChange={(v) => emit(hour, Number(v), period)}
      >
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MINUTES.map((m) => (
            <SelectItem key={m} value={m}>
              :{m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={period}
        disabled={disabled}
        onValueChange={(v) => emit(hour, minute, v as "AM" | "PM")}
      >
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
