"use client";

import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { printBill } from "@/components/billing-print";
import { formatINR } from "@/lib/billing";
import type { Bill } from "@/components/billing-table";

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

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export function BillingViewDialog({
  bill,
  onClose,
}: {
  bill: Bill | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(bill)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] w-full max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Invoice {bill?.billNumber} · {bill?.patientName}
          </DialogTitle>
          <DialogDescription>
            Bill · {bill ? formatDate(bill.date) : ""}
          </DialogDescription>
        </DialogHeader>

        {bill && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-4">
              <Row label="Patient" value={bill.patientName} />
              <Row label="Phone" value={bill.patientPhone || "—"} />
              <Row label="Date" value={formatDate(bill.date)} />
              <Row label="Doctor" value={bill.doctorName ?? "—"} />
              <Row
                label="Status"
                value={
                  <Badge
                    variant={
                      bill.status === "paid"
                        ? "default"
                        : bill.status === "pending"
                          ? "secondary"
                          : "destructive"
                    }
                    className="text-xs capitalize"
                  >
                    {bill.status}
                  </Badge>
                }
              />
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                Items
              </h3>
              {bill.items.length ? (
                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-xs tracking-wide text-muted-foreground uppercase">
                        <th className="px-3 py-2 text-left font-medium">Item</th>
                        <th className="px-3 py-2 text-center font-medium">Qty</th>
                        <th className="px-3 py-2 text-right font-medium">Price</th>
                        <th className="px-3 py-2 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bill.items.map((item, i) => (
                        <tr key={i} className="border-b border-border last:border-b-0">
                          <td className="px-3 py-2">{item.name || "—"}</td>
                          <td className="px-3 py-2 text-center tabular-nums">{item.qty}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {formatINR(item.price)}
                          </td>
                          <td className="px-3 py-2 text-right font-medium tabular-nums">
                            {formatINR(item.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No items.</p>
              )}
            </div>

            <div className="flex flex-col gap-1 rounded-lg border border-border bg-muted/30 p-4 text-sm">
              <Row label="Subtotal" value={formatINR(bill.subtotal)} />
              {bill.discount > 0 && (
                <Row label="Discount" value={`−${formatINR(bill.discount)}`} />
              )}
              {bill.tax > 0 && (
                <Row label={`Tax (${bill.taxRate}%)`} value={formatINR(bill.tax)} />
              )}
              <div className="mt-1 flex items-center justify-between border-t border-border pt-2">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-lg tabular-nums">
                  {formatINR(bill.total)}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Row label="Payment" value={bill.paymentMethod} />
              {bill.notes && <Row label="Notes" value={bill.notes} />}
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = `/api/bills/${bill.id}/pdf`;
                  a.download = "";
                  a.click();
                }}
              >
                <Download className="size-3.5" aria-hidden="true" />
                Download PDF
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => printBill(bill)}
              >
                <Printer className="size-3.5" aria-hidden="true" />
                Print
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
