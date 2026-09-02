"use client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Eye, Pencil, Trash2, Plus, Users } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { Checkbox } from "@/components/ui/checkbox";
import { listPatients, listAppointments, type Patient, type Appointment } from "@/lib/clinic-api";
import dynamic from "next/dynamic";
const StatsAppointments = dynamic(() => import("@/components/stats-appointments"), { ssr: false });
import { useRequireRole } from "@/hooks/use-clinic-session";

type Entry = { id: string; createdAt: string; patient: string; data: Record<string,string> };
function useStore(key: string){
  const [items,setItems]=useState<Entry[]>([]);
  useEffect(()=>{ try{ const v=localStorage.getItem(key); if(v) setItems(JSON.parse(v)); }catch{} },[key]);
  const save=(next: Entry[])=>{ setItems(next); localStorage.setItem(key, JSON.stringify(next)); };
  return [items, save] as const;
}

const COLS_RECORD=["Patient Name / ID","Visit Date & Time","Doctor","Diagnosis","Symptoms / Findings","Treatment Given","Procedures Performed","Medicines Prescribed","Dosage & Duration","Doctor Notes","Follow-up Date"];
const COLS_PLAN=["Diagnosis / Clinical Impression","Treatment Objective","Planned Treatment","Procedures Required","Medicines","Investigations / Tests","Lifestyle / Care Instructions","Expected Outcome","Follow-up Schedule","Estimated Duration","Doctor's Remarks","Patient Consent"];
const COLS_DISCHARGE=["Patient Details","Admission Date","Discharge Date","Final Diagnosis","Treatment Summary","Procedures Performed","Condition at Discharge","Medicines on Discharge","Dosage & Duration","Diet / Activity Instructions","Warning Signs","Follow-up Date","Next Appointment","Doctor's Signature"];

export default function TreatmentPage(){
  const session = useRequireRole("staff" as any);
  const clinicId = session?.clinicId ?? "";
  const [tab,setTab]=useState("record");
  const [sharedPatient,setSharedPatient]=useState("");
  const [patients,setPatients]=useState<Patient[]>([]);
  const [recItems]=useStore("treatment_record");
  const [planItems]=useStore("treatment_plan");
  const [disItems]=useStore("treatment_discharge");
  const [appointments,setAppointments]=useState<Appointment[]>([]);

  useEffect(()=>{ if(!clinicId) return; listPatients(clinicId,{limit:100}).then(r=>setPatients(r.items)).catch(()=>{}); listAppointments(clinicId,{limit:100}).then(r=>setAppointments(r.items)).catch(()=>{}); },[clinicId]);

  const localPatients = useMemo(()=>{
    const s=new Set<string>();
    [...recItems, ...planItems, ...disItems].forEach(e=>{ if(e.patient) s.add(e.patient); });
    patients.forEach(p=> s.add(p.fullName));
    return Array.from(s);
  },[recItems,planItems,disItems,patients]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-2xl font-bold tracking-tight">Treatment</h1><p className="text-sm text-muted-foreground">Table first — click Add to open form. Connected to patients.</p></div>
        <div className="flex items-center gap-2">
          <Users className="size-4 text-muted-foreground"/>
          <select value={sharedPatient || "__all"} onChange={e=> setSharedPatient(e.target.value==="__all"?"":e.target.value)} className="h-9 w-48 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="__all">All patients</option>
              {localPatients.map(p=> <option key={p} value={p}>{p}</option>)}
            </select>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <StatsAppointments appointments={appointments} />
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="record">1. Treatment Record ({recItems.length})</TabsTrigger>
          <TabsTrigger value="plan">2. Treatment Plan ({planItems.length})</TabsTrigger>
          <TabsTrigger value="discharge">3. Discharge ({disItems.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="record" className="mt-4"><RecordTab sharedPatient={sharedPatient} patients={patients}/></TabsContent>
        <TabsContent value="plan" className="mt-4"><PlanTab sharedPatient={sharedPatient} patients={patients}/></TabsContent>
        <TabsContent value="discharge" className="mt-4"><DischargeTab sharedPatient={sharedPatient} patients={patients}/></TabsContent>
      </Tabs>
    </div>
  );
}

function TableSection({items, cols, sharedPatient, onView,onEdit,onDelete, onAdd}:{items:Entry[];cols:string[];sharedPatient:string;onView:(e:Entry)=>void;onEdit:(e:Entry)=>void;onDelete:(e:Entry)=>void;onAdd:()=>void}){
  const [q,setQ]=useState("");
  const [selected,setSelected]=useState<Set<string>>(new Set());
  const [page,setPage]=useState(0);
  const pageSize=10;
  const filtered=useMemo(()=>{
    let a=items;
    if(sharedPatient) a=a.filter(i=> i.patient===sharedPatient);
    if(q) a=a.filter(i=> JSON.stringify(i).toLowerCase().includes(q.toLowerCase()));
    return a;
  },[items,q,sharedPatient]);
  const paged=useMemo(()=> filtered.slice(page*pageSize, page*pageSize+pageSize),[filtered,page]);
  const pageCount=Math.ceil(filtered.length/pageSize);
  const allChecked = filtered.length>0 && filtered.every(i=> selected.has(i.id));
  return <div className="space-y-4">
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h3 className="text-sm font-semibold">{cols[0].split("/")[0].trim()} Records</h3><p className="text-xs text-muted-foreground">{filtered.length} / {items.length} records{selected.size>0 && ` • ${selected.size} selected`}</p></div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"/><Input value={q} onChange={e=>{setQ(e.target.value); setPage(0);}} placeholder="Search..." className="pl-9 h-9"/></div>
          <Button onClick={onAdd} className="h-9 gap-1.5 shadow-sm"><Plus className="size-4"/>Add New</Button>
        </div>
      </div>
    </div>
    <Card className="shadow-sm"><CardContent className="p-0"><div className="overflow-x-auto"><Table>
          <TableHeader><TableRow className="bg-muted/40"><TableHead className="w-10"><Checkbox checked={allChecked} onCheckedChange={v=> setSelected(v ? new Set(filtered.map(i=>i.id)) : new Set())} /></TableHead>{cols.slice(0,4).map(c=><TableHead key={c} className="text-xs whitespace-nowrap">{c}</TableHead>)}<TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>{paged.length===0 ? <TableRow><TableCell colSpan={6} className="py-16 text-center text-sm text-muted-foreground">{items.length===0 ? "No entries yet — click Add New." : "No match."}</TableCell></TableRow> : paged.map(it=><TableRow key={it.id} className="hover:bg-muted/30">
            <TableCell><Checkbox checked={selected.has(it.id)} onCheckedChange={v=> setSelected(s=>{ const n=new Set(s); if(v) n.add(it.id); else n.delete(it.id); return n; })} /></TableCell>
            {cols.slice(0,4).map(c=> <TableCell key={c} className="text-xs max-w-[150px] truncate">{it.data[c]||"—"}</TableCell>)}
            <TableCell className="text-right"><div className="flex justify-end gap-0.5">
              <Button variant="ghost" size="icon" className="size-7" onClick={()=>onView(it)}><Eye className="size-3.5"/></Button>
              <Button variant="ghost" size="icon" className="size-7" onClick={()=>onEdit(it)}><Pencil className="size-3.5"/></Button>
              <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={()=>onDelete(it)}><Trash2 className="size-3.5"/></Button>
            </div></TableCell>
          </TableRow>)}</TableBody>
        </Table></div></CardContent>{filtered.length>0 && <Pagination page={page+1} pageSize={pageSize} totalItems={filtered.length} onPageChange={p=> setPage(Math.max(0,Math.min(p-1,pageCount-1)))} itemLabel="records" />}</Card>
  </div>
}

function RecordTab({sharedPatient, patients}:{sharedPatient:string;patients:Patient[]}){
  const [items,save]=useStore("treatment_record");
  const [v,setV]=useState<Record<string,string>>(()=> Object.fromEntries(COLS_RECORD.map(c=>[c,""])));
  const [open,setOpen]=useState(false);
  const [editing,setEditing]=useState<string|null>(null);
  const [viewing,setViewing]=useState<Entry|null>(null);
  function submit(){
    if(!v["Patient Name / ID"].trim()) return toast.error("Patient required");
    if(!v["Diagnosis"].trim()) return toast.error("Diagnosis required");
    const patient=v["Patient Name / ID"].trim();
    if(editing) save(items.map(x=> x.id===editing? {...x, patient, data:{...v}}:x));
    else save([{id:`REC-${Date.now()}`, createdAt:new Date().toISOString(), patient, data:{...v}},...items]);
    setV(Object.fromEntries(COLS_RECORD.map(c=>[c,""]))); setEditing(null); setOpen(false); toast.success("Saved");
  }
  return <>
    <TableSection items={items} cols={COLS_RECORD} sharedPatient={sharedPatient} onView={setViewing} onEdit={e=>{setV({...e.data});setEditing(e.id);setOpen(true)}} onDelete={e=>save(items.filter(x=>x.id!==e.id))} onAdd={()=>{setV(Object.fromEntries(COLS_RECORD.map(c=>[c,""])));setEditing(null);setOpen(true)}}/>
    {open && <div className="rounded-xl border bg-card p-5 space-y-4"><h3 className="font-semibold text-sm">{editing?"Edit":"New"} Treatment Record</h3>
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label className="text-xs">Patient *</Label>
            <Input list="patients-list" value={v["Patient Name / ID"]} onChange={e=>setV({...v, ["Patient Name / ID"]:e.target.value})} placeholder="Select or type patient" className="mt-1 h-9"/>
            <datalist id="patients-list">{patients.map(p=> <option key={p.patientId} value={p.fullName} />)}</datalist>
          </div>
          <div><Label className="text-xs">Visit Date & Time</Label><Input type="datetime-local" value={v["Visit Date & Time"]} onChange={e=>setV({...v, ["Visit Date & Time"]:e.target.value})} className="mt-1 h-9"/></div>
        </div>
        <div><Label className="text-xs">Doctor</Label><Input value={v["Doctor"]} onChange={e=>setV({...v, Doctor:e.target.value})} className="mt-1 h-9"/></div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label className="text-xs">Diagnosis *</Label><Input value={v["Diagnosis"]} onChange={e=>setV({...v, Diagnosis:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Symptoms / Findings</Label><Input value={v["Symptoms / Findings"]} onChange={e=>setV({...v, ["Symptoms / Findings"]:e.target.value})} className="mt-1 h-9"/></div>
        </div>
        <div><Label className="text-xs">Treatment Given</Label><Textarea value={v["Treatment Given"]} onChange={e=>setV({...v, ["Treatment Given"]:e.target.value})} rows={2}/></div>
        <div><Label className="text-xs">Procedures Performed</Label><Textarea value={v["Procedures Performed"]} onChange={e=>setV({...v, ["Procedures Performed"]:e.target.value})} rows={2}/></div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label className="text-xs">Medicines Prescribed</Label><Textarea value={v["Medicines Prescribed"]} onChange={e=>setV({...v, ["Medicines Prescribed"]:e.target.value})} rows={2}/></div>
          <div><Label className="text-xs">Dosage & Duration</Label><Textarea value={v["Dosage & Duration"]} onChange={e=>setV({...v, ["Dosage & Duration"]:e.target.value})} rows={2}/></div>
        </div>
        <div><Label className="text-xs">Doctor Notes</Label><Textarea value={v["Doctor Notes"]} onChange={e=>setV({...v, ["Doctor Notes"]:e.target.value})} rows={2}/></div>
        <div><Label className="text-xs">Follow-up Date</Label><Input type="date" value={v["Follow-up Date"]} onChange={e=>setV({...v, ["Follow-up Date"]:e.target.value})} className="mt-1 h-9"/></div>
      </div>
      <div className="flex gap-2"><Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button><Button onClick={submit}>{editing?"Update":"Save"}</Button></div></div>}
    <Dialog open={!!viewing} onOpenChange={v=>!v&&setViewing(null)}><DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>View Record</DialogTitle></DialogHeader>{viewing&&<div className="grid sm:grid-cols-2 gap-3 text-sm">{Object.entries(viewing.data).map(([k,v])=><div key={k}><span className="text-muted-foreground text-xs">{k}:</span><div className="font-medium break-words">{String(v)||"—"}</div></div>)}</div>}<DialogFooter><Button variant="outline" onClick={()=>setViewing(null)}>Close</Button></DialogFooter></DialogContent></Dialog>
  </>
}
function PlanTab({sharedPatient, patients}:{sharedPatient:string;patients:Patient[]}){
  const [items,save]=useStore("treatment_plan");
  const [v,setV]=useState<Record<string,string>>(()=> Object.fromEntries(COLS_PLAN.map(c=>[c,""])));
  const [open,setOpen]=useState(false);
  const [editing,setEditing]=useState<string|null>(null);
  const [viewing,setViewing]=useState<Entry|null>(null);
  const SV=(f:string,val:string)=> setV(prev=>({...prev,[f]:val??""}));
  function submit(){
    if(!v["Diagnosis / Clinical Impression"].trim()) return toast.error("Diagnosis required");
    const patient=v["Diagnosis / Clinical Impression"].slice(0,30);
    if(editing) save(items.map(x=> x.id===editing? {...x, patient, data:{...v}}:x));
    else save([{id:`PLAN-${Date.now()}`, createdAt:new Date().toISOString(), patient, data:{...v}},...items]);
    setV(Object.fromEntries(COLS_PLAN.map(c=>[c,""]))); setEditing(null); setOpen(false); toast.success("Saved");
  }
  return <>
    <TableSection items={items} cols={COLS_PLAN} sharedPatient={sharedPatient} onView={setViewing} onEdit={e=>{setV({...e.data});setEditing(e.id);setOpen(true)}} onDelete={e=>save(items.filter(x=>x.id!==e.id))} onAdd={()=>{setV(Object.fromEntries(COLS_PLAN.map(c=>[c,""])));setEditing(null);setOpen(true)}}/>
    {open && <div className="rounded-xl border bg-card p-5 space-y-4"><h3 className="font-semibold text-sm">{editing?"Edit":"New"} Treatment Plan</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2"><Label className="text-xs">Diagnosis / Clinical Impression *</Label><Input value={v["Diagnosis / Clinical Impression"]} onChange={e=>SV("Diagnosis / Clinical Impression", e.target.value)} className="mt-1 h-9"/></div>
        <div className="sm:col-span-2"><Label className="text-xs">Treatment Objective</Label><Input value={v["Treatment Objective"]} onChange={e=>SV("Treatment Objective", e.target.value)} className="mt-1 h-9"/></div>
        <div className="sm:col-span-2"><Label className="text-xs">Planned Treatment</Label><Textarea value={v["Planned Treatment"]} onChange={e=>SV("Planned Treatment", e.target.value)} rows={2}/></div>
        <div><Label className="text-xs">Procedures Required</Label><Textarea value={v["Procedures Required"]} onChange={e=>SV("Procedures Required", e.target.value)} rows={2}/></div>
        <div><Label className="text-xs">Medicines</Label><Textarea value={v["Medicines"]} onChange={e=>SV("Medicines", e.target.value)} rows={2}/></div>
        <div><Label className="text-xs">Investigations / Tests</Label><Input value={v["Investigations / Tests"]} onChange={e=>SV("Investigations / Tests", e.target.value)} className="mt-1 h-9"/></div>
        <div><Label className="text-xs">Lifestyle / Care Instructions</Label><Textarea value={v["Lifestyle / Care Instructions"]} onChange={e=>SV("Lifestyle / Care Instructions", e.target.value)} rows={2}/></div>
        <div><Label className="text-xs">Expected Outcome</Label><Input value={v["Expected Outcome"]} onChange={e=>SV("Expected Outcome", e.target.value)} className="mt-1 h-9"/></div>
        <div><Label className="text-xs">Follow-up Schedule</Label><Input value={v["Follow-up Schedule"]} onChange={e=>SV("Follow-up Schedule", e.target.value)} className="mt-1 h-9"/></div>
        <div><Label className="text-xs">Estimated Duration</Label><Input value={v["Estimated Duration"]} onChange={e=>SV("Estimated Duration", e.target.value)} className="mt-1 h-9"/></div>
        <div className="sm:col-span-2"><Label className="text-xs">Doctor&apos;s Remarks</Label><Textarea value={v["Doctor's Remarks"]} onChange={e=>SV("Doctor's Remarks", e.target.value)} rows={2}/></div>
        <div><Label className="text-xs">Patient Consent</Label><select value={v["Patient Consent"]} onChange={e=>SV("Patient Consent", e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">Select</option><option value="Yes">Yes</option><option value="No">No</option><option value="Pending">Pending</option></select></div>
      </div>
      <div className="flex gap-2"><Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button><Button onClick={submit}>{editing?"Update":"Save"}</Button></div></div>}
    <Dialog open={!!viewing} onOpenChange={v=>!v&&setViewing(null)}><DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>View Plan</DialogTitle></DialogHeader>{viewing&&<div className="grid sm:grid-cols-2 gap-3 text-sm">{Object.entries(viewing.data).map(([k,v])=><div key={k}><span className="text-muted-foreground text-xs">{k}:</span><div className="font-medium break-words">{String(v)||"—"}</div></div>)}</div>}<DialogFooter><Button variant="outline" onClick={()=>setViewing(null)}>Close</Button></DialogFooter></DialogContent></Dialog>
  </>
}
function DischargeTab({sharedPatient, patients}:{sharedPatient:string;patients:Patient[]}){
  const [items,save]=useStore("treatment_discharge");
  const [v,setV]=useState<Record<string,string>>(()=> Object.fromEntries(COLS_DISCHARGE.map(c=>[c,""])));
  const [open,setOpen]=useState(false);
  const [editing,setEditing]=useState<string|null>(null);
  const [viewing,setViewing]=useState<Entry|null>(null);
  const SV=(f:string,val:string)=> setV(prev=>({...prev,[f]:val??""}));
  function submit(){
    if(!v["Patient Details"].trim()) return toast.error("Patient Details required");
    const patient=v["Patient Details"].slice(0,30);
    if(editing) save(items.map(x=> x.id===editing? {...x, patient, data:{...v}}:x));
    else save([{id:`DIS-${Date.now()}`, createdAt:new Date().toISOString(), patient, data:{...v}},...items]);
    setV(Object.fromEntries(COLS_DISCHARGE.map(c=>[c,""]))); setEditing(null); setOpen(false); toast.success("Saved");
  }
  return <>
    <TableSection items={items} cols={COLS_DISCHARGE} sharedPatient={sharedPatient} onView={setViewing} onEdit={e=>{setV({...e.data});setEditing(e.id);setOpen(true)}} onDelete={e=>save(items.filter(x=>x.id!==e.id))} onAdd={()=>{setV(Object.fromEntries(COLS_DISCHARGE.map(c=>[c,""])));setEditing(null);setOpen(true)}}/>
    {open && <div className="rounded-xl border bg-card p-5 space-y-4"><h3 className="font-semibold text-sm">{editing?"Edit":"New"} Discharge</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2"><Label className="text-xs">Patient Details *</Label><Input value={v["Patient Details"]} onChange={e=>SV("Patient Details", e.target.value)} className="mt-1 h-9"/></div>
        <div><Label className="text-xs">Admission Date</Label><Input type="date" value={v["Admission Date"]} onChange={e=>SV("Admission Date", e.target.value)} className="mt-1 h-9"/></div>
        <div><Label className="text-xs">Discharge Date</Label><Input type="date" value={v["Discharge Date"]} onChange={e=>SV("Discharge Date", e.target.value)} className="mt-1 h-9"/></div>
        <div className="sm:col-span-2"><Label className="text-xs">Final Diagnosis</Label><Input value={v["Final Diagnosis"]} onChange={e=>SV("Final Diagnosis", e.target.value)} className="mt-1 h-9"/></div>
        <div className="sm:col-span-2"><Label className="text-xs">Treatment Summary</Label><Textarea value={v["Treatment Summary"]} onChange={e=>SV("Treatment Summary", e.target.value)} rows={2}/></div>
        <div className="sm:col-span-2"><Label className="text-xs">Procedures Performed</Label><Textarea value={v["Procedures Performed"]} onChange={e=>SV("Procedures Performed", e.target.value)} rows={2}/></div>
        <div><Label className="text-xs">Condition at Discharge</Label><select value={v["Condition at Discharge"]} onChange={e=>SV("Condition at Discharge", e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">Select</option><option value="Stable">Stable</option><option value="Improved">Improved</option><option value="Critical">Critical</option></select></div>
        <div><Label className="text-xs">Medicines on Discharge</Label><Textarea value={v["Medicines on Discharge"]} onChange={e=>SV("Medicines on Discharge", e.target.value)} rows={2}/></div>
        <div><Label className="text-xs">Dosage & Duration</Label><Input value={v["Dosage & Duration"]} onChange={e=>SV("Dosage & Duration", e.target.value)} className="mt-1 h-9"/></div>
        <div className="sm:col-span-2"><Label className="text-xs">Diet / Activity Instructions</Label><Textarea value={v["Diet / Activity Instructions"]} onChange={e=>SV("Diet / Activity Instructions", e.target.value)} rows={2}/></div>
        <div className="sm:col-span-2"><Label className="text-xs">Warning Signs</Label><Textarea value={v["Warning Signs"]} onChange={e=>SV("Warning Signs", e.target.value)} rows={2}/></div>
        <div><Label className="text-xs">Follow-up Date</Label><Input type="date" value={v["Follow-up Date"]} onChange={e=>SV("Follow-up Date", e.target.value)} className="mt-1 h-9"/></div>
        <div><Label className="text-xs">Next Appointment</Label><Input type="datetime-local" value={v["Next Appointment"]} onChange={e=>SV("Next Appointment", e.target.value)} className="mt-1 h-9"/></div>
        <div><Label className="text-xs">Doctor&apos;s Signature</Label><Input value={v["Doctor's Signature"]} onChange={e=>SV("Doctor's Signature", e.target.value)} className="mt-1 h-9"/></div>
      </div>
      <div className="flex gap-2"><Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button><Button onClick={submit}>{editing?"Update":"Save"}</Button></div></div>}
    <Dialog open={!!viewing} onOpenChange={v=>!v&&setViewing(null)}><DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>View Discharge</DialogTitle></DialogHeader>{viewing&&<div className="grid sm:grid-cols-2 gap-3 text-sm">{Object.entries(viewing.data).map(([k,v])=><div key={k}><span className="text-muted-foreground text-xs">{k}:</span><div className="font-medium break-words">{String(v)||"—"}</div></div>)}</div>}<DialogFooter><Button variant="outline" onClick={()=>setViewing(null)}>Close</Button></DialogFooter></DialogContent></Dialog>
  </>
}
