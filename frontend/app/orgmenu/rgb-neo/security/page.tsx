"use client";

import * as React from "react";
import { toast } from "sonner";
import { getOrgIncidents, type OrgIncidentItem } from "@/lib/neo-api";
import { NeoIncidentCard } from "@/components/org/neo/neo-incident-card";
import { SectionCard, LoadingState, ErrorState, EmptyState } from "@/components/org/neo/neo-ui";

export default function RgbNeoSecurityPage() {
  const [items, setItems] = React.useState<OrgIncidentItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await getOrgIncidents({ limit: 200 });
        setItems(res.items.filter((i) => i.category === "security"));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
        toast.error("Failed to load security incidents");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Security Monitoring</h1>
        <p className="text-sm text-muted-foreground">
          Authentication failures, suspicious activity and unauthorized access — independent severity and escalation
        </p>
      </div>
      {loading ? (
        <LoadingState label="Loading security incidents…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : items.length === 0 ? (
        <EmptyState message="No security incidents recorded." />
      ) : (
        <SectionCard title={`${items.length} security incidents`}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {items.map((i) => (
              <NeoIncidentCard key={i.incidentId} incident={i} />
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
