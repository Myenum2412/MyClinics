"use client";
import * as React from "react";
import Link from "next/link";
import { useRequireRole } from "@/hooks/use-clinic-session";
import { getPharmacyDashboard, getPharmacyAlerts, listInventory, listMedicines, listMovements, listPurchases, listSales, listSuppliers, type PharmacyDashboard, type PharmacyAlerts } from "@/lib/clinic-api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Boxes, AlertTriangle, Ban, Clock, ShoppingCart, Receipt, Truck, ArrowRight, Plus, History, FileText, Users, TrendingUp, Calendar } from "lucide-react";

export default function PharmacyOverviewPage() {
  const session = useRequireRole("patient");
  const clinicId = session?.clinicId ?? "";
  const [dash, setDash] = React.useState<PharmacyDashboard | null>(null);
  const [alerts, setAlerts] = React.useState<PharmacyAlerts | null>(null);
  const [movements, setMovements] = React.useState<any[]>([]);
  const [purchases, setPurchases] = React.useState<any[]>([]);
  const [sales, setSales] = React.useState<any[]>([]);
  const [suppliers, setSuppliers] = React.useState<any[]>([]);
  const [inventory, setInventory] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!clinicId) return;
    Promise.allSettled([
      getPharmacyDashboard(clinicId),
      getPharmacyAlerts(clinicId).catch(() => null),
      listInventory(clinicId, { limit: 1000 }),
      listMovements(clinicId, { limit: 10 }),
      listPurchases(clinicId, { limit: 5 }),
      listSales(clinicId, { limit: 5 }),
      listSuppliers(clinicId, { limit: 100 }),
    ]).then((r) => {
      if (r[0].status === "fulfilled") setDash(r[0].value as any);
      if (r[1].status === "fulfilled" && r[1].value) setAlerts(r[1].value as any);
      if (r[2].status === "fulfilled") setInventory((r[2].value as any).items ?? []);
      if (r[3].status === "fulfilled") setMovements((r[3].value as any).items ?? []);
      if (r[4].status === "fulfilled") setPurchases((r[4].value as any).items ?? []);
      if (r[5].status === "fulfilled") setSales((r[5].value as any).items ?? []);
      if (r[6].status === "fulfilled") setSuppliers((r[6].value as any).items ?? []);
      setLoading(false);
    });
  }, [clinicId]);

  if (!session) return null;
  if (loading) return <div className="p-6 space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>;

  const totalMeds = dash?.totalMedicines ?? inventory.length;
  const lowStock = dash?.lowStock ?? inventory.filter((i:any)=>i.status==="low_stock").length;
  const outOfStock = dash?.outOfStock ?? inventory.filter((i:any)=>i.status==="out_of_stock").length;
  const nearExpiry = dash?.nearExpiry ?? inventory.filter((i:any)=>i.status==="near_expiry").length;
  const expired = dash?.expired ?? inventory.filter((i:any)=>i.status==="expired").length;
  const inStock = inventory.filter((i:any)=>i.status==="in_stock").length;
  const availableStock = inventory.reduce((s:number,i:any)=>s+(i.quantityAvailable??0),0);
  const totalSuppliers = suppliers.length;
  const activeSuppliers = suppliers.filter((s:any)=>s.status==="active").length;
  const pendingPurchases = purchases.filter((p:any)=>p.status==="draft").length;
  const todaySales = dash?.todaySales;

  // alerts list
  const alertItems: { label: string; count: number; href: string; color: string; icon: any }[] = [
    ...(lowStock ? [{ label: "Low-stock medicines", count: lowStock, href: "/clinic/pharmacy/inventory?status=low_stock", color: "text-amber-600 bg-amber-50 border-amber-200", icon: AlertTriangle }] : []),
    ...(outOfStock ? [{ label: "Out-of-stock medicines", count: outOfStock, href: "/clinic/pharmacy/inventory?status=out_of_stock", color: "text-red-600 bg-red-50 border-red-200", icon: Ban }] : []),
    ...(nearExpiry ? [{ label: "Nearing expiry", count: nearExpiry, href: "/clinic/pharmacy/inventory?status=near_expiry", color: "text-orange-600 bg-orange-50 border-orange-200", icon: Clock }] : []),
    ...(expired ? [{ label: "Expired medicines", count: expired, href: "/clinic/pharmacy/inventory?status=expired", color: "text-red-700 bg-red-50 border-red-200", icon: Ban }] : []),
    ...(pendingPurchases ? [{ label: "Pending purchases", count: pendingPurchases, href: "/clinic/pharmacy/purchases", color: "text-blue-600 bg-blue-50 border-blue-200", icon: ShoppingCart }] : []),
  ];

  // recent activity combined
  const recentActivity = [
    ...movements.slice(0,5).map((m:any)=>({ date: m.createdAt, type: m.movementType, detail: m.medicineName ?? m.medicineId?.slice(0,8), qty: m.quantityChanged, status: m.movementType, href: "/clinic/pharmacy/stock-history" })),
    ...purchases.slice(0,3).map((p:any)=>({ date: p.createdAt ?? p.purchaseDate, type: "purchase", detail: p.invoiceNumber, qty: p.total, status: p.status, href: "/clinic/pharmacy/purchases" })),
    ...sales.slice(0,3).map((s:any)=>({ date: s.createdAt ?? s.saleDate, type: "sale", detail: s.invoiceNumber, qty: s.total, status: s.status, href: "/clinic/pharmacy/sales" })),
  ].sort((a,b)=> new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0,8);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pharmacy Overview</h1>
          <p className="text-sm text-muted-foreground">Central dashboard — stock, purchases, sales and suppliers at a glance.</p>
        </div>
        <Button variant="outline" size="sm" onClick={()=>window.location.reload()}>Refresh</Button>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Quick Actions</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link href="/clinic/pharmacy/medicines/new"><Button size="sm" className="gap-1"><Plus className="size-4"/>Add Medicine</Button></Link>
          <Link href="/clinic/pharmacy/inventory/opening-stock"><Button size="sm" variant="outline" className="gap-1"><Boxes className="size-4"/>Add Stock</Button></Link>
          <Link href="/clinic/pharmacy/purchases/new"><Button size="sm" variant="outline" className="gap-1"><ShoppingCart className="size-4"/>Record Purchase</Button></Link>
          <Link href="/clinic/pharmacy/sales/new"><Button size="sm" variant="outline" className="gap-1"><Receipt className="size-4"/>Record Sale</Button></Link>
          <Link href="/clinic/pharmacy/suppliers/new"><Button size="sm" variant="outline" className="gap-1"><Truck className="size-4"/>Add Supplier</Button></Link>
          <Link href="/clinic/pharmacy/stock-history"><Button size="sm" variant="outline" className="gap-1"><History className="size-4"/>Stock History</Button></Link>
        </CardContent>
      </Card>

      {/* Alerts */}
      {alertItems.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="size-4 text-amber-600"/>Attention Required</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {alertItems.map((a)=>(
              <Link key={a.label} href={a.href} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${a.color} hover:opacity-80`}>
                <a.icon className="size-4"/>{a.label}: {a.count}<ArrowRight className="size-3"/>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 5 Overview Sections */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* Inventory */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Package className="size-4"/>Inventory Overview</CardTitle><CardDescription>Stock status</CardDescription></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-muted p-3"><div className="text-xs text-muted-foreground">Total Items</div><div className="text-xl font-semibold">{totalMeds}</div></div>
              <div className="rounded-lg bg-muted p-3"><div className="text-xs text-muted-foreground">Available Units</div><div className="text-xl font-semibold">{availableStock}</div></div>
              <div className="rounded-lg bg-green-50 p-3"><div className="text-xs text-muted-foreground">In Stock</div><div className="text-xl font-semibold text-green-700">{inStock}</div></div>
              <div className="rounded-lg bg-amber-50 p-3"><div className="text-xs text-muted-foreground">Low Stock</div><div className="text-xl font-semibold text-amber-700">{lowStock}</div></div>
              <div className="rounded-lg bg-red-50 p-3"><div className="text-xs text-muted-foreground">Out of Stock</div><div className="text-xl font-semibold text-red-700">{outOfStock}</div></div>
              <div className="rounded-lg bg-orange-50 p-3"><div className="text-xs text-muted-foreground">Expiring / Expired</div><div className="text-xl font-semibold text-orange-700">{nearExpiry + expired}</div></div>
            </div>
            <Link href="/clinic/pharmacy/inventory" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">View Inventory <ArrowRight className="size-3"/></Link>
          </CardContent>
        </Card>

        {/* Stock Activity */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><History className="size-4"/>Stock Activity</CardTitle><CardDescription>Recent movements</CardDescription></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {movements.length===0 ? <p className="text-muted-foreground text-xs">No movements yet.</p> : movements.slice(0,4).map((m:any)=>(
              <div key={m.movementId} className="flex justify-between border-b py-1.5 last:border-0">
                <div><Badge variant="outline" className="text-xs mr-1">{m.movementType}</Badge><span className="text-xs">{m.medicineName ?? m.medicineId?.slice(0,8)}</span></div>
                <span className={`text-xs font-medium ${m.quantityChanged>0?"text-green-600":"text-red-600"}`}>{m.quantityChanged>0?"+":""}{m.quantityChanged}</span>
              </div>
            ))}
            <div className="text-xs text-muted-foreground">Today: {dash?.stockMovementsToday ?? movements.length} movements</div>
            <Link href="/clinic/pharmacy/stock-history" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">View Stock History <ArrowRight className="size-3"/></Link>
          </CardContent>
        </Card>

        {/* Purchases */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShoppingCart className="size-4"/>Purchase Overview</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-muted p-3"><div className="text-xs text-muted-foreground">Total Purchases</div><div className="text-xl font-semibold">{purchases.length}</div></div>
              <div className="rounded-lg bg-amber-50 p-3"><div className="text-xs text-muted-foreground">Pending</div><div className="text-xl font-semibold text-amber-700">{pendingPurchases}</div></div>
            </div>
            <div className="text-xs">Total value: <span className="font-semibold">₹{(dash?.purchaseValue ?? purchases.reduce((s:number,p:any)=>s+(p.total??0),0)).toLocaleString("en-IN")}</span></div>
            {purchases.slice(0,3).map((p:any)=>(<div key={p.purchaseId} className="flex justify-between text-xs border-b py-1 last:border-0"><span>{p.invoiceNumber}</span><Badge variant="outline">{p.status}</Badge></div>))}
            <Link href="/clinic/pharmacy/purchases" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">View Purchases <ArrowRight className="size-3"/></Link>
          </CardContent>
        </Card>

        {/* Sales */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Receipt className="size-4"/>Sales Overview</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-muted p-3"><div className="text-xs text-muted-foreground">Total Sales</div><div className="text-xl font-semibold">{sales.length}</div></div>
              <div className="rounded-lg bg-green-50 p-3"><div className="text-xs text-muted-foreground">Today</div><div className="text-xl font-semibold text-green-700">{todaySales?.count ?? 0} <span className="text-xs font-normal">₹{(todaySales?.value ?? 0).toLocaleString("en-IN")}</span></div></div>
            </div>
            {sales.slice(0,3).map((s:any)=>(<div key={s.saleId} className="flex justify-between text-xs border-b py-1 last:border-0"><span>{s.invoiceNumber}</span><span>₹{Number(s.total).toLocaleString("en-IN")}</span></div>))}
            <Link href="/clinic/pharmacy/sales" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">View Sales <ArrowRight className="size-3"/></Link>
          </CardContent>
        </Card>

        {/* Suppliers */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Truck className="size-4"/>Supplier Overview</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-muted p-3"><div className="text-xs text-muted-foreground">Total Suppliers</div><div className="text-xl font-semibold">{totalSuppliers}</div></div>
              <div className="rounded-lg bg-green-50 p-3"><div className="text-xs text-muted-foreground">Active</div><div className="text-xl font-semibold text-green-700">{activeSuppliers}</div></div>
            </div>
            {suppliers.slice(0,3).map((s:any)=>(<div key={s.supplierId} className="flex justify-between text-xs border-b py-1 last:border-0"><span>{s.name}</span><Badge variant="outline">{s.status}</Badge></div>))}
            <Link href="/clinic/pharmacy/suppliers" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">View Suppliers <ArrowRight className="size-3"/></Link>
          </CardContent>
        </Card>

        {/* Summary value */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="size-4"/>Stock Value</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(dash?.totalStockValue ?? 0).toLocaleString("en-IN")}</div>
            <p className="text-xs text-muted-foreground">Total inventory value • {dash?.reorderCount ?? lowStock} items need reorder</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Calendar className="size-4"/>Recent Pharmacy Activity</CardTitle><CardDescription>Latest events across inventory, purchases, sales and movements</CardDescription></CardHeader>
        <CardContent>
          {recentActivity.length===0 ? <p className="text-sm text-muted-foreground py-4 text-center">No recent activity.</p> : (
            <div className="space-y-2">
              {recentActivity.map((a,idx)=>(
                <Link key={idx} href={a.href} className="flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-muted/50 text-sm">
                  <div className="flex items-center gap-2"><Badge variant="outline" className="capitalize text-xs">{a.type}</Badge><span className="font-medium">{a.detail}</span><span className="text-xs text-muted-foreground">{a.date ? new Date(a.date).toLocaleDateString("en-IN") : ""}</span></div>
                  <div className="flex items-center gap-2"><span className="text-xs tabular-nums">{typeof a.qty==="number" ? (a.type==="sale"||a.type==="purchase" ? `₹${a.qty.toLocaleString("en-IN")}` : a.qty) : ""}</span><Badge variant="outline" className="text-xs">{a.status}</Badge></div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
