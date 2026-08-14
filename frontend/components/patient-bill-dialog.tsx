"use client";

import { Download, Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/billing";
import { printBill } from "@/components/billing-print";
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

export function PatientBillDialog({
  bill,
  onClose,
}: {
  bill: Bill | null;
  onClose: () => void;
}) {
  if (!bill) return null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] w-full max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2 pr-8">
            <DialogTitle className="text-lg">Invoice {bill.billNumber}</DialogTitle>
            <Badge variant={statusVariant[bill.status]} className="text-xs capitalize">
              {bill.status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="grid gap-x-4 gap-y-2 rounded-lg border border-border bg-muted/30 p-4 text-sm sm:grid-cols-2">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Date:</span>
            <span className="font-medium">{formatDate(bill.date)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Doctor:</span>
            <span className="font-medium">{bill.doctorName ?? "—"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Payment:</span>
            <span className="font-medium">{bill.paymentMethod}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Bill date:</span>
            <span className="font-medium">{formatDate(bill.createdAt)}</span>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs tracking-wide text-muted-foreground uppercase">
                <th className="px-4 py-2 text-left font-medium">#</th>
                <th className="px-4 py-2 text-left font-medium">Item / Service</th>
                <th className="px-4 py-2 text-right font-medium">Qty</th>
                <th className="px-4 py-2 text-right font-medium">Price</th>
                <th className="px-4 py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {bill.items.length ? (
                bill.items.map((item, i) => (
                  <tr
                    key={`${item.name}-${i}`}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-2 font-medium">{item.name || "—"}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{item.qty}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatINR(item.price)}
                    </td>
                    <td className="px-4 py-2 text-right font-medium tabular-nums">
                      {formatINR(item.amount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    No items
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="ml-auto flex w-full max-w-xs flex-col gap-1.5 rounded-lg border border-border bg-muted/30 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">{formatINR(bill.subtotal)}</span>
          </div>
          {bill.discount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span className="tabular-nums">−{formatINR(bill.discount)}</span>
            </div>
          )}
          {bill.tax > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax ({bill.taxRate}%)</span>
              <span className="tabular-nums">{formatINR(bill.tax)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatINR(bill.total)}</span>
          </div>
        </div>

        {bill.notes && (
          <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <span className="text-muted-foreground">Notes: </span>
            {bill.notes}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            <X className="mr-1 size-3.5" aria-hidden="true" />
            Close
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const a = document.createElement("a");
              a.href = `/api/bills/${bill.id}/pdf`;
              a.download = "";
              a.click();
            }}
          >
            <Download className="mr-1 size-3.5" aria-hidden="true" />
            Download PDF
          </Button>
          <Button onClick={() => printBill(bill)}>
            <Printer className="mr-1 size-3.5" aria-hidden="true" />
            Print / Save PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
