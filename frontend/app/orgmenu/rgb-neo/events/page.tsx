"use client";

import * as React from "react";
import { toast } from "sonner";
import { getOrgEvents, type StreamEvent } from "@/lib/neo-api";
import { SectionCard, LoadingState, ErrorState, EmptyState } from "@/components/org/neo/neo-ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatTimeOnly } from "@/lib/datetime";
import { cn } from "@/lib/utils";

const SEV_DOT: Record<string, string> = {
  critical: "bg-red-600", high: "bg-orange-600", medium: "bg-amber-600", low: "bg-blue-600", info: "bg-muted-foreground",
};

export default function RgbNeoEventsPage() {
  const [items, setItems] = React.useState<StreamEvent[]>([]);
  const [severity, setSeverity] = React.useState("all");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await getOrgEvents({ limit: 100, severity: severity === "all" ? undefined : severity });
      setItems(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load events");
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [severity]);

  React.useEffect(() => {
    (async () => { await load(); })();
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Events</h1>
          <p className="text-sm text-muted-foreground">Raw telemetry across the organization</p>
        </div>
          <Select value={severity} onValueChange={(v) => setSeverity(v ?? "all")}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <LoadingState label="Loading events…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState message="No events match the current filter." />
      ) : (
        <SectionCard title={`${items.length} events`}>
          <ul className="divide-y divide-border">
            {items.map((e) => (
              <li key={e.eventId} className="flex items-center gap-3 py-2 text-sm">
                <span className={cn("size-2 shrink-0 rounded-full", SEV_DOT[e.severity] ?? "bg-muted")} />
                <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">{formatTimeOnly(e.timestamp)}</span>
                <span className="w-40 shrink-0 truncate font-mono text-xs">{e.clinicId}</span>
                <span className="w-52 shrink-0 truncate font-medium">{e.eventType}</span>
                <span className="w-32 shrink-0 truncate text-xs text-muted-foreground">{e.service}</span>
                <span className="truncate text-xs text-muted-foreground">{e.message ?? ""}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}
