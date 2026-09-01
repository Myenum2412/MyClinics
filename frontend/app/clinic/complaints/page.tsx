"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Eye, Pencil, Trash2, Plus } from "lucide-react";

type Entry = { id: string; createdAt: string; data: Record<string,string> };
function useStore(key: string){
  const [items,setItems]=useState<Entry[]>(()=>{
    if(typeof window==="undefined") return [];
    try{ return JSON.parse(localStorage.getItem(key)??"[]"); }catch{ return []; }
  });
  const save=(next: Entry[])=>{ setItems(next); localStorage.setItem(key, JSON.stringify(next)); };
  return [items, save] as const;
}
function TableView({items, cols, onView,onEdit,onDelete}:{items:Entry[];cols:string[];onView:(e:Entry)=>void;onEdit:(e:Entry)=>void;onDelete:(e:Entry)=>void}){
  const [q,setQ]=useState("");
  const filtered=useMemo(()=> q? items.filter(i=> JSON.stringify(i).toLowerCase().includes(q.toLowerCase())):items,[items,q]);
  if(items.length===0) return <p className="py-8 text-center text-sm text-muted-foreground">No entries yet — fill the form above and Save.</p>
  return <>
    <div className="rounded-xl border bg-card p-3 flex gap-2">
      <div className="relative flex-1"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"/><Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search..." className="pl-9 h-9"/></div>
      <span className="text-xs text-muted-foreground self-center">{filtered.length}/{items.length}</span>
    </div>
    <Card className="shadow-sm"><CardContent className="p-0"><div className="overflow-x-auto"><Table>
      <TableHeader><TableRow className="bg-muted/40">{cols.map(c=><TableHead key={c} className="text-xs whitespace-nowrap">{c}</TableHead>)}<TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
      <TableBody>{filtered.map(it=><TableRow key={it.id} className="hover:bg-muted/30">
        {cols.map(c=> <TableCell key={c} className="text-xs max-w-[160px] truncate">{it.data[c]||"—"}</TableCell>)}
        <TableCell className="text-right"><div className="flex justify-end gap-0.5">
          <Button variant="ghost" size="icon" className="size-7" onClick={()=>onView(it)}><Eye className="size-3.5"/></Button>
          <Button variant="ghost" size="icon" className="size-7" onClick={()=>onEdit(it)}><Pencil className="size-3.5"/></Button>
          <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={()=>onDelete(it)}><Trash2 className="size-3.5"/></Button>
        </div></TableCell>
      </TableRow>)}</TableBody>
    </Table></div></CardContent></Card>
  </>
}

export default function TreatmentPage(){
  const [tab,setTab]=useState("record");
  return (
    <div className="flex flex-col gap-6">
      <div><h1 className="text-2xl font-bold tracking-tight">Treatment</h1><p className="text-sm text-muted-foreground">Forms & tables — persisted locally (wire to API later)</p></div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="record">1. Treatment Record</TabsTrigger>
          <TabsTrigger value="complaint">2. Complaints</TabsTrigger>
          <TabsTrigger value="plan">3. Treatment Plan</TabsTrigger>
          <TabsTrigger value="discharge">4. Discharge</TabsTrigger>
        </TabsList>
        <TabsContent value="record" className="mt-4"><RecordTab/></TabsContent>
        <TabsContent value="complaint" className="mt-4"><ComplaintTab/></TabsContent>
        <TabsContent value="plan" className="mt-4"><PlanTab/></TabsContent>
        <TabsContent value="discharge" className="mt-4"><DischargeTab/></TabsContent>
      </Tabs>
    </div>
  );
}

const COLS_RECORD=["Patient Name / ID","Visit Date & Time","Doctor","Diagnosis","Symptoms / Findings","Treatment Given","Procedures Performed","Medicines Prescribed","Dosage & Duration","Doctor Notes","Follow-up Date","Attachments / Reports"];
const COLS_COMPLAINT=["Chief Complaint","Complaint Category","Location","Severity","Duration","Onset","Frequency","Associated Symptoms","Previous Treatment","Patient's Description","Doctor's Observation","Priority"];
const COLS_PLAN=["Diagnosis / Clinical Impression","Treatment Objective","Planned Treatment","Procedures Required","Medicines","Investigations / Tests","Lifestyle / Care Instructions","Expected Outcome","Follow-up Schedule","Estimated Duration","Doctor's Remarks","Patient Consent"];
const COLS_DISCHARGE=["Patient Details","Admission Date","Discharge Date","Final Diagnosis","Treatment Summary","Procedures Performed","Condition at Discharge","Medicines on Discharge","Dosage & Duration","Diet / Activity Instructions","Warning Signs","Follow-up Date","Next Appointment","Doctor's Signature","Patient / Attendant Acknowledgement"];

function RecordTab(){
  const [items,save]=useStore("treatment_record");
  const [v,setV]=useState<Record<string,string>>(()=> Object.fromEntries(COLS_RECORD.map(c=>[c,""])));
  const [editing,setEditing]=useState<string|null>(null);
  const [viewing,setViewing]=useState<Entry|null>(null);
  function submit(){
    if(!v["Patient Name / ID"].trim()) return toast.error("Patient Name / ID required");
    if(!v["Diagnosis"].trim()) return toast.error("Diagnosis required");
    if(editing){ save(items.map(x=> x.id===editing? {...x, data:{...v}}:x)); setEditing(null); }
    else save([{id:`REC-${Date.now()}`, createdAt:new Date().toISOString(), data:{...v}},...items]);
    setV(Object.fromEntries(COLS_RECORD.map(c=>[c,""]))); toast.success("Saved");
  }
  return <div className="space-y-4">
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <h3 className="font-semibold text-sm">{editing?"Edit":"New"} Treatment Record Form</h3>
      <div className="grid sm:grid-cols-3 gap-4">
        <div><Label className="text-xs">Patient Name / ID *</Label><Input value={v["Patient Name / ID"]} onChange={e=>setV({...v, ["Patient Name / ID"]:e.target.value})} className="mt-1 h-9"/></div>
        <div><Label className="text-xs">Visit Date & Time</Label><Input type="datetime-local" value={v["Visit Date & Time"]} onChange={e=>setV({...v, ["Visit Date & Time"]:e.target.value})} className="mt-1 h-9"/></div>
        <div><Label className="text-xs">Doctor</Label><Input value={v["Doctor"]} onChange={e=>setV({...v, Doctor:e.target.value})} className="mt-1 h-9"/></div>
      </div>
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
      <div className="grid sm:grid-cols-2 gap-4">
        <div><Label className="text-xs">Follow-up Date</Label><Input type="date" value={v["Follow-up Date"]} onChange={e=>setV({...v, ["Follow-up Date"]:e.target.value})} className="mt-1 h-9"/></div>
        <div><Label className="text-xs">Attachments / Reports</Label><Input value={v["Attachments / Reports"]} onChange={e=>setV({...v, ["Attachments / Reports"]:e.target.value})} placeholder="File names or URLs" className="mt-1 h-9"/></div>
      </div>
      <div className="flex gap-2"><Button onClick={submit} className="h-9 gap-1.5"><Plus className="size-4"/>{editing?"Update":"Save"}</Button>{editing&&<Button variant="outline" className="h-9" onClick={()=>{setEditing(null);setV(Object.fromEntries(COLS_RECORD.map(c=>[c,""])) )}}>Cancel</Button>}</div>
    </div>
    <TableView items={items} cols={COLS_RECORD} onView={setViewing} onEdit={e=>{setV({...e.data});setEditing(e.id)}} onDelete={e=>save(items.filter(x=>x.id!==e.id))}/>
    <Dialog open={!!viewing} onOpenChange={v=>!v&&setViewing(null)}><DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>View Treatment Record</DialogTitle></DialogHeader>{viewing&&<div className="grid sm:grid-cols-2 gap-3 text-sm">{Object.entries(viewing.data).map(([k,v])=><div key={k}><span className="text-muted-foreground text-xs">{k}:</span><div className="font-medium break-words">{String(v)||"—"}</div></div>)}</div>}<DialogFooter><Button variant="outline" onClick={()=>setViewing(null)}>Close</Button></DialogFooter></DialogContent></Dialog>
  </div>
}
function ComplaintTab(){
  const [items,save]=useStore("treatment_complaint");
  const [v,setV]=useState<Record<string,string>>(()=> Object.fromEntries(COLS_COMPLAINT.map(c=>[c,""])));
  const [editing,setEditing]=useState<string|null>(null);
  const [viewing,setViewing]=useState<Entry|null>(null);
  function submit(){
    if(!v["Chief Complaint"].trim()) return toast.error("Chief Complaint required");
    if(editing){ save(items.map(x=> x.id===editing? {...x, data:{...v}}:x)); setEditing(null); }
    else save([{id:`CMP-${Date.now()}`, createdAt:new Date().toISOString(), data:{...v}},...items]);
    setV(Object.fromEntries(COLS_COMPLAINT.map(c=>[c,""]))); toast.success("Saved");
  }
  return <div className="space-y-4">
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <h3 className="font-semibold text-sm">{editing?"Edit":"New"} Complaints Form</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2"><Label className="text-xs">Chief Complaint *</Label><Input value={v["Chief Complaint"]} onChange={e=>setV({...v, ["Chief Complaint"]:e.target.value})} className="mt-1 h-9"/></div>
        <div><Label className="text-xs">Complaint Category</Label><Select value={v["Complaint Category"]} onValueChange={val=>setV({...v, ["Complaint Category"]:val??""})}><SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Select"/></SelectTrigger><SelectContent><SelectItem value="treatment">Treatment</SelectItem><SelectItem value="staff">Staff</SelectItem><SelectItem value="billing">Billing</SelectItem><SelectItem value="facility">Facility</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
        <div><Label className="text-xs">Location</Label><Input value={v["Location"]} onChange={e=>setV({...v, Location:e.target.value})} className="mt-1 h-9"/></div>
        <div><Label className="text-xs">Severity</Label><Select value={v["Severity"]} onValueChange={val=>setV({...v, Severity:val??""})}><SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Select"/></SelectTrigger><SelectContent><SelectItem value="mild">Mild</SelectItem><SelectItem value="moderate">Moderate</SelectItem><SelectItem value="severe">Severe</SelectItem></SelectContent></Select></div>
        <div><Label className="text-xs">Duration</Label><Input value={v["Duration"]} onChange={e=>setV({...v, Duration:e.target.value})} placeholder="e.g. 3 days" className="mt-1 h-9"/></div>
        <div><Label className="text-xs">Onset</Label><Input type="date" value={v["Onset"]} onChange={e=>setV({...v, Onset:e.target.value})} className="mt-1 h-9"/></div>
        <div><Label className="text-xs">Frequency</Label><Select value={v["Frequency"]} onValueChange={val=>setV({...v, Frequency:val??""})}><SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Select"/></SelectTrigger><SelectContent><SelectItem value="once">Once</SelectItem><SelectItem value="intermittent">Intermittent</SelectItem><SelectItem value="continuous">Continuous</SelectItem></SelectContent></Select></div>
        <div><Label className="text-xs">Associated Symptoms</Label><Input value={v["Associated Symptoms"]} onChange={e=>setV({...v, ["Associated Symptoms"]:e.target.value})} className="mt-1 h-9"/></div>
        <div className="sm:col-span-2"><Label className="text-xs">Previous Treatment</Label><Input value={v["Previous Treatment"]} onChange={e=>setV({...v, ["Previous Treatment"]:e.target.value})} className="mt-1 h-9"/></div>
        <div className="sm:col-span-2"><Label className="text-xs">Patient's Description</Label><Textarea value={v["Patient's Description"]} onChange={e=>setV({...v, ["Patient's Description"]:e.target.value})} rows={2}/></div>
        <div className="sm:col-span-2"><Label className="text-xs">Doctor's Observation</Label><Textarea value={v["Doctor's Observation"]} onChange={e=>setV({...v, ["Doctor's Observation"]:e.target.value})} rows={2}/></div>
        <div><Label className="text-xs">Priority</Label><Select value={v["Priority"]} onValueChange={val=>setV({...v, Priority:val??""})}><SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Select"/></SelectTrigger><SelectContent><SelectItem value="Low">Low</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="High">High</SelectItem><SelectItem value="Emergency">Emergency</SelectItem></SelectContent></Select></div>
      </div>
      <div className="flex gap-2"><Button onClick={submit} className="h-9 gap-1.5"><Plus className="size-4"/>{editing?"Update":"Save"}</Button>{editing&&<Button variant="outline" className="h-9" onClick={()=>{setEditing(null);setV(Object.fromEntries(COLS_COMPLAINT.map(c=>[c,""])) )}}>Cancel</Button>}</div>
    </div>
    <TableView items={items} cols={COLS_COMPLAINT} onView={setViewing} onEdit={e=>{setV({...e.data});setEditing(e.id)}} onDelete={e=>save(items.filter(x=>x.id!==e.id))}/>
    <Dialog open={!!viewing} onOpenChange={v=>!v&&setViewing(null)}><DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>View Complaint</DialogTitle></DialogHeader>{viewing&&<div className="grid sm:grid-cols-2 gap-3 text-sm">{Object.entries(viewing.data).map(([k,v])=><div key={k}><span className="text-muted-foreground text-xs">{k}:</span><div className="font-medium break-words">{String(v)||"—"}</div></div>)}</div>}<DialogFooter><Button variant="outline" onClick={()=>setViewing(null)}>Close</Button></DialogFooter></DialogContent></Dialog>
  </div>
}
function PlanTab(){
  const [items,save]=useStore("treatment_plan");
  const [v,setV]=useState<Record<string,string>>(()=> Object.fromEntries(COLS_PLAN.map(c=>[c,""])));
  const [editing,setEditing]=useState<string|null>(null);
  const [viewing,setViewing]=useState<Entry|null>(null);
  function submit(){
    if(!v["Diagnosis / Clinical Impression"].trim()) return toast.error("Diagnosis required");
    if(editing){ save(items.map(x=> x.id===editing? {...x, data:{...v}}:x)); setEditing(null); }
    else save([{id:`PLAN-${Date.now()}`, createdAt:new Date().toISOString(), data:{...v}},...items]);
    setV(Object.fromEntries(COLS_PLAN.map(c=>[c,""]))); toast.success("Saved");
  }
  return <div className="space-y-4">
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <h3 className="font-semibold text-sm">{editing?"Edit":"New"} Treatment Plan Form</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2"><Label className="text-xs">Diagnosis / Clinical Impression *</Label><Input value={v["Diagnosis / Clinical Impression"]} onChange={e=>setV({...v, ["Diagnosis / Clinical Impression"]:e.target.value})} className="mt-1 h-9"/></div>
        <div className="sm:col-span-2"><Label className="text-xs">Treatment Objective</Label><Input value={v["Treatment Objective"]} onChange={e=>setV({...v, ["Treatment Objective"]:e.target.value})} className="mt-1 h-9"/></div>
        <div className="sm:col-span-2"><Label className="text-xs">Planned Treatment</Label><Textarea value={v["Planned Treatment"]} onChange={e=>setV({...v, ["Planned Treatment"]:e.target.value})} rows={2}/></div>
        <div><Label className="text-xs">Procedures Required</Label><Textarea value={v["Procedures Required"]} onChange={e=>setV({...v, ["Procedures Required"]:e.target.value})} rows={2}/></div>
        <div><Label className="text-xs">Medicines</Label><Textarea value={v["Medicines"]} onChange={e=>setV({...v, Medicines:e.target.value})} rows={2}/></div>
        <div><Label className="text-xs">Investigations / Tests</Label><Input value={v["Investigations / Tests"]} onChange={e=>setV({...v, ["Investigations / Tests"]:e.target.value})} className="mt-1 h-9"/></div>
        <div><Label className="text-xs">Lifestyle / Care Instructions</Label><Textarea value={v["Lifestyle / Care Instructions"]} onChange={e=>setV({...v, ["Lifestyle / Care Instructions"]:e.target.value})} rows={2}/></div>
        <div><Label className="text-xs">Expected Outcome</Label><Input value={v["Expected Outcome"]} onChange={e=>setV({...v, ["Expected Outcome"]:e.target.value})} className="mt-1 h-9"/></div>
        <div><Label className="text-xs">Follow-up Schedule</Label><Input value={v["Follow-up Schedule"]} onChange={e=>setV({...v, ["Follow-up Schedule"]:e.target.value})} placeholder="e.g. Weekly for 4 weeks" className="mt-1 h-9"/></div>
        <div><Label className="text-xs">Estimated Duration</Label><Input value={v["Estimated Duration"]} onChange={e=>setV({...v, ["Estimated Duration"]:e.target.value})} placeholder="e.g. 6 weeks" className="mt-1 h-9"/></div>
        <div className="sm:col-span-2"><Label className="text-xs">Doctor's Remarks</Label><Textarea value={v["Doctor's Remarks"]} onChange={e=>setV({...v, ["Doctor's Remarks"]:e.target.value})} rows={2}/></div>
        <div><Label className="text-xs">Patient Consent</Label><Select value={v["Patient Consent"]} onValueChange={val=>setV({...v, ["Patient Consent"]:val??""})}><SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Select"/></SelectTrigger><SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem><SelectItem value="Pending">Pending</SelectItem></SelectContent></Select></div>
      </div>
      <div className="flex gap-2"><Button onClick={submit} className="h-9 gap-1.5"><Plus className="size-4"/>{editing?"Update":"Save"}</Button>{editing&&<Button variant="outline" className="h-9" onClick={()=>{setEditing(null);setV(Object.fromEntries(COLS_PLAN.map(c=>[c,""])) )}}>Cancel</Button>}</div>
    </div>
    <TableView items={items} cols={COLS_PLAN} onView={setViewing} onEdit={e=>{setV({...e.data});setEditing(e.id)}} onDelete={e=>save(items.filter(x=>x.id!==e.id))}/>
    <Dialog open={!!viewing} onOpenChange={v=>!v&&setViewing(null)}><DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>View Treatment Plan</DialogTitle></DialogHeader>{viewing&&<div className="grid sm:grid-cols-2 gap-3 text-sm">{Object.entries(viewing.data).map(([k,v])=><div key={k}><span className="text-muted-foreground text-xs">{k}:</span><div className="font-medium break-words">{String(v)||"—"}</div></div>)}</div>}<DialogFooter><Button variant="outline" onClick={()=>setViewing(null)}>Close</Button></DialogFooter></DialogContent></Dialog>
  </div>
}
function DischargeTab(){
  const [items,save]=useStore("treatment_discharge");
  const [v,setV]=useState<Record<string,string>>(()=> Object.fromEntries(COLS_DISCHARGE.map(c=>[c,""])));
  const [editing,setEditing]=useState<string|null>(null);
  const [viewing,setViewing]=useState<Entry|null>(null);
  function submit(){
    if(!v["Patient Details"].trim()) return toast.error("Patient Details required");
    if(editing){ save(items.map(x=> x.id===editing? {...x, data:{...v}}:x)); setEditing(null); }
    else save([{id:`DIS-${Date.now()}`, createdAt:new Date().toISOString(), data:{...v}},...items]);
    setV(Object.fromEntries(COLS_DISCHARGE.map(c=>[c,""]))); toast.success("Saved");
  }
  return <div className="space-y-4">
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <h3 className="font-semibold text-sm">{editing?"Edit":"New"} Discharge Form</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2"><Label className="text-xs">Patient Details *</Label><Input value={v["Patient Details"]} onChange={e=>setV({...v, ["Patient Details"]:e.target.value})} placeholder="Name, age, UHID" className="mt-1 h-9"/></div>
        <div><Label className="text-xs">Admission Date</Label><Input type="date" value={v["Admission Date"]} onChange={e=>setV({...v, ["Admission Date"]:e.target.value})} className="mt-1 h-9"/></div>
        <div><Label className="text-xs">Discharge Date</Label><Input type="date" value={v["Discharge Date"]} onChange={e=>setV({...v, ["Discharge Date"]:e.target.value})} className="mt-1 h-9"/></div>
        <div className="sm:col-span-2"><Label className="text-xs">Final Diagnosis</Label><Input value={v["Final Diagnosis"]} onChange={e=>setV({...v, ["Final Diagnosis"]:e.target.value})} className="mt-1 h-9"/></div>
        <div className="sm:col-span-2"><Label className="text-xs">Treatment Summary</Label><Textarea value={v["Treatment Summary"]} onChange={e=>setV({...v, ["Treatment Summary"]:e.target.value})} rows={2}/></div>
        <div className="sm:col-span-2"><Label className="text-xs">Procedures Performed</Label><Textarea value={v["Procedures Performed"]} onChange={e=>setV({...v, ["Procedures Performed"]:e.target.value})} rows={2}/></div>
        <div><Label className="text-xs">Condition at Discharge</Label><Select value={v["Condition at Discharge"]} onValueChange={val=>setV({...v, ["Condition at Discharge"]:val??""})}><SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Select"/></SelectTrigger><SelectContent><SelectItem value="Stable">Stable</SelectItem><SelectItem value="Improved">Improved</SelectItem><SelectItem value="Critical">Critical</SelectItem></SelectContent></Select></div>
        <div><Label className="text-xs">Medicines on Discharge</Label><Textarea value={v["Medicines on Discharge"]} onChange={e=>setV({...v, ["Medicines on Discharge"]:e.target.value})} rows={2}/></div>
        <div><Label className="text-xs">Dosage & Duration</Label><Input value={v["Dosage & Duration"]} onChange={e=>setV({...v, ["Dosage & Duration"]:e.target.value})} className="mt-1 h-9"/></div>
        <div className="sm:col-span-2"><Label className="text-xs">Diet / Activity Instructions</Label><Textarea value={v["Diet / Activity Instructions"]} onChange={e=>setV({...v, ["Diet / Activity Instructions"]:e.target.value})} rows={2}/></div>
        <div className="sm:col-span-2"><Label className="text-xs">Warning Signs</Label><Textarea value={v["Warning Signs"]} onChange={e=>setV({...v, ["Warning Signs"]:e.target.value})} rows={2}/></div>
        <div><Label className="text-xs">Follow-up Date</Label><Input type="date" value={v["Follow-up Date"]} onChange={e=>setV({...v, ["Follow-up Date"]:e.target.value})} className="mt-1 h-9"/></div>
        <div><Label className="text-xs">Next Appointment</Label><Input type="datetime-local" value={v["Next Appointment"]} onChange={e=>setV({...v, ["Next Appointment"]:e.target.value})} className="mt-1 h-9"/></div>
        <div><Label className="text-xs">Doctor's Signature</Label><Input value={v["Doctor's Signature"]} onChange={e=>setV({...v, ["Doctor's Signature"]:e.target.value})} placeholder="Dr. Name" className="mt-1 h-9"/></div>
        <div><Label className="text-xs">Patient / Attendant Acknowledgement</Label><Select value={v["Patient / Attendant Acknowledgement"]} onValueChange={val=>setV({...v, ["Patient / Attendant Acknowledgement"]:val??""})}><SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Select"/></SelectTrigger><SelectContent><SelectItem value="Acknowledged">Acknowledged</SelectItem><SelectItem value="Pending">Pending</SelectItem></SelectContent></Select></div>
      </div>
      <div className="flex gap-2"><Button onClick={submit} className="h-9 gap-1.5"><Plus className="size-4"/>{editing?"Update":"Save"}</Button>{editing&&<Button variant="outline" className="h-9" onClick={()=>{setEditing(null);setV(Object.fromEntries(COLS_DISCHARGE.map(c=>[c,""])) )}}>Cancel</Button>}</div>
    </div>
    <TableView items={items} cols={COLS_DISCHARGE} onView={setViewing} onEdit={e=>{setV({...e.data});setEditing(e.id)}} onDelete={e=>save(items.filter(x=>x.id!==e.id))}/>
    <Dialog open={!!viewing} onOpenChange={v=>!v&&setViewing(null)}><DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>View Discharge</DialogTitle></DialogHeader>{viewing&&<div className="grid sm:grid-cols-2 gap-3 text-sm">{Object.entries(viewing.data).map(([k,v])=><div key={k}><span className="text-muted-foreground text-xs">{k}:</span><div className="font-medium break-words">{String(v)||"—"}</div></div>)}</div>}<DialogFooter><Button variant="outline" onClick={()=>setViewing(null)}>Close</Button></DialogFooter></DialogContent></Dialog>
  </div>
}
