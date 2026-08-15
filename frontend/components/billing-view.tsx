"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ExclamationTriangleIcon as AlertTriangleIcon,
  PlusIcon,
  MagnifyingGlassIcon as Search,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Stats07 from "@/components/stats-07";
import { BillingTable, type Bill } from "@/components/billing-table";
import { printBill } from "@/components/billing-print";
import { BillPreviewPanel } from "@/components/bill-preview-panel";
import type { StatsItem } from "@/lib/stats";

export function BillingView({
  initialBills,
  stats,
  onReady,
}: {
  initialBills: Bill[];
  stats?: StatsItem[];
  onReady?: (refetch: () => Promise<void>) => void;
}) {
  const [bills, setBills] = useState(initialBills);
  const [previewBill, setPreviewBill] = useState<Bill | null>(null);
  const [deleting, setDeleting] = useState<Bill | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");

  async function refetch() {
    const res = await fetch("/api/bills", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setBills(data.bills);
    }
  }

  useEffect(() => {
    onReady?.(refetch);
  }, [onReady]);

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    const res = await fetch(`/api/bills/${deleting.id}`, { method: "DELETE" });
    setDeleteBusy(false);
    if (res.ok) {
      toast.success("Bill deleted", { description: deleting.billNumber });
      setDeleting(null);
      await refetch();
    } else {
      const data = await res.json();
      toast.error(data.error || "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {previewBill && (
        <BillPreviewPanel
          bill={previewBill}
          onClose={() => setPreviewBill(null)}
        />
      )}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="md:w-1/3">
            <h1 className="text-xl font-semibold tracking-tight">Billing</h1>
            <p className="text-sm text-muted-foreground">
              Create and manage patient bills and invoices.
            </p>
          </div>
          <div className="flex justify-center md:w-1/3">
            <div className="relative w-full max-w-sm">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patient, invoice or item..."
                className="pl-8"
                aria-label="Search bills"
              />
            </div>
          </div>
          <div className="flex justify-end md:w-1/3">
            <Button
              size="sm"
              render={<Link href="/doctor/billing/new" />}
              nativeButton={false}
            >
              <PlusIcon className="mr-1 size-3.5" aria-hidden="true" />
              New Bill
            </Button>
          </div>
        </div>

        {stats && stats.length > 0 && (
          <Stats07 items={stats} className="border-0 bg-transparent p-0 shadow-none" />
        )}
      </div>

      <div className="flex flex-col gap-10">
        <BillingTable
          data={bills}
          search={search}
          statusFilter={statusFilter}
          paymentFilter={paymentFilter}
          onStatusFilterChange={setStatusFilter}
          onPaymentFilterChange={setPaymentFilter}
          onPrint={printBill}
          onDelete={setDeleting}
          onPreview={setPreviewBill}
        />
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
              <DialogTitle>Delete bill</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete bill{" "}
                <span className="font-medium text-foreground">
                  {deleting?.billNumber}
                </span>{" "}
                for {deleting?.patientName}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteBusy}
            >
              {deleteBusy ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
