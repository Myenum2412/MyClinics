"use client";

import * as React from "react";
import { formatTimeOnly } from "@/lib/datetime";

/** Renders an incident timeline from real timestamped entries. */
export function NeoTimeline({ entries }: { entries: { ts: string; label: string }[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No timeline entries yet.</p>;
  }
  return (
    <ol className="relative space-y-3 border-l border-border pl-4">
      {entries.map((e, i) => (
        <li key={i} className="relative">
          <span className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-primary/70" />
          <p className="text-sm text-foreground">{e.label}</p>
          <p className="text-xs text-muted-foreground">{formatTimeOnly(e.ts)}</p>
        </li>
      ))}
    </ol>
  );
}
