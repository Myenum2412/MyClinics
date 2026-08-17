"use client";

import * as React from "react";
import {
  sortFn_datetime,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  flexRender,
  tableFeatures,
  useTable,
  createSortedRowModel,
  rowSortingFeature,
  columnFilteringFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  rowPaginationFeature,
  rowSelectionFeature,
  columnVisibilityFeature,
  type ColumnVisibilityState,
} from "@tanstack/react-table";

const TABLE_FEATURES = tableFeatures({
  rowSortingFeature,
  columnFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  columnVisibilityFeature,
  sortedRowModel: createSortedRowModel(),
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortFns: {
    datetime: sortFn_datetime,
  },
});

import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import {
  ExclamationTriangleIcon as AlertTriangleIcon,
  ArrowDownIcon as ArrowDown,
  ArrowUpIcon as ArrowUp,
  ChevronLeftIcon as ChevronLeft,
  ChevronRightIcon as ChevronRight,
  ChevronUpDownIcon as ChevronsUpDown,
  ViewColumnsIcon as Columns,
  EllipsisHorizontalIcon as Ellipsis,
  PencilIcon as Pencil,
  TrashIcon as Trash,
} from "@heroicons/react/24/outline";

export type Medicine = {
  id: string;
  sno: number | null;
  name: string;
  category: string | null;
  composition: string | null;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  beforeAfterFood: string | null;
  instructions: string | null;
  requiresPrescription: boolean;
  notes: string | null;
};

const COLUMN_LABELS: Record<string, string> = {
  sno: "S.No",
  name: "Medicine",
  category: "Category",
  composition: "Composition",
  dosage: "Dosage",
  frequency: "Frequency",
  duration: "Duration",
  beforeAfterFood: "Before / After Food",
  requiresPrescription: "Rx",
  notes: "Notes",
};

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc") return <ArrowUp className="size-3.5" aria-hidden="true" />;
  if (sorted === "desc") return <ArrowDown className="size-3.5" aria-hidden="true" />;
  return (
    <ChevronsUpDown
      className="size-3.5 text-muted-foreground/60"
      aria-hidden="true"
    />
  );
}

export function MedicinesTable({
  data,
  search,
  onChanged,
  onPreview,
  pageSize = 6,
  serverPagination,
}: {
  data: Medicine[];
  search: string;
  onChanged?: () => Promise<void>;
  onPreview?: (medicine: Medicine) => void;
  pageSize?: number;
  serverPagination?: {
    pageIndex: number;
    pageCount: number;
    totalCount: number;
    onPageChange: (pageIndex: number) => void;
  };
}) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "sno", desc: false },
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<ColumnVisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [deleting, setDeleting] = React.useState<Medicine | null>(null);
  const [deleteBusy, setDeleteBusy] = React.useState(false);

  const tableColumns = React.useMemo<
    ColumnDef<typeof TABLE_FEATURES, Medicine>[]
  >(
    () => [
      {
        id: "select",
        enableSorting: false,
        enableHiding: false,
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={
              table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()
            }
            onCheckedChange={(checked) =>
              table.toggleAllPageRowsSelected(checked === true)
            }
            aria-label="Select all medicines on this page"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(checked) => row.toggleSelected(checked === true)}
            aria-label={`Select ${row.original.name}`}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      },
      {
        accessorKey: "sno",
        header: ({ column }) => (
          <button
            type="button"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-mx-1 inline-flex items-center gap-1 rounded-md px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground"
          >
            S.No
            <SortIcon sorted={column.getIsSorted()} />
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground tabular-nums">
            {row.original.sno ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <button
            type="button"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-mx-1 inline-flex items-center gap-1 rounded-md px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground"
          >
            Medicine
            <SortIcon sorted={column.getIsSorted()} />
          </button>
        ),
        filterFn: (row, _id, value: string) => {
          const q = value.toLowerCase();
          return (
            row.original.name.toLowerCase().includes(q) ||
            (row.original.category ?? "").toLowerCase().includes(q) ||
            (row.original.composition ?? "").toLowerCase().includes(q) ||
            (row.original.dosage ?? "").toLowerCase().includes(q) ||
            (row.original.frequency ?? "").toLowerCase().includes(q) ||
            (row.original.duration ?? "").toLowerCase().includes(q) ||
            (row.original.notes ?? "").toLowerCase().includes(q)
          );
        },
        cell: ({ row }) => (
          <span className="text-sm font-medium">{row.original.name}</span>
        ),
      },
      {
        accessorKey: "category",
        enableSorting: false,
        header: () => (
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Category
          </span>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.category ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "composition",
        enableSorting: false,
        header: () => (
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Composition
          </span>
        ),
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-56 text-sm text-muted-foreground">
            {row.original.composition ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "frequency",
        enableSorting: false,
        header: () => (
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Frequency
          </span>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.frequency ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "duration",
        enableSorting: false,
        header: () => (
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Duration
          </span>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.duration ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "beforeAfterFood",
        enableSorting: false,
        header: () => (
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Food
          </span>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.beforeAfterFood ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "requiresPrescription",
        enableSorting: false,
        header: () => (
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Rx
          </span>
        ),
        cell: ({ row }) => (
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
              row.original.requiresPrescription
                ? "bg-amber-100 text-amber-700"
                : "bg-muted text-muted-foreground"
            )}
          >
            {row.original.requiresPrescription ? "Rx" : "OTC"}
          </span>
        ),
      },
      {
        accessorKey: "notes",
        enableSorting: false,
        header: () => (
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Notes
          </span>
        ),
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-64 text-sm text-muted-foreground">
            {row.original.notes ?? "—"}
          </span>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        enableHiding: false,
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger
                onClick={(e) => e.stopPropagation()}
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Actions for ${row.original.name}`}
                  >
                    <Ellipsis className="size-4" aria-hidden="true" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  render={<Link href={`/doctor/medicines/${row.original.id}/edit`} />}
                  nativeButton={false}
                >
                  <Pencil aria-hidden="true" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDeleting(row.original)}
                >
                  <Trash aria-hidden="true" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    []
  );

  const table = useTable({
    features: TABLE_FEATURES,
    data,
    columns: tableColumns,
    getRowId: (row) => row.id,
    state: { sorting, columnFilters, columnVisibility, rowSelection },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    initialState: { pagination: { pageIndex: 0, pageSize } },
  });

  React.useEffect(() => {
    table.getColumn("name")?.setFilterValue(search || undefined);
  }, [search, table]);

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const totalCount = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    const res = await fetch(`/api/medicines/${deleting.id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    setDeleteBusy(false);
    if (!res.ok) {
      toast.error(data.error || "Something went wrong. Please try again.");
      return;
    }
    toast.success("Medicine deleted.");
    setDeleting(null);
    await onChanged?.();
  }

  return (
    <>
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {serverPagination ? serverPagination.totalCount : data.length}
          </span>{" "}
          {serverPagination
            ? serverPagination.totalCount === 1
              ? "medicine"
              : "medicines"
            : data.length === 1
              ? "medicine"
              : "medicines"}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm" aria-label="Toggle columns">
                <Columns className="size-3.5" aria-hidden="true" />
                View
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(checked) =>
                      column.toggleVisibility(checked === true)
                    }
                    closeOnClick={false}
                  >
                    {COLUMN_LABELS[column.id] ?? column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground tabular-nums">
              {selectedCount} Selected
            </span>
            <Button
              variant="ghost"
              size="xs"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => table.resetRowSelection()}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className="border-b border-border bg-muted/40 hover:bg-muted/40"
            >
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={cn(
                    "h-9",
                    header.column.id === "select" && "w-10 pl-4",
                    (header.column.id === "notes" ||
                      header.column.id === "actions") && "pr-4"
                  )}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() ? "selected" : undefined}
                onClick={() => onPreview?.(row.original)}
                className="cursor-pointer border-b border-border transition-colors duration-100 last:border-b-0 hover:bg-muted/30"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    onClick={
                      cell.column.id === "select" || cell.column.id === "actions"
                        ? (e) => e.stopPropagation()
                        : undefined
                    }
                    className={cn(
                      "py-3",
                      cell.column.id === "select" && "pl-4",
                      (cell.column.id === "notes" ||
                        cell.column.id === "actions") && "pr-4"
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={tableColumns.length}
                className="h-24 text-center text-sm text-muted-foreground"
              >
                {data.length
                  ? "No medicines match your search."
                  : "No medicines yet. Add the first one above."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between gap-4 border-t border-border bg-muted/20 px-4 py-2.5">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {serverPagination ? serverPagination.totalCount : totalCount}
          </span>{" "}
          {serverPagination
            ? serverPagination.totalCount === 1
              ? "Result"
              : "Results"
            : totalCount === 1
              ? "Result"
              : "Results"}
        </p>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="size-7"
            onClick={() =>
              serverPagination
                ? serverPagination.onPageChange(serverPagination.pageIndex - 1)
                : table.previousPage()
            }
            disabled={
              serverPagination
                ? serverPagination.pageIndex <= 0
                : !table.getCanPreviousPage()
            }
            aria-label="Previous page"
          >
            <ChevronLeft className="size-3.5" aria-hidden="true" />
          </Button>
          <span className="px-1 text-xs text-muted-foreground tabular-nums">
            Page{" "}
            {serverPagination ? serverPagination.pageIndex + 1 : table.state.pagination.pageIndex + 1}{" "}
            of{" "}
            {serverPagination
              ? Math.max(serverPagination.pageCount, 1)
              : Math.max(pageCount, 1)}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="size-7"
            onClick={() =>
              serverPagination
                ? serverPagination.onPageChange(serverPagination.pageIndex + 1)
                : table.nextPage()
            }
            disabled={
              serverPagination
                ? serverPagination.pageIndex + 1 >= serverPagination.pageCount
                : !table.getCanNextPage()
            }
            aria-label="Next page"
          >
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>

      <Dialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <div className="flex items-start space-x-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
              <AlertTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <DialogHeader>
              <DialogTitle>Delete medicine</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete{" "}
                <span className="font-medium text-foreground">
                  {deleting?.name}
                </span>{" "}
                from the medicine list? Existing prescriptions will keep their
                records. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteBusy}
            >
              {deleteBusy ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
