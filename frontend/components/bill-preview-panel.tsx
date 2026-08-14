"use client";

import Link from "next/link";
import { ArrowRight, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PreviewSheet } from "@/components/preview-sheet";
import type { Bill } from "@/components/billing-table";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : dateFmt.format(parsed);
}

const statusVariant: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  paid: "default",
  pending: "secondary",
  cancelled: "destructive",
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export function BillPreviewPanel({
  bill,
  onClose,
}: {
  bill: Bill;
  onClose: () => void;
}) {
  return (
    <PreviewSheet
      title={
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate">{bill.billNumber}</span>
          <Badge
            variant={statusVariant[bill.status] ?? "secondary"}
            className="text-xs capitalize"
          >
            {bill.status}
          </Badge>
        </div>
      }
      subtitle={`${bill.patientName} · ${formatDate(bill.date)}`}
      onClose={onClose}
      footer={
        <>
          <Button
            variant="outline"
            className="flex-1"
            render={<Link href={`/doctor/billing/${bill.id}/edit`} />}
            nativeButton={false}
          >
            <Pencil className="mr-1 size-3.5" aria-hidden="true" />
            Edit
          </Button>
          <Button
            className="flex-1"
            render={<Link href={`/doctor/billing/${bill.id}`} />}
            nativeButton={false}
          >
            View Full Page
            <ArrowRight className="ml-1 size-3.5" aria-hidden="true" />
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Bill Details
        </h2>
        <Field label="Patient" value={bill.patientName} />
        <Field label="Phone" value={bill.patientPhone ?? "—"} />
        <Field label="Doctor" value={bill.doctorName ?? "—"} />
        <Field label="Payment" value={bill.paymentMethod || "—"} />
        {bill.notes && <Field label="Notes" value={bill.notes} />}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Items ({bill.items.length})
        </h2>
        {bill.items.length ? (
          <div className="flex flex-col gap-2">
            {bill.items.map((item, i) => (
              <div
                key={`${item.name}-${i}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate font-medium">{item.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {item.qty} × {inr(item.price)} ={" "}
                  <span className="font-medium text-foreground">
                    {inr(item.amount)}
                  </span>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No items.</p>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Totals
        </h2>
        <Field label="Subtotal" value={inr(bill.subtotal)} />
        {bill.discount > 0 && (
          <Field label="Discount" value={`- ${inr(bill.discount)}`} />
        )}
        {bill.tax > 0 && (
          <Field
            label={`Tax (${bill.taxRate}%)`}
            value={inr(bill.tax)}
          />
        )}
        <div className="flex items-baseline justify-between gap-4 border-t border-border pt-2 text-sm">
          <span className="font-semibold">Total</span>
          <span className="font-semibold tabular-nums">{inr(bill.total)}</span>
        </div>
      </div>
    </PreviewSheet>
  );
}