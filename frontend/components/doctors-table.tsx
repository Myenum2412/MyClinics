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
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { DoctorForm } from "@/components/doctor-form";
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
  UserMinusIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";

export type DoctorScheduleDay = {
  day: string;
  start: string | null;
  end: string | null;
};

export type Doctor = {
  id: string;
  name: string;
  email: string;
  specialty: string | null;
  mobile: string | null;
  qualifications: string | null;
  city: string | null;
  state: string | null;
  consultationFee: number | null;
  experience: string | null;
  gender: string | null;
  languages: string[];
  registrationNumber: string | null;
  bio: string | null;
  address: string | null;
  schedule: DoctorScheduleDay[];
  image: string | null;
  status: "active" | "terminated";
};

const COLUMN_LABELS: Record<string, string> = {
  name: "Doctor",
  specialty: "Specialty",
  mobile: "Mobile",
  qualifications: "Qualifications",
  city: "City",
  experience: "Experience",
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

const columns: ColumnDef<typeof TABLE_FEATURES, Doctor>[] = [
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
        aria-label="Select all doctors on this page"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(checked) => row.toggleSelected(checked === true)}
        aria-label={`Select ${row.original.name}`}
      />
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
        Doctor
        <SortIcon sorted={column.getIsSorted()} />
      </button>
    ),
    filterFn: (row, _id, value: string) => {
      const q = value.toLowerCase();
      return (
        row.original.name.toLowerCase().includes(q) ||
        row.original.email.toLowerCase().includes(q) ||
        (row.original.specialty ?? "").toLowerCase().includes(q)
      );
    },
    cell: ({ row }) => {
      const d = row.original;
      return (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-8">
            <AvatarImage src={d.image ?? undefined} alt={d.name} />
            <AvatarFallback>
              {d.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate text-sm leading-tight font-medium">
              {d.name}
              {d.status === "terminated" && (
                <span className="inline-flex shrink-0 items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
                  Terminated
                </span>
              )}
            </p>
            <p className="truncate text-xs text-muted-foreground">{d.email}</p>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "specialty",
    enableSorting: false,
    header: () => (
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Specialty
      </span>
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.specialty ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "mobile",
    enableSorting: false,
    header: () => (
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Mobile
      </span>
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground tabular-nums">
        {row.original.mobile ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "qualifications",
    enableSorting: false,
    header: () => (
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Qualifications
      </span>
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.qualifications ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "city",
    enableSorting: false,
    header: () => (
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        City
      </span>
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.city ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "experience",
    enableSorting: false,
    header: () => (
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Experience
      </span>
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.experience ?? "—"}
      </span>
    ),
  },
];

export function DoctorsTable({
  data,
  search,
  onChanged,
  pageSize = 6,
  serverPagination,
}: {
  data: Doctor[];
  search: string;
  onChanged?: () => Promise<void>;
  pageSize?: number;
  serverPagination?: {
    pageIndex: number;
    pageCount: number;
    totalCount: number;
    onPageChange: (pageIndex: number) => void;
  };
}) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "name", desc: false },
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<ColumnVisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [editing, setEditing] = React.useState<Doctor | null>(null);
  const [terminating, setTerminating] = React.useState<Doctor | null>(null);
  const [terminateBusy, setTerminateBusy] = React.useState(false);
  const router = useRouter();

  const tableColumns = React.useMemo<
    ColumnDef<typeof TABLE_FEATURES, Doctor>[]
  >(
    () => [
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
                <DropdownMenuItem onClick={() => setEditing(row.original)}>
                  <Pencil aria-hidden="true" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {row.original.status === "terminated" ? (
                  <DropdownMenuItem
                    onClick={() => setTerminating(row.original)}
                  >
                    <UserPlusIcon aria-hidden="true" />
                    Re-activate
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setTerminating(row.original)}
                  >
                    <UserMinusIcon aria-hidden="true" />
                    Terminate
                  </DropdownMenuItem>
                )}
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

  async function handleTerminate() {
    if (!terminating) return;
    const reactivate = terminating.status === "terminated";
    setTerminateBusy(true);
    const res = await fetch(`/api/doctors/${terminating.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: reactivate ? "active" : "terminated" }),
    });
    const data = await res.json();
    setTerminateBusy(false);
    if (!res.ok) {
      toast.error(data.error || "Something went wrong. Please try again.");
      return;
    }
    toast.success(reactivate ? "Doctor re-activated." : "Doctor terminated.");
    setTerminating(null);
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
              ? "doctor"
              : "doctors"
            : data.length === 1
              ? "doctor"
              : "doctors"}
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
                    header.column.id === "name" && "pl-1",
                    (header.column.id === "experience" ||
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
                onClick={() => router.push(`/doctor/doctors/${row.original.id}`)}
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
                      cell.column.id === "name" && "pl-1",
                      (cell.column.id === "experience" ||
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
                  ? "No doctors match your search."
                  : "No doctors yet. Add the first one above."}
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
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {editing && (
            <DoctorForm
              key={editing.id}
              initial={editing}
              onSaved={async () => {
                setEditing(null);
                await onChanged?.();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(terminating)}
        onOpenChange={(open) => !open && setTerminating(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <div className="flex items-start space-x-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
              <AlertTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <DialogHeader>
              {terminating?.status === "terminated" ? (
                <>
                  <DialogTitle>Re-activate doctor</DialogTitle>
                  <DialogDescription>
                    Allow{" "}
                    <span className="font-medium text-foreground">
                      {terminating?.name}
                    </span>{" "}
                    ({terminating?.email}) to sign in and appear in appointment
                    bookings again.
                  </DialogDescription>
                </>
              ) : (
                <>
                  <DialogTitle>Terminate doctor</DialogTitle>
                  <DialogDescription>
                    Terminate the account for{" "}
                    <span className="font-medium text-foreground">
                      {terminating?.name}
                    </span>{" "}
                    ({terminating?.email})? They will no longer be able to sign
                    in or appear in appointment bookings. You can re-activate
                    them later.
                  </DialogDescription>
                </>
              )}
            </DialogHeader>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              variant="destructive"
              onClick={handleTerminate}
              disabled={terminateBusy}
            >
              {terminateBusy
                ? "Saving..."
                : terminating?.status === "terminated"
                  ? "Re-activate"
                  : "Terminate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
