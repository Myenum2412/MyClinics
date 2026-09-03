import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Users, ShieldCheck, Zap, Star, Check, ArrowRight } from "lucide-react";

const logos = ["GRAYLOG","KYAN","ANCHOR","HATIUM","PITLET"];
const features = [
  { icon: BarChart3, title: "Analytics Overview", desc: "Track performance and business KPIs with easy-to-read charts and metrics." },
  { icon: Users, title: "User Management System", desc: "Manage users, roles and permissions from a single intuitive dashboard." },
  { icon: ShieldCheck, title: "Secure Transactions", desc: "Monitor orders, invoices and activity with enterprise-grade security." },
  { icon: Zap, title: "Workflow Automation", desc: "Automate repetitive tasks and accelerate your team's productivity." },
];
const pricing = [
  { name:"Free", price:"$0", sub:"For trying the product", features:["Basic dashboard access","Limited analytics","Community support","Up to 5 projects"], cta:"Get Started Free", popular:false },
  { name:"Starter", price:"$19", sub:"For small teams", features:["Full dashboard access","Core analytics","User management","Standard support"], cta:"Choose Plan", popular:false },
  { name:"Pro", price:"$49", sub:"For growing teams", features:["Advanced insights","Unlimited users","Billing & invoice manage","Priority support"], cta:"Choose Plan", popular:true },
  { name:"Enterprise", price:"Custom", sub:"For custom needs", features:["Everything in Pro","Custom workflows","Advanced security","Dedicated manager"], cta:"Contact Sales", popular:false },
];

export default function Home(){
 return (
  <div className="flex min-h-svh flex-col bg-[#F8FAFC]">
    <SiteHeader />
    {/* Hero - SaaSly style */}
    <section className="relative overflow-hidden bg-white px-6 pt-12 pb-10">
      <div className="mx-auto max-w-6xl text-center">
        <Badge variant="secondary" className="rounded-full bg-[#EEF2FF] text-[#4F46E5] hover:bg-[#EEF2FF]"><Star className="mr-1 size-3 fill-[#4F46E5]"/> Rated 4.97/5 from verified reviews</Badge>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-[56px] leading-[1.05]">
          Empower Your Business With Smarter Insights
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-500 sm:text-base">
          A modern SaaS platform that helps teams track performance, manage customers, and make better decisions — all in one intuitive dashboard. Powered by My Clinics.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button size="lg" render={<Link href="/login" />} nativeButton={false}>Get Started Now <ArrowRight className="size-4" data-icon="inline-end"/></Button>
          <Button variant="outline" size="lg" render={<a href="#features" />} nativeButton={false}>View Live Demo</Button>
        </div>
        {/* Dashboard mock */}
        <div className="mx-auto mt-10 max-w-4xl rounded-2xl border bg-white p-2 shadow-xl">
          <div className="rounded-xl bg-slate-900 p-4 text-left">
            <div className="flex items-center gap-2"><span className="size-3 rounded-full bg-red-400"/><span className="size-3 rounded-full bg-yellow-400"/><span className="size-3 rounded-full bg-green-400"/><span className="ml-4 text-xs text-slate-400">dashboard.myclinics.app — Analytics Overview</span></div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[["Revenue","$48,230","+12.5%"],["Users","12,842","+8.2%"],["Orders","1,423","-2.1%"]].map(([k,v,d])=>(
                <div key={k} className="rounded-lg bg-slate-800 p-4"><p className="text-xs text-slate-400">{k}</p><p className="mt-1 text-lg font-bold text-white">{v}</p><p className="text-xs text-emerald-400">{d}</p></div>
              ))}
            </div>
            <div className="mt-3 h-24 rounded-lg bg-gradient-to-r from-indigo-500/30 to-violet-500/30 flex items-end gap-1 p-2">
              {[40,65,45,80,55,90,70,85].map((h,i)=><div key={i} style={{height:h}} className="flex-1 rounded bg-indigo-400"/>)}
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* Logos */}
    <section className="border-y bg-white py-6">
      <p className="text-center text-xs tracking-widest text-slate-400">TRUSTED BY CREATORS, TEAMS AND DEVELOPERS WORLDWIDE</p>
      <div className="mx-auto mt-4 flex max-w-5xl flex-wrap items-center justify-center gap-8 px-6 text-sm font-bold tracking-widest text-slate-300">
        {logos.map(l=><span key={l}>{l}</span>)}
      </div>
    </section>

    {/* Features */}
    <section id="features" className="mx-auto max-w-6xl px-6 py-16">
      <div className="text-center"><Badge variant="outline">Features</Badge><h2 className="mx-auto mt-3 max-w-xl text-3xl font-bold tracking-tight text-slate-900">Everything You Need to Build a SaaS Product</h2></div>
      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {features.map(f=>(
          <Card key={f.title}><CardHeader><span className="flex size-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><f.icon className="size-5"/></span><CardTitle className="text-base mt-3">{f.title}</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{f.desc}</p></CardContent></Card>
        ))}
      </div>
    </section>

    {/* Testimonial */}
    <section className="bg-white border-y py-12">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <div className="flex justify-center gap-1 text-amber-400">{Array.from({length:5}).map((_,i)=><Star key={i} className="size-5 fill-amber-400"/>)}</div>
        <blockquote className="mt-4 text-lg font-medium text-slate-900">&ldquo;The dashboard layout is incredibly clean and easy to customize. We launched our SaaS MVP weeks faster than expected.&rdquo;</blockquote>
        <p className="mt-3 text-sm text-slate-500">Erin Philips — UX Lead, DataLoop</p>
      </div>
    </section>

    {/* Pricing */}
    <section id="pricing" className="mx-auto max-w-6xl px-6 py-16">
      <div className="text-center"><h2 className="text-3xl font-bold tracking-tight text-slate-900">Simple and Flexible Pricing</h2><p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">Start small, grow confidently, and scale without friction.</p></div>
      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {pricing.map(p=>(
          <Card key={p.name} className={p.popular ? "border-indigo-600 shadow-lg relative" : ""}>
            {p.popular && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Popular</Badge>}
            <CardHeader><p className="text-sm font-semibold">{p.name}</p><p className="text-xs text-muted-foreground">{p.sub}</p><p className="mt-2 text-3xl font-extrabold">{p.price}<span className="text-sm font-normal text-muted-foreground"> {p.price!=="Custom" && "/month"}</span></p></CardHeader>
            <CardContent>
              <ul className="space-y-2">{p.features.map(f=><li key={f} className="flex items-center gap-2 text-sm"><Check className="size-4 text-emerald-500"/>{f}</li>)}</ul>
              <Button className="mt-6 w-full" variant={p.popular?"default":"outline"} render={<Link href="/login"/>} nativeButton={false}>{p.cta}</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>

    {/* CTA */}
    <section className="bg-slate-900 px-6 py-16 text-center">
      <h2 className="text-3xl font-bold text-white">Start Building Your SaaS Product Faster</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400">Use a modern, flexible dashboard template that grows with your product.</p>
      <div className="mt-6 flex justify-center gap-3">
        <Button size="lg" render={<Link href="/login"/>} nativeButton={false}>Get Started Now</Button>
        <Button size="lg" variant="outline" className="bg-transparent text-white border-white/20 hover:bg-white/10 hover:text-white" render={<Link href="/clinic"/>} nativeButton={false}>View Live Demo</Button>
      </div>
    </section>

    <SiteFooter />
  </div>
 );
}
