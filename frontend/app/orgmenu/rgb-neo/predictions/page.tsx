"use client";

import * as React from "react";
import { toast } from "sonner";
import { getOrgPredictions, type Prediction } from "@/lib/neo-api";
import { LoadingState, ErrorState, EmptyState } from "@/components/org/neo/neo-ui";

const RISK_COLOR: Record<string, string> = {
  high: "text-red-600 border-red-600/30 bg-red-600/10",
  medium: "text-amber-600 border-amber-600/30 bg-amber-600/10",
  low: "text-blue-600 border-blue-600/30 bg-blue-600/10",
};

export default function RgbNeoPredictionsPage() {
  const [items, setItems] = React.useState<Prediction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const { items } = await getOrgPredictions();
      setItems(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load predictions");
      toast.error("Failed to load predictions");
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
        <h1 className="text-xl font-semibold">Predictive Monitoring</h1>
        <p className="text-sm text-muted-foreground">
          Forecasted risks derived from real telemetry trends (no fabricated data)
        </p>
      </div>

      {loading ? (
        <LoadingState label="Analyzing trends…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState message="No predicted risks from the current telemetry." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((p, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono">{p.clinicId}</span>
                <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold uppercase ${RISK_COLOR[p.risk]}`}>
                  {p.risk} · {p.riskScore}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium">{p.service}</p>
              <p className="mt-1 text-xs text-muted-foreground">{p.basis}</p>
              <p className="mt-2 rounded-md bg-muted/50 p-2 text-xs text-foreground">{p.recommendation}</p>
              {p.horizonDays ? (
                <p className="mt-2 text-xs text-muted-foreground">Projected horizon: ~{p.horizonDays} days</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
