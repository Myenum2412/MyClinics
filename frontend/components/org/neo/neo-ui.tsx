"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    critical: "bg-red-600/15 text-red-600 border-red-600/30",
    high: "bg-orange-600/15 text-orange-600 border-orange-600/30",
    medium: "bg-amber-600/15 text-amber-600 border-amber-600/30",
    low: "bg-blue-600/15 text-blue-600 border-blue-600/30",
    info: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold uppercase", map[severity] ?? map.info)}>
      {severity}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const open = !["RESOLVED", "CLOSED", "RECOVERED"].includes(status);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        open ? "bg-amber-600/10 text-amber-600 border-amber-600/30" : "bg-green-600/10 text-green-600 border-green-600/30"
      )}
    >
      {status}
    </span>
  );
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("p-4 shadow-2xs", className)}>
      <CardHeader className="p-0 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="font-medium text-foreground text-sm">{title}</CardTitle>
            {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      <p>{message}</p>
      {onRetry ? (
        <button onClick={onRetry} className="mt-2 text-xs font-medium underline">
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
