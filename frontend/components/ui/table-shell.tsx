import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Flush card wrapper used by the `@7ovr/table-1` table design: square corners,
 * a single border and no padding so the table and footer span edge to edge.
 */
export function TableShell({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="table-shell"
      className={cn(
        "overflow-hidden rounded-none border border-border bg-card",
        className
      )}
      {...props}
    />
  );
}

/** Muted toolbar shown above the table while rows are selected. */
export function TableSelectionBar({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="table-selection-bar"
      className={cn(
        "mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-2.5",
        className
      )}
      {...props}
    />
  );
}
