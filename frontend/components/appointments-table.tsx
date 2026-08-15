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
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
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
import { appointmentStatusClass } from "@/lib/appointment-status";
import {
  ExclamationTriangleIcon as AlertTriangleIcon,
  ArrowDownIcon as ArrowDown,
  ArrowUpIcon as ArrowUp,
  CalendarIcon,
  CheckIcon as Check,
  ChevronLeftIcon as ChevronLeft,
  ChevronRightIcon as ChevronRight,
  ChevronUpDownIcon as ChevronsUpDown,
  ViewColumnsIcon as Columns,
  EllipsisHorizontalIcon as Ellipsis,
  PencilIcon as Pencil,
  TrashIcon as Trash,
} from "@heroicons/react/24/outline";

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

const COLUMN_LABELS: Record<string, string> = {
  counter: "Counter #",
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

const CANCEL_REASONS = [
  "Patient requested cancellation",
  "Doctor unavailable",
  "Duplicate booking",
  "Clinic closed",
  "Patient no longer needs the visit",
  "Other",
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const toDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

function MonthCalendar({
  value,
  onChange,
}: {
  value: string;
  onChange: (dateKey: string) => void;
}) {
  const today = new Date();
  const todayKey = toDateKey(today);
  const initial = value ? new Date(`${value}T12:00:00`) : today;
  const [view, setView] = React.useState(() =>
    Number.isNaN(initial.getTime()) ? today : initial
  );

  const year = view.getFullYear();
  const month = view.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (string | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      toDateKey(new Date(year, month, i + 1))
    ),
  ];

  return (
    <div className="select-none">
      <div className="mb-2 flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Previous month"
          onClick={() => setView(new Date(year, month - 1, 1))}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Button>
        <span className="text-sm font-semibold">
          {view.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Next month"
          onClick={() => setView(new Date(year, month + 1, 1))}
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="flex h-7 items-center justify-center text-xs font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}
        {cells.map((key, i) => {
          if (!key) return <div key={`empty-${i}`} />;
          const disabled = key < todayKey;
          const selected = key === value;
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => onChange(key)}
              className={cn(
                "flex h-7 items-center justify-center rounded-md text-xs font-medium tabular-nums transition-colors",
                disabled &&
                  "cursor-not-allowed text-muted-foreground/40 line-through",
                !disabled && !selected && "hover:bg-accent",
                selected && "bg-primary font-semibold text-primary-foreground"
              )}
            >
              {Number(key.slice(-2))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

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
        Counter #
        <SortIcon sorted={column.getIsSorted()} />
      </button>
    ),
    cell: ({ row }) => (
      <span className="inline-flex min-w-7 items-center justify-center rounded-full border border-border bg-muted px-1.5 py-0.5 text-xs font-semibold tabular-nums">
        {row.original.counter != null ? `#${row.original.counter}` : "—"}
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
      <Badge className={cn("border-transparent text-white text-xs capitalize", appointmentStatusClass[row.original.status])}>
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
  const [rescheduling, setRescheduling] = React.useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = React.useState("");
  const [rescheduleBusy, setRescheduleBusy] = React.useState(false);
  const [cancelling, setCancelling] = React.useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = React.useState(CANCEL_REASONS[0]);
  const [cancelComment, setCancelComment] = React.useState("");
  const [cancelBusy, setCancelBusy] = React.useState(false);

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

  const openReschedule = React.useCallback((appointment: Appointment) => {
    setRescheduleDate(appointment.date ?? "");
    setRescheduling(appointment);
  }, []);

  const openCancel = React.useCallback((appointment: Appointment) => {
    setCancelReason(CANCEL_REASONS[0]);
    setCancelComment("");
    setCancelling(appointment);
  }, []);

  async function confirmReschedule() {
    if (!rescheduling || !rescheduleDate) return;
    setRescheduleBusy(true);
    const res = await fetch(`/api/appointments/${rescheduling.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rescheduled", date: rescheduleDate }),
    });
    const data = await res.json();
    setRescheduleBusy(false);
    if (!res.ok) {
      toast.error(data.error || "Something went wrong. Please try again.");
      return;
    }
    toast.success("Appointment rescheduled", {
      description: `${rescheduling.fullName} · ${rescheduleDate}`,
    });
    setRescheduling(null);
    await onChanged?.();
  }

  async function confirmCancel() {
    if (!cancelling) return;
    setCancelBusy(true);
    const notes = cancelComment.trim()
      ? `Cancelled: ${cancelReason} — ${cancelComment.trim()}`
      : `Cancelled: ${cancelReason}`;
    const res = await fetch(`/api/appointments/${cancelling.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled", notes }),
    });
    const data = await res.json();
    setCancelBusy(false);
    if (!res.ok) {
      toast.error(data.error || "Something went wrong. Please try again.");
      return;
    }
    toast.success("Appointment cancelled", {
      description: `${cancelling.fullName} · ${cancelReason.toLowerCase()}`,
    });
    setCancelling(null);
    await onChanged?.();
  }

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
                        onClick={() => {
                          if (s === "rescheduled") {
                            openReschedule(row.original);
                          } else if (s === "cancelled") {
                            openCancel(row.original);
                          } else {
                            changeStatus(row.original, s);
                          }
                        }}
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
  }, [canManage, changeStatus, openReschedule, openCancel]);

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

      <Dialog
        open={Boolean(rescheduling)}
        onOpenChange={(open) => !open && setRescheduling(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="size-4" aria-hidden="true" />
              Reschedule Appointment
            </DialogTitle>
            <DialogDescription>
              {rescheduling?.fullName} · currently{" "}
              {formatDate(rescheduling?.date ?? "")} at {rescheduling?.time}.
              Pick a new date below.
            </DialogDescription>
          </DialogHeader>
          <MonthCalendar value={rescheduleDate} onChange={setRescheduleDate} />
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Cancel
            </DialogClose>
            <Button
              type="button"
              onClick={confirmReschedule}
              disabled={rescheduleBusy || !rescheduleDate}
            >
              {rescheduleBusy
                ? "Confirming..."
                : `Confirm ${rescheduleDate ? `· ${rescheduleDate}` : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(cancelling)}
        onOpenChange={(open) => !open && setCancelling(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Appointment</DialogTitle>
            <DialogDescription>
              {cancelling?.fullName} · {formatDate(cancelling?.date ?? "")} at{" "}
              {cancelling?.time}. Select a reason for cancellation.
            </DialogDescription>
          </DialogHeader>
          <form className="flex flex-col gap-4">
            <FieldGroup>
              <Field>
                <FieldLabel>Reason *</FieldLabel>
                <RadioGroup
                  value={cancelReason}
                  onValueChange={(v) => setCancelReason(v ?? CANCEL_REASONS[0])}
                  className="gap-1.5"
                >
                  {CANCEL_REASONS.map((reason) => (
                    <label
                      key={reason}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
                    >
                      <RadioGroupItem
                        value={reason}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </RadioGroup>
              </Field>
              <Field>
                <FieldLabel htmlFor="cancelComment">Comment (optional)</FieldLabel>
                <Textarea
                  id="cancelComment"
                  rows={3}
                  placeholder="Additional details for the cancellation..."
                  value={cancelComment}
                  onChange={(e) => setCancelComment(e.target.value)}
                />
                <FieldDescription>
                  Saved to the appointment notes.
                </FieldDescription>
              </Field>
            </FieldGroup>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" type="button" />}>
                Back
              </DialogClose>
              <Button
                type="button"
                variant="destructive"
                onClick={confirmCancel}
                disabled={cancelBusy}
              >
                {cancelBusy ? "Cancelling..." : "Confirm Cancellation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
