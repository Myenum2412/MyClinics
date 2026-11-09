"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface PaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
  itemLabel?: string;
  /** Hide the prev/next controls for tables that render every row. */
  showControls?: boolean;
}

/**
 * Table footer matching the `@7ovr/table-1` block: a muted result count on the
 * left and compact previous / next controls on the right.
 */
export function Pagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  pageSizeOptions,
  onPageSizeChange,
  itemLabel = "items",
  showControls = true,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const label =
    itemLabel.charAt(0).toUpperCase() + itemLabel.slice(1).toLowerCase();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 px-4 py-2.5">
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{totalItems}</span>{" "}
        {totalItems === 1 ? label.replace(/s$/i, "") : label}
      </p>
      <div className="flex items-center gap-1.5">
        {showControls && pageSizeOptions && onPageSizeChange && (
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className="h-7 w-[100px] gap-1 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size} / page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {showControls && (
          <>
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              disabled={safePage <= 1}
              onClick={() => onPageChange(safePage - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-3.5" aria-hidden="true" />
            </Button>
            <span className="px-1 text-xs text-muted-foreground tabular-nums">
              Page {safePage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              disabled={safePage >= totalPages}
              onClick={() => onPageChange(safePage + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="size-3.5" aria-hidden="true" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
