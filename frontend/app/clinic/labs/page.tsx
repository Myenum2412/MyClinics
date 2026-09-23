"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";

export default function LabsPage(){
  const [labs,setLabs]=useState<any[]>([]);
  useEffect(()=>{ setLabs(JSON.parse(localStorage.getItem("clinic_labs")||"[]")); },[]);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Labs</h1><Link href="/clinic/labs/new"><Button><Plus className="size-4 mr-2" />Add Lab</Button></Link></div>
      {labs.length===0 ? <Card><CardContent className="py-12 text-center text-muted-foreground">No labs yet. Click Add Lab.</CardContent></Card> :
        <div className="grid gap-4 md:grid-cols-2">{labs.map((l:any)=><Card key={l.id}><CardContent className="pt-6 space-y-1"><p className="font-semibold">{l.labName} <span className="text-xs text-muted-foreground">({l.labType||"-"})</span></p><p className="text-sm">{l.contactPerson} — {l.mobile}</p><p className="text-xs text-muted-foreground">{l.email} | {l.city}</p><p className="text-xs">{l.address}</p></CardContent></Card>)}</div>}
    </div>
  );
}
