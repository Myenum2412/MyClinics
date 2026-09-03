"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, SlidersHorizontal, X } from "lucide-react";

export type FilterOption = { label: string; value: string };
export type FilterConfig = {
  key: string;
  label: string;
  placeholder?: string;
  options: FilterOption[];
};

export function TableFilters({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters,
  filterValues,
  onFilterChange,
  onClearAll,
  columns,
  visibleColumns,
  onToggleColumn,
}: {
  searchValue: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  filterValues?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  onClearAll?: () => void;
  columns?: { key: string; label: string }[];
  visibleColumns?: Record<string, boolean>;
  onToggleColumn?: (key: string, visible: boolean) => void;
}) {
  const activeCount = Object.values(filterValues ?? {}).filter((v) => v && v !== "all").length + (searchValue ? 1 : 0);
  const hasActive = activeCount > 0;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9 h-9"
          />
          {searchValue && (
            <button onClick={() => onSearchChange("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          )}
        </div>

        {filters?.map((f) => (
          <Select key={f.key} value={filterValues?.[f.key] ?? "all"} onValueChange={(v) => onFilterChange?.(f.key, v ?? "all")}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder={f.placeholder ?? f.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All {f.label}</SelectItem>
              {f.options.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}

        {columns && visibleColumns && onToggleColumn && (
          <Popover>
            <PopoverTrigger>
              <Button variant="outline" size="sm" className="h-9 gap-1.5">
                <SlidersHorizontal className="size-4" /> Columns
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-3 space-y-2">
              {columns.map((c) => (
                <label key={c.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={!!visibleColumns[c.key]} onCheckedChange={(v) => onToggleColumn(c.key, !!v)} />
                  {c.label}
                </label>
              ))}
            </PopoverContent>
          </Popover>
        )}

        {hasActive && (
          <Button variant="ghost" size="sm" onClick={() => { onSearchChange(""); onClearAll?.(); }} className="h-9 gap-1">
            <X className="size-4" /> Clear
            <Badge variant="secondary" className="ml-1">{activeCount}</Badge>
          </Button>
        )}
      </div>

      {hasActive && (
        <div className="flex flex-wrap gap-1.5">
          {searchValue && <Badge variant="outline" className="gap-1">Search: {searchValue} <button onClick={() => onSearchChange("")} ><X className="size-3" /></button></Badge>}
          {filters?.map((f) => {
            const v = filterValues?.[f.key];
            if (!v || v === "all") return null;
            return <Badge key={f.key} variant="outline" className="gap-1">{f.label}: {v} <button onClick={() => onFilterChange?.(f.key, "all")}><X className="size-3" /></button></Badge>;
          })}
        </div>
      )}
    </div>
  );
}
