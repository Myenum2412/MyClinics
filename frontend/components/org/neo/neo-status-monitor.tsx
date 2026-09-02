"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import StatusMonitor from "@/components/8starlabs-ui/status-monitor";
import { getClinicStatus, getClinicTimeline, type ServiceStatus } from "@/lib/neo-api";
import { cn } from "@/lib/utils";

const STATUS_DOT: Record<ServiceStatus["status"], string> = {
  operational: "bg-green-600",
  degraded: "bg-amber-600",
  critical: "bg-red-600",
  unknown: "bg-muted",
};

const STATUS_LABEL: Record<ServiceStatus["status"], string> = {
  operational: "Operational",
  degraded: "Degraded",
  critical: "Critical",
  unknown: "No data",
};

/**
 * Service health monitor built on the supplied Status Monitor component.
 * Fetches each service's real status and a 90-day daily status timeline, then
 * renders the component per service. Empty history is shown as "No data"
 * rather than fabricated uptime.
 */
export function NeoStatusMonitor({ clinicId }: { clinicId: string }) {
  const [statuses, setStatuses] = React.useState<ServiceStatus[] | null>(null);
  const [timelines, setTimelines] = React.useState<Record<string, { status: "normal" | "warning" | "error" | "empty"; info: string; timestamp?: string }[]>>({});
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items } = await getClinicStatus(clinicId);
        if (cancelled) return;
        setStatuses(items);
        const top = items.slice(0, 8);
        const entries = await Promise.all(
          top.map(async (s) => {
            const data = await getClinicTimeline(clinicId, s.service);
            return [s.service, data.timeline] as const;
          })
        );
        if (cancelled) return;
        const map: Record<string, { status: "normal" | "warning" | "error" | "empty"; info: string; timestamp?: string }[]> = {};
        for (const [svc, tl] of entries) map[svc] = tl as never;
        setTimelines(map);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load status");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clinicId]);

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  if (!statuses) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading service health…
      </div>
    );
  }
  if (statuses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No telemetry yet for this clinic. RGB Neo will reflect live service health as events are ingested.
      </p>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {statuses.slice(0, 8).map((s) => (
        <div key={s.service} className="rounded-none border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={cn("size-2.5 rounded-full", STATUS_DOT[s.status])} />
              <span className="text-sm font-medium">{s.service}</span>
            </div>
            <span
              className={cn(
                "text-xs font-semibold",
                s.status === "operational" && "text-green-600",
                s.status === "degraded" && "text-amber-600",
                s.status === "critical" && "text-red-600",
                s.status === "unknown" && "text-muted-foreground"
              )}
            >
              {STATUS_LABEL[s.status]}
            </span>
          </div>
          <StatusMonitor
            statuses={timelines[s.service] ?? []}
            title={s.service}
            unit="days"
            showUptime
          />
          {s.aiDiagnosis ? (
            <p className="mt-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">AI:</span> {s.aiDiagnosis}
            </p>
          ) : null}
          {typeof s.currentLatencyMs === "number" ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Latency {s.currentLatencyMs}ms
              {typeof s.errorRate === "number" ? ` · Error ${s.errorRate}%` : ""}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
