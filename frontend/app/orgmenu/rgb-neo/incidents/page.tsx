"use client";

import * as React from "react";
import { toast } from "sonner";
import { getOrgIncidents, type OrgIncidentItem } from "@/lib/neo-api";
import { NeoIncidentCard } from "@/components/org/neo/neo-incident-card";
import { LoadingState, ErrorState, EmptyState } from "@/components/org/neo/neo-ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function RgbNeoIncidentsPage() {
  const [items, setItems] = React.useState<OrgIncidentItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [severity, setSeverity] = React.useState("all");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await getOrgIncidents({
        limit: 100,
        severity: severity === "all" ? undefined : severity,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load incidents");
      toast.error("Failed to load incidents");
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
          <h1 className="text-xl font-semibold">Incidents</h1>
          <p className="text-sm text-muted-foreground">{total} total incidents</p>
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
        <LoadingState label="Loading incidents…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState message="No incidents match the current filter." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((i) => (
            <NeoIncidentCard key={i.incidentId} incident={i} />
          ))}
        </div>
      )}
    </div>
  );
}
