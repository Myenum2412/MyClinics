"use client";

import * as React from "react";
import { toast } from "sonner";
import { listAllClinics, type Clinic } from "@/lib/clinic-api";
import {
  getOrgOverview,
  getOrgIncidents,
  getOrgPredictions,
  type OrgOverview,
  type OrgIncidentItem,
  type Prediction,
} from "@/lib/neo-api";
import { NeoStatusMonitor } from "@/components/org/neo/neo-status-monitor";
import { NeoIncidentCard } from "@/components/org/neo/neo-incident-card";
import { NeoLiveEvents } from "@/components/org/neo/neo-live-events";
import { SectionCard, LoadingState, ErrorState, EmptyState } from "@/components/org/neo/neo-ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function RgbNeoCommandCenter() {
  const [clinics, setClinics] = React.useState<Clinic[]>([]);
  const [selectedClinic, setSelectedClinic] = React.useState("");
  const [overview, setOverview] = React.useState<OrgOverview | null>(null);
  const [incidents, setIncidents] = React.useState<OrgIncidentItem[]>([]);
  const [predictions, setPredictions] = React.useState<Prediction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await listAllClinics({ limit: 200 });
        setClinics(res.items);
        if (res.items[0]) setSelectedClinic(res.items[0].clinicId);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  React.useEffect(() => {
    (async () => {
      try {
        const [ov, inc, pred] = await Promise.all([
          getOrgOverview(),
          getOrgIncidents({ limit: 6 }).catch(() => ({ items: [], total: 0 })),
          getOrgPredictions().catch(() => ({ items: [] as Prediction[] })),
        ]);
        setOverview(ov);
        setIncidents(inc.items);
        setPredictions(pred.items);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load command center");
        toast.error("Failed to load command center");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activeIncidents = incidents.filter((i) => !["RESOLVED", "CLOSED"].includes(i.status));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">RGB Neo · Command Center</h1>
        <p className="text-sm text-muted-foreground">
          Real-time observability, incident intelligence and predictive risk across the organization.
        </p>
      </div>

      {loading ? (
        <LoadingState label="Loading command center…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : overview ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs uppercase text-muted-foreground">Monitored</p>
              <p className="text-2xl font-bold">{overview.monitoredClinics}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs uppercase text-muted-foreground">Healthy</p>
              <p className="text-2xl font-bold text-green-600">{overview.healthy}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs uppercase text-muted-foreground">Warning</p>
              <p className="text-2xl font-bold text-amber-600">{overview.warning}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs uppercase text-muted-foreground">Critical</p>
              <p className="text-2xl font-bold text-red-600">{overview.critical}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs uppercase text-muted-foreground">Active Incidents</p>
              <p className="text-2xl font-bold">{overview.activeIncidents}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs uppercase text-muted-foreground">Predicted Risks</p>
              <p className="text-2xl font-bold text-purple-600">{overview.predictedRisks}</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              title="Service Health"
              description="Select a clinic to inspect its service timeline"
              action={
                clinics.length > 0 ? (
                  <Select value={selectedClinic} onValueChange={(v) => setSelectedClinic(v ?? "")}>
                    <SelectTrigger className="h-8 w-44">
                      <SelectValue placeholder="Select clinic" />
                    </SelectTrigger>
                    <SelectContent>
                      {clinics.map((c) => (
                        <SelectItem key={c.clinicId} value={c.clinicId}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : undefined
              }
            >
              {selectedClinic ? (
                <NeoStatusMonitor clinicId={selectedClinic} />
              ) : (
                <EmptyState message="No clinic available." />
              )}
            </SectionCard>

            <SectionCard title={`Critical / Active Incidents (${activeIncidents.length})`}>
              {activeIncidents.length === 0 ? (
                <EmptyState message="No active incidents. Systems nominal." />
              ) : (
                <div className="grid gap-3">
                  {activeIncidents.slice(0, 4).map((i) => (
                    <NeoIncidentCard key={i.incidentId} incident={i} />
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard title="Predicted Risks">
              {predictions.length === 0 ? (
                <EmptyState message="No predicted risks from current telemetry." />
              ) : (
                <ul className="space-y-2">
                  {predictions.slice(0, 5).map((p, idx) => (
                    <li key={idx} className="rounded-md border border-border p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs">{p.clinicId}</span>
                        <span className="text-xs font-semibold uppercase text-purple-600">{p.risk}</span>
                      </div>
                      <p className="mt-1 text-sm font-medium">{p.service}</p>
                      <p className="text-xs text-muted-foreground">{p.basis}</p>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="Live Event Stream" description="Auto-refreshing">
              <NeoLiveEvents limit={12} intervalMs={5000} />
            </SectionCard>
          </div>
        </>
      ) : null}
    </div>
  );
}
