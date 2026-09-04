"use client";

import * as React from "react";
import { toast } from "sonner";
import { listAllClinics, type Clinic } from "@/lib/clinic-api";
import { getClinicHealth, type ClinicHealth } from "@/lib/neo-api";
import { LoadingState, ErrorState, EmptyState } from "@/components/org/neo/neo-ui";
import { cn } from "@/lib/utils";

function scoreTone(score: number) {
  return score >= 90 ? "text-green-600" : score >= 70 ? "text-amber-600" : "text-red-600";
}

export default function RgbNeoClinicsPage() {
  const [rows, setRows] = React.useState<{ clinic: Clinic; health: ClinicHealth | null; error?: string }[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const { items } = await listAllClinics({ limit: 200 });
      const results = await Promise.all(
        items.slice(0, 80).map(async (clinic) => {
          try {
            const health = await getClinicHealth(clinic.clinicId);
            return { clinic, health };
          } catch (e) {
            return { clinic, health: null, error: e instanceof Error ? e.message : "err" };
          }
        })
      );
      setRows(results);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load clinics");
      toast.error("Failed to load clinic health");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    (async () => { await load(); })();
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Clinic Health</h1>
        <p className="text-sm text-muted-foreground">Per-clinic health scores from real telemetry</p>
      </div>

      {loading ? (
        <LoadingState label="Computing clinic health…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : rows.length === 0 ? (
        <EmptyState message="No clinics found." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map(({ clinic, health }) => (
            <div key={clinic.clinicId} className="rounded-none border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="truncate text-sm font-medium">{clinic.name}</p>
                <span className={cn("text-lg font-bold", health ? scoreTone(health.score) : "text-muted-foreground")}>
                  {health ? `${health.score}` : ""}
                </span>
              </div>
              <p className="font-mono text-xs text-muted-foreground">{clinic.clinicId}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {health
                  ? health.hasData
                    ? `Status: ${health.status}`
                    : "No telemetry yet"
                  : "Health unavailable"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
