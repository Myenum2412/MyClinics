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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ArrowDownIcon as ArrowDown,
  ArrowUpIcon as ArrowUp,
  ChevronLeftIcon as ChevronLeft,
  ChevronRightIcon as ChevronRight,
  ChevronUpDownIcon as ChevronsUpDown,
  ViewColumnsIcon as Columns,
  EllipsisHorizontalIcon as Ellipsis,
  EyeIcon as Eye,
  PencilIcon as Pencil,
  PrinterIcon as Printer,
  TrashIcon as Trash,
} from "@heroicons/react/24/outline";

export type Medicine = {
  name: string;
  frequency: string;
  duration: string;
  beforeAfterFood: string;
  specialInstructions: string;
};

export type Prescription = {
  id: string;
  patientName: string;
  age: number | null;
  gender: string | null;
  phone: string | null;
  visitDate: string;
  diagnosis: string;
  medicines: Medicine[];
  symptoms: string | null;
  testsRecommended: string | null;
  followUpDate: string | null;
  doctorName: string | null;
};

const COLUMN_LABELS: Record<string, string> = {
  patientName: "Patient",
  diagnosis: "Diagnosis",
  medicines: "Medicines",
  doctorName: "Doctor",
  visitDate: "Date",
  followUpDate: "Follow-up",
};

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
});

function formatDate(value: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : dateFmt.format(parsed);
}

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

export function PrescriptionsTable({
  data,
  search,
  dateFilter,
  doctorFilter,
  diagnosisFilter,
  onDateFilterChange,
  onDoctorFilterChange,
  onDiagnosisFilterChange,
  onPrint,
  onDelete,
  onPreview,
  pageSize = 6,
  serverPagination,
}: {
  data: Prescription[];
  search: string;
  dateFilter: string;
  doctorFilter: string;
  diagnosisFilter: string;
  onDateFilterChange: (v: string) => void;
  onDoctorFilterChange: (v: string) => void;
  onDiagnosisFilterChange: (v: string) => void;
  onPrint: (p: Prescription) => void;
  onDelete: (p: Prescription) => void;
  onPreview?: (prescription: Prescription) => void;
  pageSize?: number;
  serverPagination?: {
    pageIndex: number;
    pageCount: number;
    totalCount: number;
    onPageChange: (pageIndex: number) => void;
  };
}) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "visitDate", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<ColumnVisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const columns = React.useMemo<ColumnDef<typeof TABLE_FEATURES, Prescription>[]>(
    () => createColumns({ onPrint, onDelete }),
    [onPrint, onDelete]
  );

  const table = useTable({
    features: TABLE_FEATURES,
    data,
    columns,
    getRowId: (row) => row.id,
    state: { sorting, columnFilters, columnVisibility, rowSelection },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    initialState: { pagination: { pageIndex: 0, pageSize } },
  });

  React.useEffect(() => {
    table.getColumn("patientName")?.setFilterValue(search || undefined);
  }, [search, table]);

  React.useEffect(() => {
    table.getColumn("visitDate")?.setFilterValue(dateFilter || undefined);
  }, [dateFilter, table]);

  React.useEffect(() => {
    table.getColumn("doctorName")?.setFilterValue(doctorFilter || undefined);
  }, [doctorFilter, table]);

  React.useEffect(() => {
    table.getColumn("diagnosis")?.setFilterValue(diagnosisFilter || undefined);
  }, [diagnosisFilter, table]);

  const dates = React.useMemo(
    () => Array.from(new Set(data.map((p) => p.visitDate).filter(Boolean))).sort().reverse(),
    [data]
  );
  const doctors = React.useMemo(
    () =>
      Array.from(
        new Set(data.map((p) => p.doctorName).filter((d): d is string => Boolean(d)))
      ),
    [data]
  );
  const diagnoses = React.useMemo(
    () => Array.from(new Set(data.map((p) => p.diagnosis).filter(Boolean))),
    [data]
  );

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const totalCount = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-col gap-3 border-b border-border bg-muted/40 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={dateFilter} onValueChange={(v) => onDateFilterChange(v ?? "")}>
            <SelectTrigger className="h-8 w-40 text-sm">
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
              {dates.length ? (
                dates.map((d) => (
                  <SelectItem key={d} value={d}>
                    {formatDate(d)}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled>
                  No dates
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <Select value={doctorFilter} onValueChange={(v) => onDoctorFilterChange(v ?? "")}>
            <SelectTrigger className="h-8 w-44 text-sm">
              <SelectValue placeholder="Doctor" />
            </SelectTrigger>
            <SelectContent>
              {doctors.length ? (
                doctors.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled>
                  No doctors
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <Select
            value={diagnosisFilter}
            onValueChange={(v) => onDiagnosisFilterChange(v ?? "")}
          >
            <SelectTrigger className="h-8 w-48 text-sm">
              <SelectValue placeholder="Diagnosis" />
            </SelectTrigger>
            <SelectContent>
              {diagnoses.length ? (
                diagnoses.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled>
                  No diagnoses
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {serverPagination ? serverPagination.totalCount : data.length}
          </span>{" "}
          {serverPagination
            ? serverPagination.totalCount === 1
              ? "prescription"
              : "prescriptions"
            : data.length === 1
              ? "prescription"
              : "prescriptions"}
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
                    header.column.id === "patientName" && "pl-1",
                    header.column.id === "actions" && "w-12 pr-4"
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
                      cell.column.id === "patientName" && "pl-1",
                      cell.column.id === "actions" && "pr-4"
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
                colSpan={columns.length}
                className="h-24 text-center text-sm text-muted-foreground"
              >
                {data.length
                  ? "No prescriptions match your search."
                  : "No prescriptions yet. Create the first one above."}
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
  );
}

function createColumns({
  onPrint,
  onDelete,
}: {
  onPrint: (p: Prescription) => void;
  onDelete: (p: Prescription) => void;
}): ColumnDef<typeof TABLE_FEATURES, Prescription>[] {
  return [
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
          aria-label="Select all prescriptions on this page"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(checked) => row.toggleSelected(checked === true)}
          aria-label={`Select ${row.original.patientName}`}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      accessorKey: "patientName",
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
          row.original.patientName.toLowerCase().includes(q) ||
          row.original.medicines.some((m) => m.name.toLowerCase().includes(q))
        );
      },
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold">
              {p.patientName
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm leading-tight font-medium">
                {p.patientName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {p.age ? `${p.age} yrs` : ""}
                {p.gender ? ` · ${p.gender}` : ""}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "diagnosis",
      header: ({ column }) => (
        <button
          type="button"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-mx-1 inline-flex items-center gap-1 rounded-md px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground"
        >
          Diagnosis
          <SortIcon sorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.diagnosis}
        </span>
      ),
    },
    {
      accessorKey: "medicines",
      enableSorting: false,
      header: () => (
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Medicines
        </span>
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.medicines.length
            ? row.original.medicines.map((m) => m.name).join(", ")
            : "—"}
        </span>
      ),
    },
    {
      accessorKey: "doctorName",
      header: ({ column }) => (
        <button
          type="button"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-mx-1 inline-flex items-center gap-1 rounded-md px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground"
        >
          Doctor
          <SortIcon sorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.doctorName ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "visitDate",
      sortFn: "datetime",
      header: ({ column }) => (
        <button
          type="button"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-mx-1 inline-flex items-center gap-1 rounded-md px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground"
        >
          Date
          <SortIcon sorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground tabular-nums">
          {formatDate(row.original.visitDate)}
        </span>
      ),
    },
    {
      accessorKey: "followUpDate",
      sortFn: "datetime",
      header: ({ column }) => (
        <button
          type="button"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-mx-1 inline-flex items-center gap-1 rounded-md px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground"
        >
          Follow-up
          <SortIcon sorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground tabular-nums">
          {formatDate(row.original.followUpDate)}
        </span>
      ),
    },
    {
      id: "actions",
      enableSorting: false,
      enableHiding: false,
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger
                onClick={(e) => e.stopPropagation()}
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Actions for ${p.patientName}`}
                  >
                    <Ellipsis className="size-4" aria-hidden="true" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  render={<Link href={`/doctor/prescriptions/${p.id}`} />}
                  nativeButton={false}
                >
                  <Eye aria-hidden="true" />
                  View
                </DropdownMenuItem>
                <DropdownMenuItem
                  render={<Link href={`/doctor/prescriptions/${p.id}/edit`} />}
                  nativeButton={false}
                >
                  <Pencil aria-hidden="true" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onPrint(p)}>
                  <Printer aria-hidden="true" />
                  Print
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => onDelete(p)}>
                  <Trash aria-hidden="true" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}
