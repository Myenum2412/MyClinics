"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

/**
 * Shared row-selection state for the table-1 style checkbox column.
 * Keeps selection keyed by a stable row id so it survives filtering/paging.
 */
export function useRowSelection<T>(
  rows: readonly T[],
  getId: (row: T) => string
) {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  const allSelected =
    rows.length > 0 && rows.every((row) => selectedIds.has(getId(row)));
  const someSelected = rows.some((row) => selectedIds.has(getId(row)));

  const toggleAll = React.useCallback(
    (checked: boolean) => {
      setSelectedIds(checked ? new Set(rows.map(getId)) : new Set());
    },
    [rows, getId]
  );

  const toggleOne = React.useCallback((id: string, checked: boolean) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const clear = React.useCallback(() => setSelectedIds(new Set()), []);

  return {
    selectedIds,
    setSelectedIds,
    allSelected,
    someSelected,
    toggleAll,
    toggleOne,
    clear,
  };
}

/** Header checkbox with indeterminate support. */
export function SelectAllCheckbox({
  checked,
  indeterminate,
  onCheckedChange,
  label = "Select all",
}: {
  checked: boolean;
  indeterminate?: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
}) {
  return (
    <Checkbox
      checked={checked}
      indeterminate={indeterminate}
      onCheckedChange={(value) => onCheckedChange(!!value)}
      aria-label={label}
    />
  );
}

/** Row checkbox. Stops click propagation so clickable rows don't navigate. */
export function RowCheckbox({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <Checkbox
      checked={checked}
      onCheckedChange={(value) => onCheckedChange(!!value)}
      onClick={(event) => event.stopPropagation()}
      aria-label={label}
    />
  );
}

/** Muted count bar shown above the table while rows are selected. */
export function TableSelectionBar({
  count,
  onClear,
  children,
}: {
  count: number;
  onClear: () => void;
  children?: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-foreground tabular-nums">
          {count} selected
        </span>
        <Button
          variant="ghost"
          size="xs"
          className="text-muted-foreground hover:text-foreground"
          onClick={onClear}
        >
          Clear
        </Button>
      </div>
      {children}
    </div>
  );
}
