"use client";

import * as React from "react";
import { listAllClinics, type Clinic } from "@/lib/clinic-api";
import { NeoStatusMonitor } from "@/components/org/neo/neo-status-monitor";
import { SectionCard, LoadingState } from "@/components/org/neo/neo-ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function RgbNeoPerformancePage() {
  const [clinics, setClinics] = React.useState<Clinic[]>([]);
  const [selected, setSelected] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    listAllClinics({ limit: 200 })
      .then((res) => {
        setClinics(res.items);
        if (res.items[0]) setSelected(res.items[0].clinicId);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Performance & Reliability</h1>
        <p className="text-sm text-muted-foreground">Service latency, error rate and status timelines</p>
      </div>
      <SectionCard
        title="Service Status Timelines"
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
        {loading ? <LoadingState /> : selected ? <NeoStatusMonitor clinicId={selected} /> : <p className="text-sm text-muted-foreground">No clinic selected.</p>}
      </SectionCard>
    </div>
  );
}
