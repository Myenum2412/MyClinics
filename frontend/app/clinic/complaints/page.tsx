"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import { listRecords, updateRecord, deleteRecord, listPatients, listDoctors, type MedicineRecord, type Patient, type Doctor } from "@/lib/clinic-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { PersonAvatar } from "@/components/clinic/person-avatar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/format-time";
import { HeartPulse, Search, ClipboardList, ShieldCheck, FileText, MessageSquare, RefreshCw, Eye, Pencil, Trash2, Plus } from "lucide-react";

type LocalForm = { id: string; patient: string; createdAt: string; data: Record<string,string> };

function useLocalStore(key: string){
  const [items, setItems] = useState<LocalForm[]>(() => {
    if(typeof window==="undefined") return [];
    try{ return JSON.parse(localStorage.getItem(key)??"[]"); }catch{ return []; }
  });
  useEffect(()=>{ localStorage.setItem(key, JSON.stringify(items)); },[key, items]);
  return [items, setItems] as const;
}

export default function TreatmentPage() {
  const session = useRequireRole("staff" as any);
  const clinicId = session?.clinicId ?? "";
  const [records, setRecords] = useState<MedicineRecord[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const pageSize=10;
  const patientMap = useMemo(()=>{ const m=new Map<string,Patient>(); patients.forEach(p=>m.set(p.patientId,p)); return m;},[patients]);
  const doctorMap = useMemo(()=>{ const m=new Map<string,Doctor>(); doctors.forEach(d=>m.set(d.doctorId,d)); return m;},[doctors]);

  // view/edit/delete
  const [viewing, setViewing] = useState<MedicineRecord|null>(null);
  const [editing, setEditing] = useState<MedicineRecord|null>(null);
  const [editForm, setEditForm] = useState({diagnosis:"", treatment:"", notes:""});
  const [deleteTarget, setDeleteTarget] = useState<MedicineRecord|null>(null);

  // local stores for forms tabs
  const [plans, setPlans] = useLocalStore("treatment_plans");
  const [consents, setConsents] = useLocalStore("treatment_consents");
  const [discharges, setDischarges] = useLocalStore("treatment_discharges");
  const [complaints, setComplaints] = useLocalStore("treatment_complaints");

  const load = useCallback(()=> {
    if(!clinicId) return;
    setLoading(true);
    Promise.allSettled([listRecords(clinicId,{limit:100}), listPatients(clinicId,{limit:100}), listDoctors(clinicId,{limit:100})])
      .then(([r,p,d])=>{
        if(r.status==="fulfilled") setRecords(r.value.items); else toast.error("Failed to load treatments");
        if(p.status==="fulfilled") setPatients(p.value.items);
        if(d.status==="fulfilled") setDoctors(d.value.items);
      }).finally(()=>setLoading(false));
  },[clinicId]);
  useEffect(()=>{ load(); },[load]);

  const filtered = useMemo(()=>{
    if(!q.trim()) return records;
    const qq=q.toLowerCase();
    return records.filter(r=>{
      const pn=patientMap.get(r.patientId)?.fullName.toLowerCase()??"";
      const dn=doctorMap.get(r.doctorId)?.name.toLowerCase()??"";
      return r.diagnosis.toLowerCase().includes(qq)||(r.treatment??"").toLowerCase().includes(qq)||pn.includes(qq)||dn.includes(qq);
    });
  },[records,q,patientMap,doctorMap]);
  const paged = useMemo(()=> filtered.slice(page*pageSize, page*pageSize+pageSize),[filtered,page]);
  const pageCount=Math.ceil(filtered.length/pageSize);

  async function handleUpdate(){
    if(!editing) return;
    try{ await updateRecord(clinicId, editing.recordId, editForm); toast.success("Updated"); setEditing(null); load(); }catch(e:any){ toast.error(e.message); }
  }
  async function handleDelete(){
    if(!deleteTarget) return;
    try{ await deleteRecord(clinicId, deleteTarget.recordId); toast.success("Deleted"); load(); }catch(e:any){ toast.error(e.message); }
  }

  const SectionCard=({title, count, placeholder, value, onChange}:{title:string;count:number;placeholder:string;value:string;onChange:(v:string)=>void})=>(
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h3 className="text-sm font-semibold">{title}</h3><p className="text-xs text-muted-foreground">{count} records</p></div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"/><Input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className="pl-9 h-9"/></div>
          <Button variant="outline" size="sm" onClick={load} className="h-9 gap-1.5"><RefreshCw className="size-3.5"/>Sync</Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="relative overflow-hidden rounded-[20px] border border-purple-100 bg-gradient-to-br from-violet-50 via-indigo-50 to-white p-5">
        <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white"><HeartPulse className="size-5"/></span><div><h1 className="text-xl font-bold tracking-tight">Treatment</h1><p className="text-xs text-muted-foreground">Real records + local forms — tables with View / Edit / Delete</p></div></div>
      </div>

      <Tabs defaultValue="records">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="records" className="gap-1.5"><ClipboardList className="size-4"/>Records</TabsTrigger>
          <TabsTrigger value="complaints" className="gap-1.5"><MessageSquare className="size-4"/>Complaints ({complaints.length})</TabsTrigger>
          <TabsTrigger value="plans" className="gap-1.5"><ClipboardList className="size-4"/>Plans ({plans.length})</TabsTrigger>
          <TabsTrigger value="consent" className="gap-1.5"><ShieldCheck className="size-4"/>Consent ({consents.length})</TabsTrigger>
          <TabsTrigger value="discharge" className="gap-1.5"><FileText className="size-4"/>Discharge ({discharges.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="space-y-4 mt-4">
          <SectionCard title="Treatment Records" count={filtered.length} placeholder="Search diagnosis, treatment, patient..." value={q} onChange={v=>{setQ(v);setPage(0)}}/>
          <Card className="shadow-sm"><CardContent className="p-0">
            {loading ? <div className="p-6 space-y-3"><Skeleton className="h-10 w-full"/><Skeleton className="h-10 w-full"/></div>
            : filtered.length===0 ? <div className="py-16 text-center"><ClipboardList className="size-10 mx-auto text-muted-foreground/40"/><p className="mt-3 text-sm text-muted-foreground">No records</p></div>
            : <div className="overflow-x-auto"><Table>
                <TableHeader><TableRow className="bg-muted/40"><TableHead>Patient</TableHead><TableHead>Doctor</TableHead><TableHead>Diagnosis</TableHead><TableHead>Treatment</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>{paged.map(r=>{
                  const p=patientMap.get(r.patientId); const d=doctorMap.get(r.doctorId);
                  return <TableRow key={r.recordId} className="hover:bg-muted/30">
                    <TableCell><div className="flex items-center gap-2.5"><PersonAvatar clinicId={clinicId} ownerType="patient" ownerId={r.patientId} name={p?.fullName??r.patientId}/><span className="text-xs font-semibold">{p?.fullName??r.patientId}</span></div></TableCell>
                    <TableCell className="text-xs">{d?.name??r.doctorId}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs">{r.diagnosis}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">{r.treatment??"—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(r.visitDate)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-0.5">
                        <Button variant="ghost" size="icon" className="size-7" onClick={()=>setViewing(r)}><Eye className="size-3.5"/></Button>
                        <Button variant="ghost" size="icon" className="size-7" onClick={()=>{ setEditing(r); setEditForm({diagnosis:r.diagnosis, treatment:r.treatment??"", notes:r.notes??""}); }}><Pencil className="size-3.5"/></Button>
                        <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={()=>setDeleteTarget(r)}><Trash2 className="size-3.5"/></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                })}</TableBody>
              </Table></div>}
          </CardContent>
          {!loading && filtered.length>0 && <Pagination page={page+1} pageSize={pageSize} totalItems={filtered.length} onPageChange={p=>setPage(Math.max(0,Math.min(p-1,pageCount-1)))} itemLabel="records"/>}
          </Card>
        </TabsContent>

        <TabsContent value="complaints" className="mt-4 space-y-4"><ComplaintsTab items={complaints} setItems={setComplaints}/></TabsContent>
        <TabsContent value="plans" className="mt-4 space-y-4"><PlansTab items={plans} setItems={setPlans}/></TabsContent>
        <TabsContent value="consent" className="mt-4 space-y-4"><ConsentTab items={consents} setItems={setConsents}/></TabsContent>
        <TabsContent value="discharge" className="mt-4 space-y-4"><DischargeTab items={discharges} setItems={setDischarges}/></TabsContent>
      </Tabs>

      {/* View Dialog */}
      <Dialog open={!!viewing} onOpenChange={v=>!v&&setViewing(null)}>
        <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>View Treatment</DialogTitle></DialogHeader>
          {viewing && <div className="space-y-3 text-sm">
            <div><span className="text-muted-foreground">Patient:</span> {patientMap.get(viewing.patientId)?.fullName}</div>
            <div><span className="text-muted-foreground">Doctor:</span> {doctorMap.get(viewing.doctorId)?.name}</div>
            <div><span className="text-muted-foreground">Diagnosis:</span> {viewing.diagnosis}</div>
            <div><span className="text-muted-foreground">Treatment:</span> {viewing.treatment ?? "—"}</div>
            <div><span className="text-muted-foreground">Notes:</span> {viewing.notes ?? "—"}</div>
            <div><span className="text-muted-foreground">Date:</span> {formatDate(viewing.visitDate)}</div>
          </div>}
          <DialogFooter><Button variant="outline" onClick={()=>setViewing(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={v=>!v&&setEditing(null)}>
        <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Edit Treatment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-xs">Diagnosis</Label><Input value={editForm.diagnosis} onChange={e=>setEditForm({...editForm, diagnosis:e.target.value})} className="mt-1 h-9"/></div>
            <div><Label className="text-xs">Treatment</Label><Textarea value={editForm.treatment} onChange={e=>setEditForm({...editForm, treatment:e.target.value})} rows={3}/></div>
            <div><Label className="text-xs">Notes</Label><Textarea value={editForm.notes} onChange={e=>setEditForm({...editForm, notes:e.target.value})} rows={3}/></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={()=>setEditing(null)}>Cancel</Button><Button onClick={handleUpdate}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDeleteDialog open={!!deleteTarget} onOpenChange={v=>!v&&setDeleteTarget(null)} title="Delete treatment?" description="This will permanently delete the record." confirmLabel="Delete" onConfirm={async()=>{ await handleDelete(); setDeleteTarget(null); }}/>
    </div>
  );
}

function TableActions({onView,onEdit,onDelete}:{onView:()=>void;onEdit:()=>void;onDelete:()=>void}){
  return <div className="flex justify-end gap-0.5">
    <Button variant="ghost" size="icon" className="size-7" onClick={onView}><Eye className="size-3.5"/></Button>
    <Button variant="ghost" size="icon" className="size-7" onClick={onEdit}><Pencil className="size-3.5"/></Button>
    <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={onDelete}><Trash2 className="size-3.5"/></Button>
  </div>
}
function LocalTable({items, cols, onView,onEdit,onDelete}:{items:LocalForm[];cols:string[];onView:(i:LocalForm)=>void;onEdit:(i:LocalForm)=>void;onDelete:(i:LocalForm)=>void}){
  if(items.length===0) return <p className="py-8 text-center text-sm text-muted-foreground">No entries yet — use the form above.</p>
  return <Card className="shadow-sm"><CardContent className="p-0"><div className="overflow-x-auto"><Table>
    <TableHeader><TableRow className="bg-muted/40">{cols.map(c=><TableHead key={c}>{c}</TableHead>)}<TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
    <TableBody>{items.map(it=><TableRow key={it.id} className="hover:bg-muted/30">
      {cols.map(c=> <TableCell key={c} className="text-xs max-w-[200px] truncate">{it.data[c.toLowerCase()] ?? it.data[c] ?? "—"}</TableCell>)}
      <TableCell className="text-right"><TableActions onView={()=>onView(it)} onEdit={()=>onEdit(it)} onDelete={()=>onDelete(it)}/></TableCell>
    </TableRow>)}</TableBody>
  </Table></div></CardContent></Card>
}

function ComplaintsTab({items,setItems}:{items:LocalForm[];setItems:React.Dispatch<React.SetStateAction<LocalForm[]>>}){
  const [form,setForm]=useState({patient:"", category:"treatment", title:"", details:""});
  const [editingId,setEditingId]=useState<string|null>(null);
  const [viewing,setViewing]=useState<LocalForm|null>(null);
  const [q,setQ]=useState("");
  const filtered=useMemo(()=> q? items.filter(i=> JSON.stringify(i).toLowerCase().includes(q.toLowerCase())):items,[items,q]);
  function save(){
    if(!form.title.trim()) return toast.error("Title required");
    if(editingId){ setItems(a=>a.map(x=> x.id===editingId? {...x, data:{...form}}:x)); setEditingId(null); toast.success("Updated"); }
    else setItems(a=>[{id:`CMP-${Date.now()}`, patient:form.patient||"Anonymous", createdAt:new Date().toISOString(), data:{...form}},...a]);
    setForm({patient:"",category:"treatment",title:"",details:""}); toast.success(editingId?"Updated":"Saved");
  }
  return <>
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2"><MessageSquare className="size-4"/> {editingId?"Edit":"New"} Complaint</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div><Label className="text-xs">Patient</Label><Input value={form.patient} onChange={e=>setForm({...form,patient:e.target.value})} placeholder="Name" className="mt-1 h-9"/></div>
        <div><Label className="text-xs">Category</Label><Select value={form.category} onValueChange={v=>setForm({...form,category:v??"treatment"})}><SelectTrigger className="mt-1 h-9"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="treatment">Treatment</SelectItem><SelectItem value="staff">Staff</SelectItem><SelectItem value="billing">Billing</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
      </div>
      <div><Label className="text-xs">Subject</Label><Input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="mt-1 h-9"/></div>
      <div><Label className="text-xs">Details</Label><Textarea value={form.details} onChange={e=>setForm({...form,details:e.target.value})} rows={3}/></div>
      <div className="flex gap-2"><Button onClick={save} className="h-9 gap-1.5"><Plus className="size-4"/>{editingId?"Update":"Save"}</Button>{editingId&&<Button variant="outline" className="h-9" onClick={()=>{setEditingId(null);setForm({patient:"",category:"treatment",title:"",details:""})}}>Cancel</Button>}</div>
    </div>
    <div className="rounded-xl border bg-card p-4 flex gap-2"><div className="relative flex-1"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"/><Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search complaints..." className="pl-9 h-9"/></div></div>
    <LocalTable items={filtered} cols={["patient","category","title","details"]} onView={setViewing} onEdit={i=>{setForm({patient:i.data.patient, category:i.data.category, title:i.data.title, details:i.data.details});setEditingId(i.id)}} onDelete={i=>setItems(a=>a.filter(x=>x.id!==i.id))}/>
    <Dialog open={!!viewing} onOpenChange={v=>!v&&setViewing(null)}><DialogContent><DialogHeader><DialogTitle>View Complaint</DialogTitle></DialogHeader>{viewing&&<div className="text-sm space-y-2">{Object.entries(viewing.data).map(([k,v])=><div key={k}><span className="text-muted-foreground capitalize">{k}:</span> {String(v)}</div>)}</div>}<DialogFooter><Button variant="outline" onClick={()=>setViewing(null)}>Close</Button></DialogFooter></DialogContent></Dialog>
  </>
}
function PlansTab({items,setItems}:{items:LocalForm[];setItems:any}){
  const [form,setForm]=useState({patient:"", diagnosis:"", plan:"", duration:"", followUp:""});
  const [editingId,setEditingId]=useState<string|null>(null);
  const [viewing,setViewing]=useState<LocalForm|null>(null);
  const [q,setQ]=useState("");
  const filtered=useMemo(()=> q? items.filter((i:LocalForm)=> JSON.stringify(i).toLowerCase().includes(q.toLowerCase())):items,[items,q]);
  function save(){
    if(!form.patient.trim()) return toast.error("Patient required");
    if(editingId){ setItems((a:LocalForm[])=>a.map((x:LocalForm)=> x.id===editingId? {...x, data:{...form}}:x)); setEditingId(null);}
    else setItems((a:LocalForm[])=>[{id:`PLAN-${Date.now()}`, patient:form.patient, createdAt:new Date().toISOString(), data:{...form}},...a]);
    setForm({patient:"",diagnosis:"",plan:"",duration:"",followUp:""}); toast.success("Saved");
  }
  return <>
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <h3 className="text-sm font-semibold">{editingId?"Edit":"New"} Treatment Plan</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div><Label className="text-xs">Patient *</Label><Input value={form.patient} onChange={e=>setForm({...form,patient:e.target.value})} className="mt-1 h-9"/></div>
        <div><Label className="text-xs">Diagnosis</Label><Input value={form.diagnosis} onChange={e=>setForm({...form,diagnosis:e.target.value})} className="mt-1 h-9"/></div>
      </div>
      <div><Label className="text-xs">Plan</Label><Textarea value={form.plan} onChange={e=>setForm({...form,plan:e.target.value})} rows={3}/></div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div><Label className="text-xs">Duration</Label><Input value={form.duration} onChange={e=>setForm({...form,duration:e.target.value})} className="mt-1 h-9"/></div>
        <div><Label className="text-xs">Follow-up</Label><Input type="date" value={form.followUp} onChange={e=>setForm({...form,followUp:e.target.value})} className="mt-1 h-9"/></div>
      </div>
      <div className="flex gap-2"><Button onClick={save} className="h-9"><Plus className="size-4 mr-1"/>{editingId?"Update":"Save"}</Button>{editingId&&<Button variant="outline" className="h-9" onClick={()=>{setEditingId(null);setForm({patient:"",diagnosis:"",plan:"",duration:"",followUp:""})}}>Cancel</Button>}</div>
    </div>
    <div className="rounded-xl border bg-card p-4 flex gap-2"><div className="relative flex-1"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"/><Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search plans..." className="pl-9 h-9"/></div></div>
    <LocalTable items={filtered} cols={["patient","diagnosis","plan","duration","followUp"]} onView={setViewing} onEdit={(i:LocalForm)=>{setForm({patient:i.data.patient,diagnosis:i.data.diagnosis,plan:i.data.plan,duration:i.data.duration,followUp:i.data.followUp});setEditingId(i.id)}} onDelete={(i:LocalForm)=>setItems((a:LocalForm[])=>a.filter((x:LocalForm)=>x.id!==i.id))}/>
    <Dialog open={!!viewing} onOpenChange={v=>!v&&setViewing(null)}><DialogContent><DialogHeader><DialogTitle>View Plan</DialogTitle></DialogHeader>{viewing&&<div className="text-sm space-y-2">{Object.entries(viewing.data).map(([k,v])=><div key={k}><span className="text-muted-foreground capitalize">{k}:</span> {String(v)}</div>)}</div>}<DialogFooter><Button variant="outline" onClick={()=>setViewing(null)}>Close</Button></DialogFooter></DialogContent></Dialog>
  </>
}
function ConsentTab({items,setItems}:{items:LocalForm[];setItems:any}){
  const [form,setForm]=useState({patient:"", procedure:"", risks:""});
  const [editingId,setEditingId]=useState<string|null>(null);
  const [viewing,setViewing]=useState<LocalForm|null>(null);
  const [q,setQ]=useState("");
  const filtered=useMemo(()=> q? items.filter((i:LocalForm)=> JSON.stringify(i).toLowerCase().includes(q.toLowerCase())):items,[items,q]);
  function save(){
    if(!form.patient.trim()||!form.procedure.trim()) return toast.error("Patient & procedure required");
    if(editingId) setItems((a:LocalForm[])=>a.map((x:LocalForm)=> x.id===editingId? {...x, data:{...form}}:x));
    else setItems((a:LocalForm[])=>[{id:`CONSENT-${Date.now()}`, patient:form.patient, createdAt:new Date().toISOString(), data:{...form}},...a]);
    setEditingId(null); setForm({patient:"",procedure:"",risks:""}); toast.success("Saved");
  }
  return <>
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <h3 className="text-sm font-semibold">{editingId?"Edit":"New"} Consent Form</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div><Label className="text-xs">Patient *</Label><Input value={form.patient} onChange={e=>setForm({...form,patient:e.target.value})} className="mt-1 h-9"/></div>
        <div><Label className="text-xs">Procedure *</Label><Input value={form.procedure} onChange={e=>setForm({...form,procedure:e.target.value})} className="mt-1 h-9"/></div>
      </div>
      <div><Label className="text-xs">Risks & benefits</Label><Textarea value={form.risks} onChange={e=>setForm({...form,risks:e.target.value})} rows={3}/></div>
      <div className="flex gap-2"><Button onClick={save} className="h-9"><Plus className="size-4 mr-1"/>{editingId?"Update":"Save"}</Button>{editingId&&<Button variant="outline" className="h-9" onClick={()=>{setEditingId(null);setForm({patient:"",procedure:"",risks:""})}}>Cancel</Button>}</div>
    </div>
    <div className="rounded-xl border bg-card p-4 flex gap-2"><div className="relative flex-1"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"/><Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search consents..." className="pl-9 h-9"/></div></div>
    <LocalTable items={filtered} cols={["patient","procedure","risks"]} onView={setViewing} onEdit={(i:LocalForm)=>{setForm({patient:i.data.patient,procedure:i.data.procedure,risks:i.data.risks});setEditingId(i.id)}} onDelete={(i:LocalForm)=>setItems((a:LocalForm[])=>a.filter((x:LocalForm)=>x.id!==i.id))}/>
    <Dialog open={!!viewing} onOpenChange={v=>!v&&setViewing(null)}><DialogContent><DialogHeader><DialogTitle>View Consent</DialogTitle></DialogHeader>{viewing&&<div className="text-sm space-y-2">{Object.entries(viewing.data).map(([k,v])=><div key={k}><span className="text-muted-foreground capitalize">{k}:</span> {String(v)}</div>)}</div>}<DialogFooter><Button variant="outline" onClick={()=>setViewing(null)}>Close</Button></DialogFooter></DialogContent></Dialog>
  </>
}
function DischargeTab({items,setItems}:{items:LocalForm[];setItems:any}){
  const [form,setForm]=useState({patient:"", summary:"", instructions:"", date:""});
  const [editingId,setEditingId]=useState<string|null>(null);
  const [viewing,setViewing]=useState<LocalForm|null>(null);
  const [q,setQ]=useState("");
  const filtered=useMemo(()=> q? items.filter((i:LocalForm)=> JSON.stringify(i).toLowerCase().includes(q.toLowerCase())):items,[items,q]);
  function save(){
    if(!form.patient.trim()) return toast.error("Patient required");
    if(editingId) setItems((a:LocalForm[])=>a.map((x:LocalForm)=> x.id===editingId? {...x, data:{...form}}:x));
    else setItems((a:LocalForm[])=>[{id:`DIS-${Date.now()}`, patient:form.patient, createdAt:new Date().toISOString(), data:{...form}},...a]);
    setEditingId(null); setForm({patient:"",summary:"",instructions:"",date:""}); toast.success("Saved");
  }
  return <>
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <h3 className="text-sm font-semibold">{editingId?"Edit":"New"} Discharge Summary</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div><Label className="text-xs">Patient *</Label><Input value={form.patient} onChange={e=>setForm({...form,patient:e.target.value})} className="mt-1 h-9"/></div>
        <div><Label className="text-xs">Date</Label><Input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} className="mt-1 h-9"/></div>
      </div>
      <div><Label className="text-xs">Summary</Label><Textarea value={form.summary} onChange={e=>setForm({...form,summary:e.target.value})} rows={3}/></div>
      <div><Label className="text-xs">Instructions</Label><Textarea value={form.instructions} onChange={e=>setForm({...form,instructions:e.target.value})} rows={3}/></div>
      <div className="flex gap-2"><Button onClick={save} className="h-9"><Plus className="size-4 mr-1"/>{editingId?"Update":"Save"}</Button>{editingId&&<Button variant="outline" className="h-9" onClick={()=>{setEditingId(null);setForm({patient:"",summary:"",instructions:"",date:""})}}>Cancel</Button>}</div>
    </div>
    <div className="rounded-xl border bg-card p-4 flex gap-2"><div className="relative flex-1"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"/><Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search discharges..." className="pl-9 h-9"/></div></div>
    <LocalTable items={filtered} cols={["patient","summary","instructions","date"]} onView={setViewing} onEdit={(i:LocalForm)=>{setForm({patient:i.data.patient,summary:i.data.summary,instructions:i.data.instructions,date:i.data.date});setEditingId(i.id)}} onDelete={(i:LocalForm)=>setItems((a:LocalForm[])=>a.filter((x:LocalForm)=>x.id!==i.id))}/>
    <Dialog open={!!viewing} onOpenChange={v=>!v&&setViewing(null)}><DialogContent><DialogHeader><DialogTitle>View Discharge</DialogTitle></DialogHeader>{viewing&&<div className="text-sm space-y-2">{Object.entries(viewing.data).map(([k,v])=><div key={k}><span className="text-muted-foreground capitalize">{k}:</span> {String(v)}</div>)}</div>}<DialogFooter><Button variant="outline" onClick={()=>setViewing(null)}>Close</Button></DialogFooter></DialogContent></Dialog>
  </>
}
