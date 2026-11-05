"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";

/** Collapsible, numbered section card used across forms (patients, examinations, …). */
export function SectionCard({
  title,
  description,
  action,
  children,
  defaultOpen = true,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="p-4 shadow-2xs overflow-hidden">
      <CardHeader className="p-0 pb-3">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex flex-1 items-center justify-between gap-4 text-left"
            aria-expanded={open}
          >
            <div>
              <CardTitle className="font-medium text-foreground text-sm">
                {title}
              </CardTitle>
              {description && (
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              )}
            </div>
            <span className={`flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-background transition-transform ${open ? "rotate-180" : ""}`}>
              <ChevronLeft className="-rotate-90 size-4 text-muted-foreground" />
            </span>
          </button>
          {action && <div onClick={(e) => e.stopPropagation()}>{action}</div>}
        </div>
      </CardHeader>
      {open && <CardContent className="space-y-4 p-0">{children}</CardContent>}
    </Card>
  );
}
