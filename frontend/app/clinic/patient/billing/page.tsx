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
      paid: "bg-green-100 text-green-700",
      issued: "bg-blue-100 text-blue-700",
      partial: "bg-yellow-100 text-yellow-700",
      void: "bg-slate-100 text-slate-600",
      draft: "bg-slate-100 text-slate-600",
    };
    return classes[status] ?? "bg-slate-100 text-slate-600";
  };

  const totalOutstanding = bills
    .filter((b) => b.paymentStatus !== "paid")
    .reduce((sum, b) => sum + b.balanceDue, 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-slate-200 rounded w-1/4 animate-pulse" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-slate-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">My Billing</h2>
          <p className="text-slate-500 mt-1">View invoices, payment history, and outstanding balances</p>
        </div>
        {totalOutstanding > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2">
            <AlertCircle className="size-5 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">
              Outstanding: ₹{totalOutstanding.toLocaleString("en-IN")}
            </span>
          </div>
        )}
      </div>

      {bills.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <CreditCard className="size-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No bills yet</h3>
          <p className="text-slate-500 mt-2">Your invoices and payment history will appear here.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-100 bg-slate-50/50">
                <TableHead className="font-medium text-slate-500">Invoice #</TableHead>
                <TableHead className="font-medium text-slate-500">Date</TableHead>
                <TableHead className="font-medium text-slate-500">Description</TableHead>
                <TableHead className="font-medium text-slate-500">Total</TableHead>
                <TableHead className="font-medium text-slate-500">Paid</TableHead>
                <TableHead className="font-medium text-slate-500">Balance</TableHead>
                <TableHead className="font-medium text-slate-500">Status</TableHead>
                <TableHead className="font-medium text-slate-500 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.map((bill) => (
                <TableRow key={bill.billId} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <TableCell className="font-mono text-sm text-slate-900">{bill.billNumber}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(bill.invoiceDate)}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {bill.items?.slice(0, 2).map((item, i) => (
                      <div key={i} className="text-sm text-slate-600">
                        {item.description} × {item.quantity}
                      </div>
                    ))}
                    {bill.items && bill.items.length > 2 && (
                      <p className="text-xs text-slate-400">+{bill.items.length - 2} more</p>
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">₹{bill.total.toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-green-600">₹{bill.amountPaid.toLocaleString("en-IN")}</TableCell>
                  <TableCell className="font-medium text-slate-900">₹{bill.balanceDue.toLocaleString("en-IN")}</TableCell>
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