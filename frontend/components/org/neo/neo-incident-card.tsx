"use client";

import * as React from "react";
import Link from "next/link";
import { SeverityBadge, StatusBadge } from "@/components/org/neo/neo-ui";
import type { OrgIncidentItem } from "@/lib/neo-api";

/** Compact incident row used in lists and the command center. */
export function NeoIncidentCard({ incident }: { incident: OrgIncidentItem }) {
  return (
    <Link
      href={`/orgmenu/rgb-neo/incidents/${incident.incidentId}?clinicId=${incident.clinicId}`}
      className="block rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/50 hover:bg-accent/40"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SeverityBadge severity={incident.severity} />
          <span className="text-xs font-mono text-muted-foreground">{incident.priority}</span>
        </div>
        <StatusBadge status={incident.status} />
      </div>
      <p className="mt-1.5 truncate text-sm font-medium text-foreground">{incident.title}</p>
      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-mono">{incident.clinicId}</span>
        <span>
          {incident.eventCount} events · {incident.businessImpact.level} impact
        </span>
      </div>
    </Link>
  );
}
