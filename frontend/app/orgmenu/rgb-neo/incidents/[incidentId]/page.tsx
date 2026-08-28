"use client";

import * as React from "react";
import { useParams, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  getIncidentDetail,
  transitionIncident,
  resolveIncident,
  type IncidentDetail,
  type IncidentStatus,
} from "@/lib/neo-api";
import { SeverityBadge, StatusBadge, SectionCard, LoadingState, ErrorState } from "@/components/org/neo/neo-ui";
import { NeoTimeline } from "@/components/org/neo/neo-timeline";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUSES = [
  "DETECTED", "TRIAGED", "INVESTIGATING", "ROOT_CAUSE_IDENTIFIED",
  "ACTION_RECOMMENDED", "REMEDIATION", "MONITORING", "RECOVERED", "RESOLVED", "CLOSED",
];

function IncidentDetailInner() {
  const params = useParams();
  const search = useSearchParams();
  const incidentId = String(params.incidentId);
  const clinicId = search.get("clinicId") ?? "";

  const [detail, setDetail] = React.useState<IncidentDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!clinicId) {
      setError("Missing clinic context for this incident.");
      setLoading(false);
      return;
    }
    try {
      setDetail(await getIncidentDetail(incidentId, clinicId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load incident");
    } finally {
      setLoading(false);
    }
  }, [incidentId, clinicId]);

  React.useEffect(() => {
    (async () => { await load(); })();
  }, [load]);

  const onTransition = async (status: IncidentStatus) => {
    if (!detail) return;
    setBusy(true);
    try {
      await transitionIncident(incidentId, clinicId, status);
      toast.success(`Status set to ${status}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setBusy(false);
    }
  };

  const onResolve = async (verified: boolean) => {
    setBusy(true);
    try {
      await resolveIncident(incidentId, clinicId, verified);
      toast.success(verified ? "Resolved (verified)" : "Kept in monitoring");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to resolve");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingState label="Loading incident…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!detail) return null;

  const rc = detail.rootCause;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-xs text-muted-foreground">{detail.incidentId}</p>
        <h1 className="text-xl font-semibold">{detail.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <SeverityBadge severity={detail.severity} />
          <span className="text-xs font-mono text-muted-foreground">{detail.priority}</span>
          <StatusBadge status={detail.status} />
          <span className="text-xs text-muted-foreground">{detail.category}</span>
          <span className="text-xs font-mono text-muted-foreground">{detail.clinicId}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Root Cause Analysis" description={rc ? `Confidence ${rc.confidence}% · ${rc.classification}` : "Not yet analyzed"}>
          {rc ? (
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-semibold text-foreground">Observed</p>
                <p className="text-muted-foreground">{rc.observed}</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Probable Root Cause</p>
                <p className="text-muted-foreground">{rc.probableRootCause}</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Evidence</p>
                <ul className="list-disc pl-4 text-muted-foreground">
                  {rc.evidence.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="rounded-md border border-border p-2">
                  <p className="text-xs font-semibold text-foreground">Technical</p>
                  <p className="text-xs text-muted-foreground">{rc.technical}</p>
                </div>
                <div className="rounded-md border border-border p-2">
                  <p className="text-xs font-semibold text-foreground">Business</p>
                  <p className="text-xs text-muted-foreground">{rc.business}</p>
                </div>
              </div>
              <div>
                <p className="font-semibold text-foreground">Recommended Verification</p>
                <p className="text-muted-foreground">{rc.recommendedVerification}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">AI root-cause analysis pending or unavailable.</p>
          )}
        </SectionCard>

        <SectionCard title="Impact & Blast Radius">
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-md border border-border p-2">
              <p className="text-lg font-bold">{detail.blastRadius.clinics}</p>
              <p className="text-xs text-muted-foreground">Clinics</p>
            </div>
            <div className="rounded-md border border-border p-2">
              <p className="text-lg font-bold">{detail.blastRadius.services}</p>
              <p className="text-xs text-muted-foreground">Services</p>
            </div>
            <div className="rounded-md border border-border p-2">
              <p className="text-lg font-bold">{detail.blastRadius.requests}</p>
              <p className="text-xs text-muted-foreground">Requests</p>
            </div>
            <div className="rounded-md border border-border p-2">
              <p className="text-lg font-bold">{detail.blastRadius.transactions}</p>
              <p className="text-xs text-muted-foreground">Transactions</p>
            </div>
            <div className="rounded-md border border-border p-2">
              <p className="text-lg font-bold">{detail.businessImpact.patients}</p>
              <p className="text-xs text-muted-foreground">Patients</p>
            </div>
            <div className="rounded-md border border-border p-2">
              <p className="text-lg font-bold text-red-600">{detail.businessImpact.level}</p>
              <p className="text-xs text-muted-foreground">Impact</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{detail.businessImpact.summary}</p>
          <div className="mt-2">
            <p className="text-xs font-semibold text-foreground">Affected services</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {detail.affectedServices.map((s) => (
                <span key={s} className="rounded bg-muted px-2 py-0.5 text-xs font-mono">{s}</span>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Timeline">
        <NeoTimeline entries={detail.timeline} />
      </SectionCard>

      <SectionCard title="Actions" description="Lifecycle transitions require explicit confirmation">
        <div className="flex flex-wrap items-center gap-3">
            <Select onValueChange={(v) => { if (v) onTransition(v as IncidentStatus); }} disabled={busy}>
            <SelectTrigger className="h-9 w-56">
              <SelectValue placeholder="Change status…" />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => onResolve(false)} disabled={busy}>
            Mark Monitoring
          </Button>
          <Button onClick={() => onResolve(true)} disabled={busy}>
            Resolve (Verified)
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}

export default function RgbNeoIncidentDetail() {
  return (
    <React.Suspense fallback={<LoadingState label="Loading incident…" />}>
      <IncidentDetailInner />
    </React.Suspense>
  );
}
