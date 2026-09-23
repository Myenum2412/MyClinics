"use client";
import { useEffect,useState } from "react";
import { useRequireRole } from "@/hooks/use-clinic-session";
import { listLabs, type Lab } from "@/lib/clinic-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FlaskConical } from "lucide-react";
export default function LabPortalPage(){
  const session=useRequireRole("patient");
  const clinicId=session?.clinicId??"";
  const [labs,setLabs]=useState<Lab[]>([]);
  const isLabTech=session?.role==="lab_technician";
  useEffect(()=>{ if(clinicId) listLabs(clinicId).then(r=>setLabs((r as any)?.items??[])).catch(()=>{}); },[clinicId]);
  const myLab=isLabTech ? labs.find(l=>l.email===session?.email) ?? labs[0] ?? null : null;
  if(!isLabTech) return <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Lab portal is only available for lab technicians. Please log in with a lab account.</CardContent></Card>;
  if(!myLab) return <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No lab info found.</CardContent></Card>;
  return <div className="flex flex-col gap-6">
    <div className="flex items-center gap-2"><FlaskConical className="size-5 text-primary"/><h1 className="text-xl font-bold">Lab Portal</h1></div>
    <Card><CardHeader><CardTitle>{myLab.name}</CardTitle></CardHeader><CardContent className="grid gap-2 text-sm">
      <p><span className="text-muted-foreground">Contact:</span> {myLab.contactPerson??"—"}</p>
      <p><span className="text-muted-foreground">Phone:</span> {myLab.phone??"—"}</p>
      <p><span className="text-muted-foreground">Email:</span> {myLab.email??"—"}</p>
      <p><span className="text-muted-foreground">Address:</span> {myLab.address??"—"} {myLab.city??""} {myLab.state??""} {myLab.pincode??""}</p>
      <p><span className="text-muted-foreground">License:</span> {myLab.licenseNo??"—"}</p>
      <p><span className="text-muted-foreground">Type:</span> {myLab.labType??"—"}</p>
    </CardContent></Card>
  </div>;
}
