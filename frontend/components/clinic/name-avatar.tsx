"use client";

import { cn } from "@/lib/utils";

const COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
  "bg-cyan-100 text-cyan-700",
  "bg-orange-100 text-orange-700",
  "bg-teal-100 text-teal-700",
  "bg-fuchsia-100 text-fuchsia-700",
  "bg-indigo-100 text-indigo-700",
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return COLORS[hash % COLORS.length];
}

/** Initials avatar shown next to patient/doctor names in tables. */
export function NameAvatar({
  name,
  className,
  size = "sm",
}: {
  name: string;
  className?: string;
  size?: "xs" | "sm" | "md";
}) {
  const sizeClass =
    size === "xs"
      ? "size-5 text-[10px]"
      : size === "md"
        ? "size-9 text-sm"
        : "size-7.5 text-[11px]";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold select-none",
        sizeClass,
        colorFor(name),
        className
      )}
    >
      {initials(name)}
    </span>
  );
}