"use client";

import { useMemo, useState } from "react";
import { Eye, ReceiptText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PatientBillDialog } from "@/components/patient-bill-dialog";
import { formatINR } from "@/lib/billing";
import type { Bill } from "@/components/billing-table";

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

export function PatientBilling({ bills }: { bills: Bill[] }) {
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

      {visibleBills.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border p-12 text-center">
          <ReceiptText className="size-8 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium">
              {bills.length === 0 ? "No bills yet" : "No matching bills"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {bills.length === 0
                ? "Your invoices will appear here after your visits."
                : "Try a different search."}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {visibleBills.map((bill) => (
            <div
              key={bill.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="text-sm font-medium">
                  {bill.billNumber}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {formatDate(bill.date)}
                  </span>
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {bill.doctorName ? `${bill.doctorName} · ` : ""}
                  {bill.paymentMethod} · {bill.items.length} item
                  {bill.items.length === 1 ? "" : "s"}
                </p>
              </div>
              <Badge variant={statusVariant[bill.status]} className="text-xs capitalize">
                {bill.status}
              </Badge>
              <p className="text-base font-semibold tabular-nums">
                {formatINR(bill.total)}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewing(bill)}
                aria-label={`View invoice ${bill.billNumber}`}
              >
                <Eye className="mr-1 size-3.5" aria-hidden="true" />
                View
              </Button>
            </div>
          ))}
        </div>
      )}

      <PatientBillDialog bill={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
