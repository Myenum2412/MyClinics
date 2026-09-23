"use client";
import { useEffect,useState,useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useRequireRole, sessionCan } from "@/hooks/use-clinic-session";
import { listLabs, type Lab } from "@/lib/clinic-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table,TableBody,TableCell,TableHead,TableHeader,TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { FlaskConical, Plus } from "lucide-react";
export default function LabsPage(){
  const session=useRequireRole("patient");
  const clinicId=session?.clinicId??"";
  const [items,setItems]=useState<Lab[]>([]);
  const [loading,setLoading]=useState(true);
  const canCreate=sessionCan(session,"clinic_admin");
  const load=useCallback(()=>{ if(!clinicId) return; listLabs(clinicId).then(r=>setItems((r as any)?.items??[])).catch(()=>toast.error("Failed to load labs")).finally(()=>setLoading(false));},[clinicId]);
  useEffect(()=>{load()},[load]);
  return <div className="flex flex-col gap-6">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2"><FlaskConical className="size-5 text-primary"/><h1 className="text-xl font-bold">Labs</h1></div>
      {canCreate && <Button><Link href="/clinic/labs/new" className="flex items-center gap-1.5"><Plus className="size-4"/>Create Lab</Link></Button>}
    </div>
    <Card className="border-border shadow-sm"><CardContent className="p-0">
      {loading ? <div className="p-6 space-y-3"><Skeleton className="h-10 w-full"/><Skeleton className="h-10 w-full"/></div>
      : items.length===0 ? <div className="py-12 text-center text-sm text-muted-foreground">No labs found.</div>
      : <Table><TableHeader><TableRow><TableHead>Lab Name</TableHead><TableHead>Contact</TableHead><TableHead>Phone</TableHead><TableHead>Email</TableHead><TableHead>Lab Type</TableHead><TableHead>License</TableHead></TableRow></TableHeader>
        <TableBody>{items.map(l=><TableRow key={l.labId}><TableCell className="font-medium">{l.name}</TableCell><TableCell>{l.contactPerson??"—"}</TableCell><TableCell>{l.phone??"—"}</TableCell><TableCell>{l.email??"—"}</TableCell><TableCell>{l.labType??"—"}</TableCell><TableCell>{l.licenseNo??"—"}</TableCell></TableRow>)}</TableBody></Table>}
    </CardContent></Card>
  </div>;
}
