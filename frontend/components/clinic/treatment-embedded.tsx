"use client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Eye, Pencil, Trash2, Plus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Pagination } from "@/components/ui/pagination";
import type { Patient } from "@/lib/clinic-api";

type Entry={id:string;createdAt:string;patient:string;type:"record"|"plan";data:Record<string,string>}
function useStore(key:string){
  const [items,setItems]=useState<Entry[]>([]);
  useEffect(()=>{try{const v=localStorage.getItem(key);if(v)setItems(JSON.parse(v));}catch{}},[key]);
  const save=(next:Entry[])=>{setItems(next);localStorage.setItem(key,JSON.stringify(next));};
  return [items,save] as const
}
const COLS=["Patient","Visit Date","Doctor","Diagnosis / Plan","Treatment / Objective","Medicines","Follow-up","Type"];

export function TreatmentEmbedded({ patients, doctors, appointments, prescriptions, scopePatientName }:{patients:Patient[];doctors:any[];appointments:any[];prescriptions:any[];scopePatientName:string|null}) {
  const [items,save]=useStore("treatment_combined");
  const [open,setOpen]=useState(false);
  const [editing,setEditing]=useState<string|null>(null);
  const [viewing,setViewing]=useState<Entry|null>(null);
  const [formType,setFormType]=useState<"record"|"plan">("record");
  const [v,setV]=useState<Record<string,string>>({});
  const SV=(f:string,val:string)=>setV(prev=>({...prev,[f]:val??""}));
  const selectedPatientId=useMemo(()=>patients.find(p=>p.fullName===(v["Patient"]||scopePatientName||""))?.patientId??null,[patients,v,scopePatientName]);
  const filteredAppointments=useMemo(()=>!selectedPatientId?[]:appointments.filter((a:any)=>a.patientId===selectedPatientId),[appointments,selectedPatientId]);

  function onPatientSelect(name:string){
    SV("Patient",name);
    const p=patients.find(x=>x.fullName===name);
    if(!p) return;
    const appt=appointments.find((a:any)=>a.patientId===p.patientId);
    if(appt){const val=appt.date+" "+appt.time;SV("Appointment",val);SV("Visit Date & Time",val);}
    const doc=doctors.find((d:any)=>d.doctorId===p.doctorId);
    if(doc) SV("Doctor",doc.name);
    const pres=prescriptions.find((pr:any)=>pr.patientId===p.patientId) as any;
    if(pres){const meds=pres.medicines?.map((m:any)=>m.name).join(", ");SV("Medicines Prescribed",meds);SV("Medicines",meds);if(pres.diagnosis){SV("Diagnosis",pres.diagnosis);SV("Diagnosis / Clinical Impression",pres.diagnosis);}}
    SV("Follow-up Date",new Date(Date.now()+7*24*60*60*1000).toISOString().slice(0,10));
    SV("Follow-up Schedule","Follow-up in 7 days");
  }
  function startAdd(t:"record"|"plan"){setFormType(t);const init:any={};if(scopePatientName){init["Patient"]=scopePatientName; } setV(init); if(scopePatientName) setTimeout(()=>onPatientSelect(scopePatientName),0); setEditing(null);setOpen(true);}
  function startEdit(e:Entry){setFormType(e.type);setV({...e.data});setEditing(e.id);setOpen(true);}
  function submit(){
    const patient=v["Patient"]?.trim()||scopePatientName||"";
    if(!patient) return toast.error("Patient required");
    if(formType==="record"&&!v["Diagnosis"]?.trim()) return toast.error("Diagnosis required");
    if(formType==="plan"&&!v["Diagnosis / Clinical Impression"]?.trim()) return toast.error("Diagnosis required");
    if(editing) save(items.map(x=>x.id===editing?{...x,patient,type:formType,data:{...v,Patient:patient}}:x));
    else save([{id:`TR-${Date.now()}`,createdAt:new Date().toISOString(),patient,type:formType,data:{...v,Patient:patient}},...items]);
    setV({});setEditing(null);setOpen(false);toast.success("Saved");
  }
  const [q,setQ]=useState("");
  const [selected,setSelected]=useState<Set<string>>(new Set());
  const [page,setPage]=useState(0);
  const pageSize=10;
  const filtered=useMemo(()=>{
    let a=items;
    if(scopePatientName) a=a.filter(i=>i.patient===scopePatientName);
    if(q) a=a.filter(i=>JSON.stringify(i).toLowerCase().includes(q.toLowerCase()));
    return a;
  },[items,q,scopePatientName]);
  const paged=useMemo(()=>filtered.slice(page*pageSize,page*pageSize+pageSize),[filtered,page]);
  const pageCount=Math.ceil(filtered.length/pageSize);
  const allChecked=filtered.length>0&&filtered.every(i=>selected.has(i.id));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div><h3 className="text-sm font-semibold">Treatment Records</h3><p className="text-xs text-muted-foreground">{scopePatientName?`Filtered to ${scopePatientName}`:`${filtered.length} total`}</p></div>
          <Button onClick={()=>startAdd("record")} className="h-9 gap-1.5 rounded-xl shadow-sm"><Plus className="size-4"/>Add Record</Button>
        </div>
        {open && <div className="mt-5 rounded-2xl border bg-muted/20 p-5 space-y-4">
          <h3 className="font-semibold text-sm">{editing?"Edit":"New"} Treatment — Record & Plan</h3>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div><Label className="text-xs">Patient *</Label><select value={v["Patient"]||scopePatientName||""} onChange={e=>onPatientSelect(e.target.value)} className="mt-1 h-9 w-full rounded-xl border bg-card px-3 text-sm"><option value="">Select patient</option>{patients.map(p=><option key={p.patientId} value={p.fullName}>{p.fullName}</option>)}</select></div>
              <div><Label className="text-xs">Appointment</Label><select value={v["Appointment"]||v["Visit Date & Time"]||""} onChange={e=>{SV("Appointment",e.target.value);SV("Visit Date & Time",e.target.value)}} className="mt-1 h-9 w-full rounded-xl border bg-card px-3 text-sm"><option value="">{!v["Patient"]&&!scopePatientName?"Select patient first":filteredAppointments.length===0?"No appointments":"Select appointment"}</option>{filteredAppointments.map((a:any)=><option key={a.appointmentId} value={a.date+" "+a.time}>{a.date} {a.time} — {a.reason||a.appointmentId.slice(0,6)}</option>)}</select></div>
              <div><Label className="text-xs">Doctor</Label><select value={v["Doctor"]||""} onChange={e=>SV("Doctor",e.target.value)} className="mt-1 h-9 w-full rounded-xl border bg-card px-3 text-sm"><option value="">Select doctor</option>{doctors.map((d:any)=><option key={d.doctorId} value={d.name}>{d.name}</option>)}</select></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label className="text-xs">Diagnosis *</Label><select value={v["Diagnosis"]||v["Diagnosis / Clinical Impression"]||""} onChange={e=>{SV("Diagnosis",e.target.value);SV("Diagnosis / Clinical Impression",e.target.value)}} className="mt-1 h-9 w-full rounded-xl border bg-card px-3 text-sm"><option value="">Select diagnosis</option><option>Fever</option><option>Infection</option><option>Diabetes</option><option>Hypertension</option><option>Other</option></select></div>
              <div><Label className="text-xs">Treatment Given / Objective</Label><select value={v["Treatment Given"]||v["Treatment Objective"]||""} onChange={e=>{SV("Treatment Given",e.target.value);SV("Treatment Objective",e.target.value)}} className="mt-1 h-9 w-full rounded-xl border bg-card px-3 text-sm"><option value="">Select treatment</option><option>Medication</option><option>Therapy</option><option>Surgery</option><option>Observation</option></select></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label className="text-xs">Prescriptions</Label><select value={v["Medicines Prescribed"]||v["Medicines"]||""} onChange={e=>{SV("Medicines Prescribed",e.target.value);SV("Medicines",e.target.value)}} className="mt-1 h-9 w-full rounded-xl border bg-card px-3 text-sm"><option value="">Select prescription</option>{prescriptions.map((pr:any)=><option key={pr.prescriptionId} value={pr.medicines?.map((m:any)=>m.name).join(", ")}>{pr.medicines?.map((m:any)=>m.name).join(", ").slice(0,40)||pr.diagnosis||pr.prescriptionId.slice(0,6)}</option>)}<option>Paracetamol</option><option>Antibiotic</option><option>Other</option></select></div>
              <div><Label className="text-xs">Dosage & Duration</Label><select value={v["Dosage & Duration"]||""} onChange={e=>SV("Dosage & Duration",e.target.value)} className="mt-1 h-9 w-full rounded-xl border bg-card px-3 text-sm"><option value="">Select dosage</option><option>1x daily - 3 days</option><option>2x daily - 5 days</option><option>3x daily - 7 days</option></select></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label className="text-xs">Follow-up</Label><select value={v["Follow-up Date"]||v["Follow-up Schedule"]||"Follow-up in 7 days"} onChange={e=>{SV("Follow-up Date",e.target.value);SV("Follow-up Schedule",e.target.value)}} className="mt-1 h-9 w-full rounded-xl border bg-card px-3 text-sm"><option value="">Select follow-up</option><option>Follow-up in 3 days</option><option>Follow-up in 7 days</option><option>Follow-up in 14 days</option></select></div>
              <div><Label className="text-xs">Patient Consent</Label><select value={v["Patient Consent"]||""} onChange={e=>SV("Patient Consent",e.target.value)} className="mt-1 h-9 w-full rounded-xl border bg-card px-3 text-sm"><option value="">Select</option><option>Yes</option><option>No</option><option>Pending</option></select></div>
            </div>
            <div><Label className="text-xs">Doctor Notes</Label><Textarea value={v["Doctor Notes"]||v["Doctor's Remarks"]||""} onChange={e=>{SV("Doctor Notes",e.target.value);SV("Doctor's Remarks",e.target.value)}} rows={2} placeholder="Type notes..." className="mt-1 rounded-xl min-h-[72px]"/></div>
          </div>
          <div className="flex gap-2"><Button variant="outline" className="rounded-xl" onClick={()=>setOpen(false)}>Cancel</Button><Button className="rounded-xl" onClick={submit}>{editing?"Update":"Save"}</Button></div>
        </div>}
      </div>
      <Card className="rounded-2xl shadow-sm overflow-hidden"><CardContent className="p-0"><div className="overflow-x-auto"><Table>
        <TableHeader><TableRow className="bg-muted/40"><TableHead className="w-10"><Checkbox checked={allChecked} onCheckedChange={v=>setSelected(v?new Set(filtered.map(i=>i.id)):new Set())}/></TableHead>{COLS.map(c=><TableHead key={c} className="text-xs whitespace-nowrap">{c}</TableHead>)}<TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
        <TableBody>{paged.length===0?<TableRow><TableCell colSpan={COLS.length+2} className="py-16 text-center text-sm text-muted-foreground">{items.length===0?"No entries yet — click Add Record.":"No match."}</TableCell></TableRow>:paged.map(it=><TableRow key={it.id} className="hover:bg-muted/30">
          <TableCell><Checkbox checked={selected.has(it.id)} onCheckedChange={v=>setSelected(s=>{const n=new Set(s);if(v)n.add(it.id);else n.delete(it.id);return n;})}/></TableCell>
          <TableCell className="text-xs">{it.patient}</TableCell><TableCell className="text-xs">{it.data["Visit Date & Time"]||"—"}</TableCell><TableCell className="text-xs">{it.data["Doctor"]||"—"}</TableCell><TableCell className="text-xs max-w-[150px] truncate">{it.data["Diagnosis"]||it.data["Diagnosis / Clinical Impression"]||"—"}</TableCell><TableCell className="text-xs max-w-[150px] truncate">{it.data["Treatment Given"]||it.data["Treatment Objective"]||"—"}</TableCell><TableCell className="text-xs max-w-[150px] truncate">{it.data["Medicines Prescribed"]||it.data["Medicines"]||"—"}</TableCell><TableCell className="text-xs">{it.data["Follow-up Date"]||"—"}</TableCell><TableCell><span className={`rounded-full px-2 py-0.5 text-xs ${it.type==="record"?"bg-blue-50 text-blue-700":"bg-emerald-50 text-emerald-700"}`}>{it.type}</span></TableCell>
          <TableCell className="text-right"><div className="flex justify-end gap-0.5"><Button variant="ghost" size="icon" className="size-7" onClick={()=>setViewing(it)}><Eye className="size-3.5"/></Button><Button variant="ghost" size="icon" className="size-7" onClick={()=>startEdit(it)}><Pencil className="size-3.5"/></Button><Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={()=>save(items.filter(x=>x.id!==it.id))}><Trash2 className="size-3.5"/></Button></div></TableCell>
        </TableRow>)}</TableBody>
      </Table></div></CardContent>{filtered.length>0&&<Pagination page={page+1} pageSize={pageSize} totalItems={filtered.length} onPageChange={p=>setPage(Math.max(0,Math.min(p-1,Math.ceil(filtered.length/pageSize)-1)))} itemLabel="records"/>}</Card>
      <Dialog open={!!viewing} onOpenChange={v=>!v&&setViewing(null)}><DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl"><DialogHeader><DialogTitle>View {viewing?.type}</DialogTitle></DialogHeader>{viewing&&<div className="grid sm:grid-cols-2 gap-3 text-sm">{Object.entries(viewing.data).map(([k,v])=><div key={k}><span className="text-muted-foreground text-xs">{k}:</span><div className="font-medium break-words">{String(v)||"—"}</div></div>)}</div>}<DialogFooter><Button variant="outline" className="rounded-xl" onClick={()=>setViewing(null)}>Close</Button></DialogFooter></DialogContent></Dialog>
    </div>
  )
}
