"use client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Eye, Pencil, Trash2, Plus, Users } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { Checkbox } from "@/components/ui/checkbox";
import { listPatients, type Patient } from "@/lib/clinic-api";
import StatsTreatment from "@/components/stats-treatment";
import { useRequireRole } from "@/hooks/use-clinic-session";

type Entry = { id: string; createdAt: string; patient: string; type: "record" | "plan"; data: Record<string,string> };
function useStore(key: string){
  const [items,setItems]=useState<Entry[]>([]);
  useEffect(()=>{ try{ const v=localStorage.getItem(key); if(v) setItems(JSON.parse(v)); }catch{} },[key]);
  const save=(next: Entry[])=>{ setItems(next); localStorage.setItem(key, JSON.stringify(next)); };
  return [items, save] as const;
}

const COLS=["Patient","Visit Date","Doctor","Diagnosis / Plan","Treatment / Objective","Medicines","Follow-up","Type"];

export default function TreatmentPage(){
  const session = useRequireRole("staff" as any);
  const clinicId = session?.clinicId ?? "";
  const [sharedPatient,setSharedPatient]=useState("");
  const [patients,setPatients]=useState<Patient[]>([]);
  const [items,save]=useStore("treatment_combined");
  useEffect(()=>{ if(!clinicId) return; listPatients(clinicId,{limit:100}).then(r=>setPatients(r.items)).catch(()=>{}); },[clinicId]);
  const localPatients = useMemo(()=>{
    const s=new Set<string>();
    items.forEach(e=>{ if(e.patient) s.add(e.patient); });
    patients.forEach(p=> s.add(p.fullName));
    return Array.from(s);
  },[items,patients]);
  const records = items.filter(i=>i.type==="record").length;
  const plans = items.filter(i=>i.type==="plan").length;

  // form state
  const [open,setOpen]=useState(false);
  const [editing,setEditing]=useState<string|null>(null);
  const [viewing,setViewing]=useState<Entry|null>(null);
  const [formType,setFormType]=useState<"record"|"plan">("record");
  const [v,setV]=useState<Record<string,string>>({});
  const SV=(f:string,val:string)=> setV(prev=>({...prev,[f]:val??""}));
  function startAdd(type:"record"|"plan"){ setFormType(type); setV({}); setEditing(null); setOpen(true); }
  function startEdit(e:Entry){ setFormType(e.type); setV({...e.data}); setEditing(e.id); setOpen(true); }
  function submit(){
    const patient=v["Patient"]?.trim() || v["Patient Name / ID"]?.trim() || "";
    if(!patient) return toast.error("Patient required");
    if(formType==="record" && !v["Diagnosis"]?.trim()) return toast.error("Diagnosis required");
    if(formType==="plan" && !v["Diagnosis / Clinical Impression"]?.trim()) return toast.error("Diagnosis required");
    if(editing) save(items.map(x=> x.id===editing? {...x, patient, type:formType, data:{...v, Patient:patient}}:x));
    else save([{id:`TR-${Date.now()}`, createdAt:new Date().toISOString(), patient, type:formType, data:{...v, Patient:patient}},...items]);
    setV({}); setEditing(null); setOpen(false); toast.success("Saved");
  }

  // table filter
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-2xl font-bold tracking-tight">Treatment</h1><p className="text-sm text-muted-foreground">Record + Plan in single table — connected to patients.</p></div>
        <div className="flex items-center gap-2">
          <Users className="size-4 text-muted-foreground"/>
          <select value={sharedPatient || "__all"} onChange={e=> setSharedPatient(e.target.value==="__all"?"":e.target.value)} className="h-9 w-48 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="__all">All patients</option>
              {localPatients.map(p=> <option key={p} value={p}>{p}</option>)}
            </select>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <StatsTreatment records={records} plans={plans} discharges={0} patients={patients.length} searchTerm={q} onSearchChange={(v)=>{setQ(v); setPage(0);}} action={<div className="flex items-center gap-2"><Button onClick={()=>startAdd("record")} className="h-9 gap-1.5 shadow-sm"><Plus className="size-4"/>Add Record</Button><Button onClick={()=>startAdd("plan")} variant="outline" className="h-9 gap-1.5"><Plus className="size-4"/>Add Plan</Button></div>} />
      </div>

      <Card className="shadow-sm"><CardContent className="p-0"><div className="overflow-x-auto"><Table>
            <TableHeader><TableRow className="bg-muted/40"><TableHead className="w-10"><Checkbox checked={allChecked} onCheckedChange={v=> setSelected(v ? new Set(filtered.map(i=>i.id)) : new Set())} /></TableHead>{COLS.map(c=><TableHead key={c} className="text-xs whitespace-nowrap">{c}</TableHead>)}<TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>{paged.length===0 ? <TableRow><TableCell colSpan={COLS.length+2} className="py-16 text-center text-sm text-muted-foreground">{items.length===0 ? "No entries yet — click Add Record/Plan." : "No match."}</TableCell></TableRow> : paged.map(it=><TableRow key={it.id} className="hover:bg-muted/30">
              <TableCell><Checkbox checked={selected.has(it.id)} onCheckedChange={v=> setSelected(s=>{ const n=new Set(s); if(v) n.add(it.id); else n.delete(it.id); return n; })} /></TableCell>
              <TableCell className="text-xs">{it.patient}</TableCell>
              <TableCell className="text-xs">{it.data["Visit Date & Time"] || it.data["Visit Date"] || "—"}</TableCell>
              <TableCell className="text-xs">{it.data["Doctor"] || "—"}</TableCell>
              <TableCell className="text-xs max-w-[150px] truncate">{it.data["Diagnosis"] || it.data["Diagnosis / Clinical Impression"] || "—"}</TableCell>
              <TableCell className="text-xs max-w-[150px] truncate">{it.data["Treatment Given"] || it.data["Treatment Objective"] || "—"}</TableCell>
              <TableCell className="text-xs max-w-[150px] truncate">{it.data["Medicines Prescribed"] || it.data["Medicines"] || "—"}</TableCell>
              <TableCell className="text-xs">{it.data["Follow-up Date"] || it.data["Follow-up Schedule"] || "—"}</TableCell>
              <TableCell><span className={`rounded-full px-2 py-0.5 text-xs ${it.type==="record"?"bg-blue-50 text-blue-700":"bg-emerald-50 text-emerald-700"}`}>{it.type}</span></TableCell>
              <TableCell className="text-right"><div className="flex justify-end gap-0.5">
                <Button variant="ghost" size="icon" className="size-7" onClick={()=>setViewing(it)}><Eye className="size-3.5"/></Button>
                <Button variant="ghost" size="icon" className="size-7" onClick={()=>startEdit(it)}><Pencil className="size-3.5"/></Button>
                <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={()=>save(items.filter(x=>x.id!==it.id))}><Trash2 className="size-3.5"/></Button>
              </div></TableCell>
            </TableRow>)}</TableBody>
          </Table></div></CardContent>{filtered.length>0 && <Pagination page={page+1} pageSize={pageSize} totalItems={filtered.length} onPageChange={p=> setPage(Math.max(0,Math.min(p-1,pageCount-1)))} itemLabel="records" />}</Card>

      {/* Inline simple form */}
      {open && <div className="rounded-xl border bg-card p-5 space-y-4">
        <h3 className="font-semibold text-sm">{editing?"Edit":"New"} {formType==="record"?"Treatment Record":"Treatment Plan"}</h3>
        <div className="flex gap-2 mb-2">
          <Button variant={formType==="record"?"default":"outline"} size="sm" onClick={()=>setFormType("record")}>Record</Button>
          <Button variant={formType==="plan"?"default":"outline"} size="sm" onClick={()=>setFormType("plan")}>Plan</Button>
        </div>
        {formType==="record" ? (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label className="text-xs">Patient *</Label><Input list="patients-list" value={v["Patient"]||""} onChange={e=>SV("Patient", e.target.value)} placeholder="Select or type" className="mt-1 h-9"/><datalist id="patients-list">{patients.map(p=> <option key={p.patientId} value={p.fullName} />)}</datalist></div>
              <div><Label className="text-xs">Visit Date & Time</Label><Input type="datetime-local" value={v["Visit Date & Time"]||""} onChange={e=>SV("Visit Date & Time", e.target.value)} className="mt-1 h-9"/></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label className="text-xs">Doctor</Label><Input value={v["Doctor"]||""} onChange={e=>SV("Doctor", e.target.value)} className="mt-1 h-9"/></div>
              <div><Label className="text-xs">Diagnosis *</Label><Input value={v["Diagnosis"]||""} onChange={e=>SV("Diagnosis", e.target.value)} className="mt-1 h-9"/></div>
            </div>
            <div><Label className="text-xs">Symptoms / Findings</Label><Input value={v["Symptoms / Findings"]||""} onChange={e=>SV("Symptoms / Findings", e.target.value)} className="mt-1 h-9"/></div>
            <div><Label className="text-xs">Treatment Given</Label><Textarea value={v["Treatment Given"]||""} onChange={e=>SV("Treatment Given", e.target.value)} rows={2}/></div>
            <div><Label className="text-xs">Medicines Prescribed</Label><Textarea value={v["Medicines Prescribed"]||""} onChange={e=>SV("Medicines Prescribed", e.target.value)} rows={2}/></div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label className="text-xs">Dosage & Duration</Label><Input value={v["Dosage & Duration"]||""} onChange={e=>SV("Dosage & Duration", e.target.value)} className="mt-1 h-9"/></div>
              <div><Label className="text-xs">Follow-up Date</Label><Input type="date" value={v["Follow-up Date"]||""} onChange={e=>SV("Follow-up Date", e.target.value)} className="mt-1 h-9"/></div>
            </div>
            <div><Label className="text-xs">Doctor Notes</Label><Textarea value={v["Doctor Notes"]||""} onChange={e=>SV("Doctor Notes", e.target.value)} rows={2}/></div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><Label className="text-xs">Patient *</Label><Input list="patients-list" value={v["Patient"]||""} onChange={e=>SV("Patient", e.target.value)} placeholder="Select or type" className="mt-1 h-9"/></div>
            <div className="sm:col-span-2"><Label className="text-xs">Diagnosis / Clinical Impression *</Label><Input value={v["Diagnosis / Clinical Impression"]||""} onChange={e=>SV("Diagnosis / Clinical Impression", e.target.value)} className="mt-1 h-9"/></div>
            <div className="sm:col-span-2"><Label className="text-xs">Treatment Objective</Label><Input value={v["Treatment Objective"]||""} onChange={e=>SV("Treatment Objective", e.target.value)} className="mt-1 h-9"/></div>
            <div className="sm:col-span-2"><Label className="text-xs">Planned Treatment</Label><Textarea value={v["Planned Treatment"]||""} onChange={e=>SV("Planned Treatment", e.target.value)} rows={2}/></div>
            <div><Label className="text-xs">Medicines</Label><Textarea value={v["Medicines"]||""} onChange={e=>SV("Medicines", e.target.value)} rows={2}/></div>
            <div><Label className="text-xs">Expected Outcome</Label><Input value={v["Expected Outcome"]||""} onChange={e=>SV("Expected Outcome", e.target.value)} className="mt-1 h-9"/></div>
            <div><Label className="text-xs">Follow-up Schedule</Label><Input value={v["Follow-up Schedule"]||""} onChange={e=>SV("Follow-up Schedule", e.target.value)} className="mt-1 h-9"/></div>
            <div><Label className="text-xs">Estimated Duration</Label><Input value={v["Estimated Duration"]||""} onChange={e=>SV("Estimated Duration", e.target.value)} className="mt-1 h-9"/></div>
            <div><Label className="text-xs">Patient Consent</Label><select value={v["Patient Consent"]||""} onChange={e=>SV("Patient Consent", e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">Select</option><option value="Yes">Yes</option><option value="No">No</option><option value="Pending">Pending</option></select></div>
            <div className="sm:col-span-2"><Label className="text-xs">Doctor&apos;s Remarks</Label><Textarea value={v["Doctor's Remarks"]||""} onChange={e=>SV("Doctor's Remarks", e.target.value)} rows={2}/></div>
          </div>
        )}
        <div className="flex gap-2"><Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button><Button onClick={submit}>{editing?"Update":"Save"}</Button></div>
      </div>}

      <Dialog open={!!viewing} onOpenChange={v=>!v&&setViewing(null)}><DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>View {viewing?.type}</DialogTitle></DialogHeader>{viewing&&<div className="grid sm:grid-cols-2 gap-3 text-sm">{Object.entries(viewing.data).map(([k,v])=><div key={k}><span className="text-muted-foreground text-xs">{k}:</span><div className="font-medium break-words">{String(v)||"—"}</div></div>)}</div>}<DialogFooter><Button variant="outline" onClick={()=>setViewing(null)}>Close</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
