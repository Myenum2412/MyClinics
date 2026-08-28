"use client";

import * as React from "react";
import { RadioIcon } from "lucide-react";
import { getOrgEvents, type StreamEvent } from "@/lib/neo-api";
import { cn } from "@/lib/utils";
import { formatTimeOnly } from "@/lib/datetime";

const SEV_DOT: Record<string, string> = {
  critical: "bg-red-600",
  high: "bg-orange-600",
  medium: "bg-amber-600",
  low: "bg-blue-600",
  info: "bg-muted-foreground",
};

/**
 * Real-time event stream. Polls the backend event stream on an interval and
 * animates new entries in. Never fabricates events — when the backend has none,
 * it shows an honest empty state.
 */
export function NeoLiveEvents({ limit = 40, intervalMs = 5000 }: { limit?: number; intervalMs?: number }) {
  const [events, setEvents] = React.useState<StreamEvent[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = React.useState<Date | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { items } = await getOrgEvents({ limit });
        if (cancelled) return;
        setEvents(items);
        setUpdatedAt(new Date());
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load stream");
      }
    };
    load();
    const id = setInterval(load, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [limit, intervalMs]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <RadioIcon className="size-3.5 text-red-600 animate-pulse" /> LIVE EVENT STREAM
        </span>
        {updatedAt ? (
          <span className="text-xs text-muted-foreground">updated {formatTimeOnly(updatedAt.toISOString())}</span>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : events.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No events ingested yet. RGB Neo reflects real telemetry as it arrives.
        </p>
      ) : (
        <ul className="max-h-[420px] space-y-1 overflow-auto pr-1">
          {events.map((e) => (
            <li
              key={e.eventId}
              className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2 text-sm"
            >
              <span className={cn("size-2 shrink-0 rounded-full", SEV_DOT[e.severity] ?? "bg-muted")} />
              <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
                {formatTimeOnly(e.timestamp)}
              </span>
              <span className="w-40 shrink-0 truncate font-mono text-xs text-foreground">{e.clinicId}</span>
              <span className="w-48 shrink-0 truncate font-medium text-foreground">{e.eventType}</span>
              <span className="truncate text-xs text-muted-foreground">{e.service}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
