"use client";
import * as React from "react";
import Link from "next/link";
import { useRequireRole } from "@/hooks/use-clinic-session";
import { getPharmacyDashboard, getPharmacyAlerts, listInventory, listMovements, listPurchases, listSales, listSuppliers, type PharmacyDashboard, type PharmacyAlerts } from "@/lib/clinic-api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Package, Boxes, AlertTriangle, Ban, Clock, ShoppingCart, Receipt, Truck, ArrowRight, Plus, History, TrendingUp, Calendar, Sparkles, ArrowUpRight } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

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
  if (loading) return <div className="w-full p-8 space-y-4"><Skeleton className="h-28 w-full rounded-2xl" /><Skeleton className="h-[420px] w-full rounded-2xl" /></div>;

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

  const alertItems: { label: string; count: number; href: string; color: string; icon: any }[] = [
    ...(lowStock ? [{ label: "Low-stock", count: lowStock, href: "/clinic/pharmacy/inventory?status=low_stock", color: "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/30", icon: AlertTriangle }] : []),
    ...(outOfStock ? [{ label: "Out-of-stock", count: outOfStock, href: "/clinic/pharmacy/inventory?status=out_of_stock", color: "text-red-700 bg-red-50 border-red-200 dark:bg-red-950/30", icon: Ban }] : []),
    ...(nearExpiry ? [{ label: "Nearing expiry", count: nearExpiry, href: "/clinic/pharmacy/inventory?status=near_expiry", color: "text-orange-700 bg-orange-50 border-orange-200 dark:bg-orange-950/30", icon: Clock }] : []),
    ...(expired ? [{ label: "Expired", count: expired, href: "/clinic/pharmacy/inventory?status=expired", color: "text-red-800 bg-red-50 border-red-200", icon: Ban }] : []),
    ...(pendingPurchases ? [{ label: "Pending purchases", count: pendingPurchases, href: "/clinic/pharmacy/purchases", color: "text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/30", icon: ShoppingCart }] : []),
  ];

  const stockChartData = [
    { name: "In Stock", value: inStock },
    { name: "Low", value: lowStock },
    { name: "Out", value: outOfStock },
    { name: "Near Expiry", value: nearExpiry },
    { name: "Expired", value: expired },
  ].filter(d=>d.value>0);

  const salesPurchaseData = [
    { name: "Purchases", value: purchases.reduce((s:number,p:any)=>s+(p.total??0),0) },
    { name: "Sales", value: sales.reduce((s:number,p:any)=>s+(p.total??0),0) },
    { name: "Stock Value", value: dash?.totalStockValue ?? 0 },
  ];

  const recentActivity = [
    ...movements.slice(0,5).map((m:any)=>({ date: m.createdAt, type: m.movementType, detail: m.medicineName ?? m.medicineId?.slice(0,8), qty: m.quantityChanged, status: m.movementType, href: "/clinic/pharmacy/stock-history" })),
    ...purchases.slice(0,3).map((p:any)=>({ date: p.createdAt ?? p.purchaseDate, type: "purchase", detail: p.invoiceNumber, qty: p.total, status: p.status, href: "/clinic/pharmacy/purchases" })),
    ...sales.slice(0,3).map((s:any)=>({ date: s.createdAt ?? s.saleDate, type: "sale", detail: s.invoiceNumber, qty: s.total, status: s.status, href: "/clinic/pharmacy/sales" })),
  ].sort((a,b)=> new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0,8);

  return (
    <div className="w-full space-y-8 p-6 md:p-8 bg-gradient-to-b from-background to-muted/20 min-h-screen">
      {/* Header — Linear/Stripe style */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium shadow-sm"><Sparkles className="size-3.5 text-primary"/>Pharmacy Command Center</div>
          <h1 className="text-3xl font-semibold tracking-tight">Pharmacy Overview</h1>
          <p className="text-sm text-muted-foreground max-w-xl">Unified view of stock, purchases, sales and suppliers. Every metric updates live from the underlying pharmacy modules.</p>
        </div>
        <Button variant="outline" size="sm" onClick={()=>window.location.reload()} className="rounded-full shadow-sm">Refresh</Button>
      </div>

      {/* Quick Actions — pill actions */}
      <Card className="rounded-2xl border shadow-sm backdrop-blur">
        <CardContent className="flex flex-wrap gap-2.5 p-5">
          <Link href="/clinic/pharmacy/medicines/new"><Button size="sm" className="rounded-full gap-1.5 shadow-sm"><Plus className="size-4"/>Add Medicine</Button></Link>
          <Link href="/clinic/pharmacy/inventory/opening-stock"><Button size="sm" variant="outline" className="rounded-full gap-1.5"><Boxes className="size-4"/>Add Stock</Button></Link>
          <Link href="/clinic/pharmacy/purchases/new"><Button size="sm" variant="outline" className="rounded-full gap-1.5"><ShoppingCart className="size-4"/>Record Purchase</Button></Link>
          <Link href="/clinic/pharmacy/sales/new"><Button size="sm" variant="outline" className="rounded-full gap-1.5"><Receipt className="size-4"/>Record Sale</Button></Link>
          <Link href="/clinic/pharmacy/suppliers/new"><Button size="sm" variant="outline" className="rounded-full gap-1.5"><Truck className="size-4"/>Add Supplier</Button></Link>
          <Link href="/clinic/pharmacy/stock-history"><Button size="sm" variant="ghost" className="rounded-full gap-1.5"><History className="size-4"/>Stock History</Button></Link>
        </CardContent>
      </Card>

      {/* Alerts — premium banner */}
      {alertItems.length > 0 && (
        <Card className="rounded-2xl border-amber-200/60 bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/10 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><span className="flex size-7 items-center justify-center rounded-full bg-amber-500 text-white shadow"><AlertTriangle className="size-4"/></span>Attention Required <Badge variant="secondary" className="rounded-full">{alertItems.length}</Badge></CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {alertItems.map((a)=>(
              <Link key={a.label} href={a.href} className={`group inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium shadow-sm transition-all hover:shadow hover:-translate-y-px ${a.color}`}>
                <a.icon className="size-4"/>{a.label}: {a.count}<ArrowUpRight className="size-3.5 opacity-60 group-hover:opacity-100 transition"/>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* KPI Grid — 5 overview sections as premium cards */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {[
          { title:"Inventory", icon:Package, href:"/clinic/pharmacy/inventory", stats:[["Total Items",totalMeds],["Available",availableStock],["In Stock",inStock],["Low",lowStock],["Out",outOfStock],["Expiring",nearExpiry+expired]] },
          { title:"Stock Activity", icon:History, href:"/clinic/pharmacy/stock-history", custom:true },
          { title:"Purchases", icon:ShoppingCart, href:"/clinic/pharmacy/purchases", stats:[["Total",purchases.length],["Pending",pendingPurchases]] },
          { title:"Sales", icon:Receipt, href:"/clinic/pharmacy/sales", stats:[["Total",sales.length],["Today",todaySales?.count ?? 0]] },
          { title:"Suppliers", icon:Truck, href:"/clinic/pharmacy/suppliers", stats:[["Total",totalSuppliers],["Active",activeSuppliers]] },
          { title:"Stock Value", icon:TrendingUp, href:"/clinic/pharmacy/reports", highlight:true },
        ].map((card)=>(
          <Card key={card.title} className="group rounded-2xl border shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"/>
            <CardHeader className="pb-3">
              <CardTitle className="text-[13px] font-semibold tracking-wide uppercase flex items-center gap-2 text-muted-foreground"><span className="flex size-8 items-center justify-center rounded-xl bg-muted group-hover:bg-primary group-hover:text-primary-foreground transition-colors"><card.icon className="size-4"/></span>{card.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {card.highlight ? (
                <><div className="text-3xl font-semibold tracking-tight">₹{(dash?.totalStockValue ?? 0).toLocaleString("en-IN")}</div><p className="text-xs text-muted-foreground">Total inventory value • {dash?.reorderCount ?? lowStock} items need reorder</p></>
              ) : card.custom ? (
                <><div className="space-y-1.5">{movements.length===0 ? <p className="text-xs text-muted-foreground py-6 text-center rounded-xl border border-dashed">No movements yet</p> : movements.slice(0,4).map((m:any)=>(
                  <div key={m.movementId} className="flex items-center justify-between rounded-xl border bg-muted/30 px-3 py-2"><div className="flex items-center gap-2"><Badge variant="outline" className="rounded-full text-[11px] capitalize">{m.movementType}</Badge><span className="text-xs font-medium">{m.medicineName ?? m.medicineId?.slice(0,8)}</span></div><span className={`text-xs font-semibold tabular-nums ${m.quantityChanged>0?"text-emerald-600":"text-red-600"}`}>{m.quantityChanged>0?"+":""}{m.quantityChanged}</span></div>
                ))}<p className="text-xs text-muted-foreground">Today: {dash?.stockMovementsToday ?? movements.length} movements</p></div></>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {card.stats!.map(([label,val]:any)=>(
                    <div key={label} className="rounded-xl border bg-card p-3 shadow-sm"><div className="text-[11px] tracking-wide uppercase text-muted-foreground">{label}</div><div className="text-lg font-semibold tracking-tight">{val}</div></div>
                  ))}
                </div>
              )}
              {card.title==="Purchases" && <div className="text-xs">Total value: <span className="font-semibold">₹{(dash?.purchaseValue ?? purchases.reduce((s:number,p:any)=>s+(p.total??0),0)).toLocaleString("en-IN")}</span></div>}
              {card.title==="Sales" && <div className="text-xs">Today value: <span className="font-semibold">₹{(todaySales?.value ?? 0).toLocaleString("en-IN")}</span></div>}
              <Link href={card.href} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:gap-1.5 transition-all">View {card.title} <ArrowRight className="size-3"/></Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts — premium */}
      <div className="grid gap-5 md:grid-cols-2">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader><CardTitle className="text-sm">Stock Status Distribution</CardTitle><CardDescription>Line trend — @evilcharts/payouts-echarts-line-chart style (echarts)</CardDescription></CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ChartContainer config={{ value:{label:"Count", color:"#f97316"} }} className="h-full w-full">
                <BarChart data={stockChartData}><CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted"/><XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11}/><YAxis tickLine={false} axisLine={false} fontSize={11}/><ChartTooltip content={<ChartTooltipContent/>}/><Bar dataKey="value" fill="#f97316" radius={[8,8,0,0]}/></BarChart>
              </ChartContainer>
              <p className="text-[10px] text-muted-foreground text-center mt-2">Install full echarts: <code className="rounded bg-muted px-1 py-0.5">npx shadcn@latest add @evilcharts/payouts-echarts-line-chart</code></p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader><CardTitle className="text-sm">Purchases vs Sales vs Stock Value</CardTitle><CardDescription>Financial overview</CardDescription></CardHeader>
          <CardContent>
            <ChartContainer config={{ value:{label:"Amount", color:"var(--chart-2)"} }} className="h-[260px] w-full">
              <BarChart data={salesPurchaseData}><CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted"/><XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11}/><YAxis tickLine={false} axisLine={false} fontSize={11}/><ChartTooltip content={<ChartTooltipContent/>}/><Bar dataKey="value" fill="var(--chart-2)" radius={[8,8,0,0]}/></BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity — elevated table */}
      <Card className="rounded-2xl shadow-sm overflow-hidden">
        <CardHeader className="border-b bg-muted/30"><CardTitle className="text-sm flex items-center gap-2"><Calendar className="size-4"/>Recent Pharmacy Activity</CardTitle><CardDescription>Latest events across inventory, purchases, sales and movements</CardDescription></CardHeader>
        <CardContent className="p-0">
          {recentActivity.length===0 ? <p className="text-sm text-muted-foreground py-12 text-center">No recent activity — activity will appear here as you use the pharmacy.</p> : (
            <div className="divide-y">
              {recentActivity.map((a,idx)=>(
                <Link key={idx} href={a.href} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/50 transition-colors group">
                  <div className="flex items-center gap-3"><Badge variant="outline" className="rounded-full capitalize text-xs">{a.type}</Badge><span className="font-medium text-sm">{a.detail}</span><span className="hidden sm:inline text-xs text-muted-foreground">{a.date ? new Date(a.date).toLocaleDateString("en-IN") : ""}</span></div>
                  <div className="flex items-center gap-3"><span className="text-xs tabular-nums font-medium">{typeof a.qty==="number" ? (a.type==="sale"||a.type==="purchase" ? `₹${a.qty.toLocaleString("en-IN")}` : a.qty) : ""}</span><Badge variant="secondary" className="rounded-full text-xs capitalize hidden sm:inline-flex">{a.status}</Badge><ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition"/></div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
