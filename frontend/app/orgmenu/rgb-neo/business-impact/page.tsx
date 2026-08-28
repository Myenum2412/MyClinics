"use client";

import * as React from "react";
import { toast } from "sonner";
import { getOrgIncidents, type OrgIncidentItem } from "@/lib/neo-api";
import { NeoIncidentCard } from "@/components/org/neo/neo-incident-card";
import { SectionCard, LoadingState, ErrorState, EmptyState } from "@/components/org/neo/neo-ui";

export default function RgbNeoBusinessImpactPage() {
  const [items, setItems] = React.useState<OrgIncidentItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await getOrgIncidents({ limit: 200 });
        setItems(res.items);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
        toast.error("Failed to load business impact");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingState label="Loading business impact…" />;
  if (error) return <ErrorState message={error} />;

  const business = items.filter((i) => i.category === "business");
  const highImpact = business.filter((i) => ["high", "critical"].includes(i.businessImpact?.level ?? ""));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Business Impact</h1>
        <p className="text-sm text-muted-foreground">
          Operational and revenue impact of incidents on clinic operations
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase text-muted-foreground">Business Incidents</p>
          <p className="text-2xl font-bold">{business.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase text-muted-foreground">High Impact</p>
          <p className="text-2xl font-bold text-red-600">{highImpact.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase text-muted-foreground">Active Business</p>
          <p className="text-2xl font-bold">{business.filter((i) => !["RESOLVED", "CLOSED"].includes(i.status)).length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase text-muted-foreground">Categories</p>
          <p className="text-2xl font-bold">{new Set(business.map((i) => i.category)).size}</p>
        </div>
      </div>

      {business.length === 0 ? (
        <EmptyState message="No business-impact incidents recorded yet." />
      ) : (
        <SectionCard title="Business Incidents">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {business.map((i) => (
              <NeoIncidentCard key={i.incidentId} incident={i} />
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
