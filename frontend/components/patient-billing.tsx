"use client";

import { useMemo, useState } from "react";
import {
  EyeIcon as Eye,
  MagnifyingGlassIcon as Search,
} from "@heroicons/react/24/outline";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PatientBillDialog } from "@/components/patient-bill-dialog";
import {
  AppointmentsTableCard,
  PrescriptionsTableCard,
} from "@/components/patient-tables";
import { formatINR } from "@/lib/billing";
import type { Bill } from "@/components/billing-table";
import type { Appointment } from "@/components/appointments-table";
import type { Prescription } from "@/components/prescriptions-table";

const statusVariant: Record<
  Bill["status"],
  "default" | "secondary" | "destructive"
> = {
  paid: "default",
  pending: "secondary",
  cancelled: "destructive",
};

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
});

function formatDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : dateFmt.format(parsed);
}

export function PatientBilling({
  bills,
  appointments,
  prescriptions,
}: {
  bills: Bill[];
  appointments: Appointment[];
  prescriptions: Prescription[];
}) {
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<Bill | null>(null);

  const visibleBills = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bills.filter(
      (b) =>
        !q ||
        b.billNumber.toLowerCase().includes(q) ||
        b.doctorName?.toLowerCase().includes(q) ||
        b.items.some((i) => i.name.toLowerCase().includes(q))
    );
  }, [bills, search]);

  const totalPaid = bills
    .filter((b) => b.status === "paid")
    .reduce((sum, b) => sum + b.total, 0);
  const totalPending = bills
    .filter((b) => b.status === "pending")
    .reduce((sum, b) => sum + b.total, 0);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">My Bills</h1>
          <p className="text-sm text-muted-foreground">
            Invoices for your visits to the clinic.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total Paid</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {formatINR(totalPaid)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Pending Payments</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {formatINR(totalPending)}
            </p>
          </div>
        </div>

        <div className="relative w-full max-w-xs">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bills..."
            className="pl-8"
            aria-label="Search bills"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
              <TableHead className="h-9">Invoice</TableHead>
              <TableHead className="h-9">Date</TableHead>
              <TableHead className="h-9">Doctor</TableHead>
              <TableHead className="h-9">Payment</TableHead>
              <TableHead className="h-9">Status</TableHead>
              <TableHead className="h-9 text-right">Total</TableHead>
              <TableHead className="h-9 pr-4 text-right">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleBills.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  {bills.length === 0
                    ? "No bills yet. Your invoices will appear here after your visits."
                    : "No bills match your search. Try a different search."}
                </TableCell>
              </TableRow>
            ) : (
              visibleBills.map((bill) => (
                <TableRow
                  key={bill.id}
                  onClick={() => setViewing(bill)}
                  className="cursor-pointer border-b border-border transition-colors duration-100 last:border-b-0 hover:bg-muted/30"
                >
                  <TableCell className="py-3 text-sm font-medium tabular-nums">
                    {bill.billNumber}
                  </TableCell>
                  <TableCell className="py-3 text-sm text-muted-foreground tabular-nums">
                    {formatDate(bill.date)}
                  </TableCell>
                  <TableCell className="py-3 text-sm">
                    {bill.doctorName ?? "—"}
                  </TableCell>
                  <TableCell className="py-3 text-sm text-muted-foreground">
                    {bill.paymentMethod}
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge
                      variant={statusVariant[bill.status]}
                      className="text-xs capitalize"
                    >
                      {bill.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 text-right text-sm font-semibold tabular-nums">
                    {formatINR(bill.total)}
                  </TableCell>
                  <TableCell className="py-3 pr-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewing(bill);
                      }}
                      aria-label={`View invoice ${bill.billNumber}`}
                    >
                      <Eye className="mr-1 size-3.5" aria-hidden="true" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AppointmentsTableCard
          appointments={appointments}
          title="Appointments"
          description="Your visits at the clinic"
          href="/patient/appointments"
        />
        <PrescriptionsTableCard
          prescriptions={prescriptions}
          title="Prescriptions"
          description="Prescriptions from your visits"
          href="/patient/medicines"
        />
      </div>

      <PatientBillDialog bill={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}