"use client";

import { useEffect, useState } from "react";
import { useRequireRole } from "@/hooks/use-clinic-session";
import { myBills, type Bill } from "@/lib/clinic-api";
import { formatDate } from "@/lib/format-time";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ChevronRight, Download, AlertCircle } from "lucide-react";

export default function PatientBillingPage() {
  const session = useRequireRole("patient");
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.clinicId) return;
    myBills(session.clinicId)
      .then((res) => {
        setBills(res.items);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session?.clinicId]);

  const getStatusClass = (status: string) => {
    const classes: Record<string, string> = {
      paid: "bg-success/10 text-success",
      issued: "bg-primary/10 text-primary",
      partial: "bg-warning/10 text-warning",
      void: "bg-muted text-muted-foreground",
      draft: "bg-muted text-muted-foreground",
    };
    return classes[status] ?? "bg-muted text-muted-foreground";
  };

  const totalOutstanding = bills
    .filter((b) => b.paymentStatus !== "paid")
    .reduce((sum, b) => sum + b.balanceDue, 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded w-1/4 animate-pulse" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-muted rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">My Billing</h2>
          <p className="text-muted-foreground mt-1">View invoices, payment history, and outstanding balances</p>
        </div>
        {totalOutstanding > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-warning/10 border border-warning/25 px-4 py-2">
            <AlertCircle className="size-5 text-warning" />
            <span className="text-sm font-medium text-warning">
              Outstanding: ₹{totalOutstanding.toLocaleString("en-IN")}
            </span>
          </div>
        )}
      </div>

      {bills.length === 0 ? (
        <div className="rounded-xl border border-border bg-background p-12 text-center">
          <CreditCard className="size-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">No bills yet</h3>
          <p className="text-muted-foreground mt-2">Your invoices and payment history will appear here.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-background shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border bg-muted/50">
                <TableHead className="font-medium text-muted-foreground">Invoice #</TableHead>
                <TableHead className="font-medium text-muted-foreground">Date</TableHead>
                <TableHead className="font-medium text-muted-foreground">Description</TableHead>
                <TableHead className="font-medium text-muted-foreground">Total</TableHead>
                <TableHead className="font-medium text-muted-foreground">Paid</TableHead>
                <TableHead className="font-medium text-muted-foreground">Balance</TableHead>
                <TableHead className="font-medium text-muted-foreground">Status</TableHead>
                <TableHead className="font-medium text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.map((bill) => (
                <TableRow key={bill.billId} className="border-b border-border hover:bg-muted/50">
                  <TableCell className="font-mono text-sm text-foreground">{bill.billNumber}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(bill.invoiceDate)}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {bill.items?.slice(0, 2).map((item, i) => (
                      <div key={i} className="text-sm text-muted-foreground">
                        {item.description} × {item.quantity}
                      </div>
                    ))}
                    {bill.items && bill.items.length > 2 && (
                      <p className="text-xs text-muted-foreground">+{bill.items.length - 2} more</p>
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">₹{bill.total.toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-success">₹{bill.amountPaid.toLocaleString("en-IN")}</TableCell>
                  <TableCell className="font-medium text-foreground">₹{bill.balanceDue.toLocaleString("en-IN")}</TableCell>
                  <TableCell>
                    <Badge className={getStatusClass(bill.status)} variant="outline">
                      {bill.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="gap-1.5">
                      <Download className="size-4" />
                      PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}