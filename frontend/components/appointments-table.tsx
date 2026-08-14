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
import { Badge } from "@/components/ui/badge";
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
  AppointmentForm,
  type DoctorOption,
} from "@/components/appointment-form";
import type { PatientPick } from "@/components/patient-picker";
import {
  AlertTriangleIcon,
  ArrowUp,
  ArrowDown,
  Check,
  ChevronsUpDown,
  Columns,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  Pencil,
  Trash,
} from "lucide-react";

export type Appointment = {
  id: string;
  fullName: string;
  mobile: string;
  secondaryMobile: string | null;
  age: number | null;
  gender: string | null;
  email: string | null;
  whatsapp: string | null;
  doctorId: string | null;
  doctorName: string | null;
  department: string | null;
  date: string;
  time: string;
  type: "in-person" | "video";
  reason: string | null;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "rescheduled" | "no_show";
  bookingSource: "manual" | "whatsapp_ai";
  notes: string | null;
  counter: number | null;
};

const statusVariant: Record<
  Appointment["status"],
  "default" | "secondary" | "outline" | "destructive"
> = {
  pending: "secondary",
  confirmed: "default",
  completed: "outline",
  cancelled: "destructive",
  rescheduled: "outline",
  no_show: "destructive",
};

const COLUMN_LABELS: Record<string, string> = {
  counter: "Counter",
  fullName: "Patient",
  doctorName: "Doctor",
  department: "Department",
  date: "Date",
  time: "Time",
  type: "Type",
  status: "Status",
  bookingSource: "Source",
};

const APPOINTMENT_STATUSES: Appointment["status"][] = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "rescheduled",
  "no_show",
];

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
});

function formatDate(value: string) {
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

const columns: ColumnDef<typeof TABLE_FEATURES, Appointment>[] = [
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
        aria-label="Select all appointments on this page"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(checked) => row.toggleSelected(checked === true)}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Select ${row.original.fullName}`}
      />
    ),
  },
  {
    accessorKey: "counter",
    enableHiding: true,
    header: ({ column }) => (
      <button
        type="button"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-mx-1 inline-flex items-center gap-1 rounded-md px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground"
      >
        #
        <SortIcon sorted={column.getIsSorted()} />
      </button>
    ),
    cell: ({ row }) => (
      <span className="inline-flex min-w-7 items-center justify-center rounded-full border border-border bg-muted px-1.5 py-0.5 text-xs font-semibold tabular-nums">
        {row.original.counter ?? "—"}
      </span>
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
        (row.original.doctorName ?? "").toLowerCase().includes(q)
      );
    },
    cell: ({ row }) => {
      const a = row.original;
      return (
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold">
            {a.fullName
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm leading-tight font-medium">
              {a.fullName}
            </p>
            <p className="truncate text-xs text-muted-foreground">{a.mobile}</p>
          </div>
        </div>
      );
    },
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
      <span className="text-sm">{row.original.doctorName ?? "—"}</span>
    ),
  },
  {
    accessorKey: "department",
    header: ({ column }) => (
      <button
        type="button"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-mx-1 inline-flex items-center gap-1 rounded-md px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground"
      >
        Department
        <SortIcon sorted={column.getIsSorted()} />
      </button>
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.department ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "date",
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
        {formatDate(row.original.date)}
      </span>
    ),
  },
  {
    accessorKey: "time",
    header: ({ column }) => (
      <button
        type="button"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-mx-1 inline-flex items-center gap-1 rounded-md px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground"
      >
        Time
        <SortIcon sorted={column.getIsSorted()} />
      </button>
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground tabular-nums">
        {row.original.time}
      </span>
    ),
  },
  {
    accessorKey: "type",
    enableSorting: false,
    header: () => (
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Type
      </span>
    ),
    cell: ({ row }) => (
      <Badge
        variant={row.original.type === "video" ? "outline" : "secondary"}
        className="text-xs"
      >
        {row.original.type === "video" ? "Video" : "In-person"}
      </Badge>
    ),
  },
  {
    accessorKey: "status",
    enableSorting: false,
    header: () => (
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Status
      </span>
    ),
    cell: ({ row }) => (
      <Badge variant={statusVariant[row.original.status]} className="text-xs capitalize">
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: "bookingSource",
    enableSorting: false,
    header: () => (
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Source
      </span>
    ),
    cell: ({ row }) => (
      <Badge
        variant={row.original.bookingSource === "whatsapp_ai" ? "default" : "secondary"}
        className="text-xs"
      >
        {row.original.bookingSource === "whatsapp_ai" ? "WhatsApp AI" : "Manual"}
      </Badge>
    ),
  },
];

export function AppointmentsTable({
  data,
  search,
  doctors,
  onChanged,
  onPreview,
  canManage = true,
  patients,
  pageSize = 6,
  serverPagination,
}: {
  data: Appointment[];
  search: string;
  doctors?: DoctorOption[];
  onChanged?: () => Promise<void>;
  onPreview?: (appointment: Appointment) => void;
  canManage?: boolean;
  patients?: PatientPick[];
  pageSize?: number;
  serverPagination?: {
    pageIndex: number;
    pageCount: number;
    totalCount: number;
    onPageChange: (pageIndex: number) => void;
  };
}) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "date", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<ColumnVisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [editing, setEditing] = React.useState<Appointment | null>(null);
  const [deleting, setDeleting] = React.useState<Appointment | null>(null);
  const [deleteBusy, setDeleteBusy] = React.useState(false);

  const changeStatus = React.useCallback(
    async (appointment: Appointment, newStatus: Appointment["status"]) => {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Something went wrong. Please try again.");
        return;
      }
      toast.success("Appointment status updated", {
        description: `${appointment.fullName} · ${newStatus.replace("_", " ")}`,
      });
      await onChanged?.();
    },
    [onChanged]
  );

  const tableColumns = React.useMemo<
    ColumnDef<typeof TABLE_FEATURES, Appointment>[]
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
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <span className="capitalize">Status: {row.original.status.replace("_", " ")}</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent alignOffset={-8}>
                    {APPOINTMENT_STATUSES.map((s) => (
                      <DropdownMenuItem
                        key={s}
                        onClick={() => changeStatus(row.original, s)}
                        className="capitalize"
                      >
                        {s.replace("_", " ")}
                        {row.original.status === s && (
                          <Check className="size-3.5" aria-hidden="true" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setEditing(row.original)}>
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
  }, [canManage, changeStatus]);

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
    const res = await fetch(`/api/appointments/${deleting.id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    setDeleteBusy(false);
    if (!res.ok) {
      toast.error(data.error || "Something went wrong. Please try again.");
      return;
    }
    toast.success("Appointment deleted.");
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
              ? "appointment"
              : "appointments"
            : data.length === 1
              ? "appointment"
              : "appointments"}
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
                    (header.column.id === "status" ||
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
                      (cell.column.id === "status" ||
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
                  ? "No appointments match your search."
                  : "No appointments yet. Book the first one above."}
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
            <AppointmentForm
              key={editing.id}
              doctors={doctors ?? []}
              patients={patients}
              initial={editing}
              onBooked={async () => {
                setEditing(null);
                await onChanged?.();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

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
              <DialogTitle>Delete appointment</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the appointment for{" "}
                <span className="font-medium text-foreground">
                  {deleting?.fullName}
                </span>{" "}
                on {formatDate(deleting?.date ?? "")} at {deleting?.time}? This
                action cannot be undone.
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
