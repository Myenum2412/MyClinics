"use client";

import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface MetricStatItem {
  name: string;
  /** Primary figure shown large (count, currency, etc.). */
  value: string | number;
  /** Secondary line under the value. */
  detail: string;
  /** 0–100 progress fill. */
  percentage: number;
  /** Optional left icon. */
  icon?: ReactNode;
  /** CSS color for the progress fill / icon tint (e.g. var(--chart-1)). */
  accent?: string;
}

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function MetricStatCard({ item }: { item: MetricStatItem }) {
  const pct = clampPct(item.percentage);
  const accent = item.accent ?? "var(--chart-1)";

  return (
    <Card className="overflow-hidden border-border/70 bg-card shadow-none">
      <CardContent className="flex flex-col gap-3 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {item.icon ? (
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `color-mix(in oklab, ${accent} 14%, transparent)`, color: accent }}
              >
                {item.icon}
              </span>
            ) : null}
            <dt className="truncate text-sm font-medium text-muted-foreground">
              {item.name}
            </dt>
          </div>
          <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
            {pct}%
          </span>
        </div>

        <dd className="text-2xl font-semibold tracking-tight text-foreground tabular-nums sm:text-[1.65rem]">
          {item.value}
        </dd>

        <p className="text-xs text-muted-foreground">{item.detail}</p>

        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${item.name} ${pct}%`}
        >
          <div
            className={cn("h-full rounded-full transition-[width] duration-500 ease-out")}
            style={{ width: `${pct}%`, backgroundColor: accent }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function MetricStatGrid({
  items,
  className,
}: {
  items: MetricStatItem[];
  className?: string;
}) {
  return (
    <dl className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {items.map((item) => (
        <MetricStatCard key={item.name} item={item} />
      ))}
    </dl>
  );
}
