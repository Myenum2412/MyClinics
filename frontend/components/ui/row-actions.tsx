"use client";

import type { ReactNode } from "react";
import { EllipsisVertical, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface RowActionExtra {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

interface RowActionsProps {
  onView?: () => void;
  viewLabel?: string;
  onEdit?: () => void;
  editLabel?: string;
  onDelete?: () => void;
  deleteLabel?: string;
  /** Extra items shown above Edit (e.g. Download, Resend, Logs). */
  extraBefore?: RowActionExtra[];
  /** Extra items shown below Delete. */
  extraAfter?: RowActionExtra[];
  label?: string;
  align?: "end" | "start";
}

/**
 * Shared 3-dot row-action menu for every table: View / Edit / Delete
 * (each optional) with icon + text, plus optional extra items.
 */
export function RowActions({
  onView,
  viewLabel = "View",
  onEdit,
  editLabel = "Edit",
  onDelete,
  deleteLabel = "Delete",
  extraBefore = [],
  extraAfter = [],
  label = "Actions",
  align = "end",
}: RowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="size-7" aria-label={label}>
            <EllipsisVertical className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align={align} className="w-44">
        <DropdownMenuLabel className="text-xs">{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {extraBefore.map((item) => (
          <DropdownMenuItem
            key={item.label}
            onClick={item.onSelect}
            disabled={item.disabled}
            variant={item.destructive ? "destructive" : "default"}
            className="text-xs"
          >
            {item.icon}
            {item.label}
          </DropdownMenuItem>
        ))}
        {onView && (
          <DropdownMenuItem onClick={onView} className="text-xs">
            <Eye className="mr-2 size-3.5 text-muted-foreground" />
            {viewLabel}
          </DropdownMenuItem>
        )}
        {onEdit && (
          <DropdownMenuItem onClick={onEdit} className="text-xs">
            <Pencil className="mr-2 size-3.5 text-muted-foreground" />
            {editLabel}
          </DropdownMenuItem>
        )}
        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete} className="text-xs text-destructive">
              <Trash2 className="mr-2 size-3.5" />
              {deleteLabel}
            </DropdownMenuItem>
          </>
        )}
        {extraAfter.map((item) => (
          <DropdownMenuItem
            key={item.label}
            onClick={item.onSelect}
            disabled={item.disabled}
            variant={item.destructive ? "destructive" : "default"}
            className="text-xs"
          >
            {item.icon}
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
