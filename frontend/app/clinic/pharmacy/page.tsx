"use client";

import * as React from "react";
import Link from "next/link";
import { useRequireRole } from "@/hooks/use-clinic-session";
import { getPharmacyDashboard, listMedicines, listInventory, type PharmacyDashboard, type PharmacyMedicine, type PharmacyInventory } from "@/lib/clinic-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";
import { ChartContainer } from "@/components/ui/chart";

export default function PharmacyOverviewPage() {
  const session = useRequireRole("patient");
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

  // stats-07 style radial data — pharmacy metrics
  const totalMeds = dash?.totalMedicines ?? medicines.length;
  const stockVal = dash?.totalStockValue ?? 0;
  const stats07 = [
    { name: "Total Medicines", percentage: Math.min(100, totalMeds), current: totalMeds, allowed: 100, allowedLabel: "medicines", fill: "var(--chart-1)" },
    { name: "Stock Value", percentage: Math.min(100, Math.round((stockVal / 100000) * 100)), current: `₹${stockVal.toLocaleString("en-IN")}`, allowed: "₹1L", allowedLabel: "target", fill: "var(--chart-2)" },
    { name: "Low Stock", percentage: totalMeds ? Math.round(((dash?.lowStock ?? 0) / totalMeds) * 100) : 0, current: dash?.lowStock ?? 0, allowed: totalMeds, allowedLabel: "items", fill: "var(--chart-3)" },
    { name: "Today Sales", percentage: Math.min(100, Math.round(((dash?.todaySales.count ?? 0) / 20) * 100)), current: dash?.todaySales.count ?? 0, allowed: 20, allowedLabel: `₹${(dash?.todaySales.value ?? 0).toLocaleString("en-IN")}`, fill: "var(--chart-4)" },
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

      <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats07.map((item) => (
          <Card className="p-4 shadow-sm bg-card" key={item.name}>
            <CardContent className="flex items-center space-x-4 p-0">
              <div className="relative flex items-center justify-center">
                <ChartContainer className="h-[80px] w-[80px]" config={{ capacity: { label: item.name, color: item.fill } }}>
                  <RadialBarChart barSize={6} data={[{ name: item.name, capacity: item.percentage }]} endAngle={-270} innerRadius={30} outerRadius={60} startAngle={90}>
                    <PolarAngleAxis angleAxisId={0} axisLine={false} domain={[0, 100]} tick={false} type="number" />
                    <RadialBar angleAxisId={0} background cornerRadius={10} dataKey="capacity" fill={item.fill} />
                  </RadialBarChart>
                </ChartContainer>
                <div className="absolute inset-0 flex items-center justify-center"><span className="font-semibold text-xs text-foreground">{item.percentage}%</span></div>
              </div>
              <div>
                <dt className="font-semibold text-foreground text-sm tracking-tight leading-none mb-1">{item.name}</dt>
                <dd className="text-muted-foreground text-xs">{String(item.current)} of {String(item.allowed)} {item.allowedLabel}</dd>
              </div>
            </CardContent>
          </Card>
        ))}
      </dl>

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
