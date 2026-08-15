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
import Link from "next/link";
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
import {
  ExclamationTriangleIcon as AlertTriangleIcon,
  ArrowDownIcon as ArrowDown,
  ArrowUpIcon as ArrowUp,
  ChevronLeftIcon as ChevronLeft,
  ChevronRightIcon as ChevronRight,
  ChevronUpDownIcon as ChevronsUpDown,
  ViewColumnsIcon as Columns,
  EllipsisHorizontalIcon as Ellipsis,
  EyeIcon as Eye,
  PencilIcon as Pencil,
  TrashIcon as Trash,
} from "@heroicons/react/24/outline";

export type MedicalHistoryEntry = {
  date: string | null;
  record: string;
};

export type Patient = {
  id: string;
  fullName: string;
  mobile: string;
  secondaryMobile: string | null;
  age: number | null;
  gender: string | null;
  email: string | null;
  whatsapp: string | null;
  bloodGroup: string | null;
  dateOfBirth: string | null;
  weight: number | null;
  height: number | null;
  guardianName: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  maritalStatus: string | null;
  smoking: string | null;
  alcohol: string | null;
  address: string | null;
  city: string | null;
  pincode: string | null;
  occupation: string | null;
  medicalHistory: MedicalHistoryEntry[] | null;
  allergies: string | null;
  currentMedications: string | null;
  previousSurgeries: string | null;
  familyHistory: string | null;
  notes: string | null;
};

const COLUMN_LABELS: Record<string, string> = {
  fullName: "Patient",
  gender: "Gender",
  age: "Age",
  email: "Email",
  whatsapp: "WhatsApp",
  secondaryMobile: "Secondary Mobile",
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

const columns: ColumnDef<typeof TABLE_FEATURES, Patient>[] = [
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
        aria-label="Select all patients on this page"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(checked) => row.toggleSelected(checked === true)}
        aria-label={`Select ${row.original.fullName}`}
        onClick={(e) => e.stopPropagation()}
      />
    ),
  },
  {
    accessorKey: "fullName",
    header: ({ column }) => (
      <button
        type="button"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-mx-1 inline-flex items-center gap-1 rounded-md px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground"
      >
        Patient
        <SortIcon sorted={column.getIsSorted()} />
      </button>
    ),
    filterFn: (row, _id, value: string) => {
      const q = value.toLowerCase();
      return (
        row.original.fullName.toLowerCase().includes(q) ||
        row.original.mobile.toLowerCase().includes(q) ||
        (row.original.email ?? "").toLowerCase().includes(q)
      );
    },
    cell: ({ row }) => {
      const p = row.original;
      return (
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold">
            {p.fullName
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm leading-tight font-medium">
              {p.fullName}
            </p>
            <p className="truncate text-xs text-muted-foreground">{p.mobile}</p>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "gender",
    enableSorting: false,
    header: () => (
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Gender
      </span>
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.gender ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "age",
    header: ({ column }) => (
      <button
        type="button"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-mx-1 inline-flex items-center gap-1 rounded-md px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground"
      >
        Age
        <SortIcon sorted={column.getIsSorted()} />
      </button>
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground tabular-nums">
        {row.original.age ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <button
        type="button"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-mx-1 inline-flex items-center gap-1 rounded-md px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground"
      >
        Email
        <SortIcon sorted={column.getIsSorted()} />
      </button>
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.email ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "whatsapp",
    enableSorting: false,
    header: () => (
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        WhatsApp
      </span>
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.whatsapp ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "secondaryMobile",
    enableSorting: false,
    header: () => (
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Secondary Mobile
      </span>
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.secondaryMobile ?? "—"}
      </span>
    ),
  },
];

export function PatientsTable({
  data,
  search,
  onChanged,
  onPreview,
  canManage = true,
  pageSize = 6,
  serverPagination,
}: {
  data: Patient[];
  search: string;
  onChanged?: () => Promise<void>;
  onPreview?: (patient: Patient) => void;
  canManage?: boolean;
  pageSize?: number;
  serverPagination?: {
    pageIndex: number;
    pageCount: number;
    totalCount: number;
    onPageChange: (pageIndex: number) => void;
  };
}) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "fullName", desc: false },
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<ColumnVisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [deleting, setDeleting] = React.useState<Patient | null>(null);
  const [deleteBusy, setDeleteBusy] = React.useState(false);

  const tableColumns = React.useMemo<
    ColumnDef<typeof TABLE_FEATURES, Patient>[]
  >(() => {
    if (!canManage) return columns;
    return [
      ...columns,
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
                    aria-label={`Actions for ${row.original.fullName}`}
                  >
                    <Ellipsis className="size-4" aria-hidden="true" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  render={<Link href={`/doctor/patients/${row.original.id}`} />}
                  nativeButton={false}
                >
                  <Eye aria-hidden="true" />
                  View
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  render={<Link href={`/doctor/patients/${row.original.id}/edit`} />}
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
    ];
  }, [canManage]);

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
    table.getColumn("fullName")?.setFilterValue(search || undefined);
  }, [search, table]);

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const totalCount = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    const res = await fetch(`/api/patients/${deleting.id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    setDeleteBusy(false);
    if (!res.ok) {
      toast.error(data.error || "Something went wrong. Please try again.");
      return;
    }
    toast.success("Patient deleted.");
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
              ? "patient"
              : "patients"
            : data.length === 1
              ? "patient"
              : "patients"}
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
                    header.column.id === "fullName" && "pl-1",
                    (header.column.id === "secondaryMobile" ||
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
                    className={cn(
                      "py-3",
                      cell.column.id === "select" && "pl-4",
                      cell.column.id === "fullName" && "pl-1",
                      (cell.column.id === "secondaryMobile" ||
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
                  ? "No patients match your search."
                  : "No patients yet. Add the first one above."}
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
              <DialogTitle>Delete patient</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the patient record for{" "}
                <span className="font-medium text-foreground">
                  {deleting?.fullName}
                </span>{" "}
                ({deleting?.mobile})? Their login account will also be removed.
                This action cannot be undone.
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
