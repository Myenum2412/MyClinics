"use client";

import * as React from "react";
import Link from "next/link";
import { useRequireRole } from "@/hooks/use-clinic-session";
import { getPharmacyDashboard, listMedicines, listInventory, type PharmacyDashboard, type PharmacyMedicine, type PharmacyInventory } from "@/lib/clinic-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, AlertTriangle, TrendingUp, ShoppingCart, DollarSign, Calendar } from "lucide-react";

export default function PharmacyOverviewPage() {
  const session = useRequireRole("billing_staff");
  const clinicId = session?.clinicId ?? "";
  const [dash, setDash] = React.useState<PharmacyDashboard | null>(null);
  const [medicines, setMedicines] = React.useState<PharmacyMedicine[]>([]);
  const [inventory, setInventory] = React.useState<PharmacyInventory[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!clinicId) return;
    Promise.all([
      getPharmacyDashboard(clinicId).catch(() => null),
      listMedicines(clinicId, { limit: 1000 }).catch(() => ({ items: [] as PharmacyMedicine[], total: 0 })),
      listInventory(clinicId, { limit: 1000 }).catch(() => ({ items: [] as PharmacyInventory[], total: 0 })),
    ]).then(([d, m, inv]) => {
      setDash(d);
      setMedicines(m.items);
      setInventory(inv.items);
    }).finally(() => setLoading(false));
  }, [clinicId]);

  if (!session) return null;
  if (loading) return <div className="p-6 space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>;

  const medMap = new Map(medicines.map((m) => [m.medicineId, m]));

  const stats = [
    { label: "Total Medicines", value: dash?.totalMedicines ?? medicines.length, icon: Package },
    { label: "Stock Value", value: `₹${(dash?.totalStockValue ?? 0).toLocaleString("en-IN")}`, icon: DollarSign },
    { label: "Low Stock", value: dash?.lowStock ?? 0, icon: AlertTriangle },
    { label: "Today Sales", value: `${dash?.todaySales.count ?? 0} (₹${(dash?.todaySales.value ?? 0).toLocaleString("en-IN")})`, icon: ShoppingCart },
    { label: "Near Expiry", value: dash?.nearExpiry ?? 0, icon: Calendar },
    { label: "Reorder Needed", value: dash?.reorderCount ?? 0, icon: TrendingUp },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pharmacy Overview</h1>
          <p className="text-sm text-muted-foreground">All pharmacy items — stock, pricing and status.</p>
        </div>
        <div className="flex gap-2 text-xs">
          <Link href="/clinic/pharmacy/medicines" className="underline">Medicines</Link>
          <Link href="/clinic/pharmacy/inventory" className="underline">Inventory</Link>
          <Link href="/clinic/pharmacy/reports" className="underline">Reports</Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">{s.label}</CardTitle><s.icon className="size-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{s.value}</div></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">All Pharmacy Items Report</CardTitle></CardHeader>
        <CardContent className="p-0">
          {inventory.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No inventory items found. Add medicines and stock first.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader><TableRow className="bg-muted/40"><TableHead>Medicine</TableHead><TableHead>Category</TableHead><TableHead>Batch</TableHead><TableHead className="text-right">Available</TableHead><TableHead className="text-right">MRP</TableHead><TableHead className="text-right">Selling</TableHead><TableHead>Expiry</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {inventory.map((inv) => {
                    const med = medMap.get(inv.medicineId);
                    return (
                      <TableRow key={inv.inventoryId}>
                        <TableCell className="font-medium">{med?.name ?? inv.medicineId.slice(0, 8)}</TableCell>
                        <TableCell>{med?.category ?? "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{inv.batchNumber ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{inv.quantityAvailable}</TableCell>
                        <TableCell className="text-right tabular-nums">₹{Number(med?.purchasePrice ?? inv.purchasePrice ?? 0).toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-right tabular-nums">₹{Number(med?.sellingPrice ?? inv.sellingPrice ?? 0).toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-xs">{inv.expiryDate ? new Date(inv.expiryDate).toLocaleDateString("en-IN") : "—"}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{inv.status ?? med?.status ?? "—"}</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
