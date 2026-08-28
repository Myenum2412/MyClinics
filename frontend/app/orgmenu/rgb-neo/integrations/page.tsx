"use client";

import * as React from "react";
import { listAllClinics, type Clinic } from "@/lib/clinic-api";
import { getClinicStatus, type ServiceStatus } from "@/lib/neo-api";
import { SectionCard, LoadingState, EmptyState, ErrorState } from "@/components/org/neo/neo-ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const INTEGRATION_KEYWORDS = ["whatsapp", "sms", "email", "payment", "integration", "gateway", "external"];

function isIntegration(service: string) {
  const s = service.toLowerCase();
  return INTEGRATION_KEYWORDS.some((k) => s.includes(k));
}

const DOT: Record<ServiceStatus["status"], string> = {
  operational: "bg-green-600",
  degraded: "bg-amber-600",
  critical: "bg-red-600",
  unknown: "bg-muted",
};

export default function RgbNeoIntegrationsPage() {
  const [clinics, setClinics] = React.useState<Clinic[]>([]);
  const [selected, setSelected] = React.useState("");
  const [statuses, setStatuses] = React.useState<ServiceStatus[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    listAllClinics({ limit: 200 })
      .then((res) => {
        setClinics(res.items);
        if (res.items[0]) setSelected(res.items[0].clinicId);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    if (!selected) return;
    (async () => {
      try {
        const r = await getClinicStatus(selected);
        setStatuses(r.items);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    })();
  }, [selected]);

  const integrationStatuses = (statuses ?? []).filter((s) => isIntegration(s.service));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Integrations</h1>
        <p className="text-sm text-muted-foreground">WhatsApp, SMS, email, payment and external API health</p>
      </div>
      <SectionCard
        title="Integration Status"
        action={
          !loading && clinics.length > 0 ? (
            <Select value={selected} onValueChange={(v) => setSelected(v ?? "")}>
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
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : integrationStatuses.length === 0 ? (
          <EmptyState message="No integration telemetry yet for this clinic. Integration services appear here once events name them (e.g. WHATSAPP_FAILURE, PAYMENT_GATEWAY_FAILURE)." />
        ) : (
          <ul className="divide-y divide-border">
            {integrationStatuses.map((s) => (
              <li key={s.service} className="flex items-center justify-between py-2 text-sm">
                <span className="flex items-center gap-2">
                  <span className={cn("size-2.5 rounded-full", DOT[s.status])} />
                  {s.service}
                </span>
                <span className="font-mono text-xs text-muted-foreground">{s.status}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
