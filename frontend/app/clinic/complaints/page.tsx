"use client";
import { useState, useMemo } from "react";
import { useRequireRole } from "@/hooks/use-clinic-session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Search, HeartPulse, ClipboardList, ShieldCheck, FileText, MessageSquare } from "lucide-react";

type Status = "open" | "in_review" | "resolved" | "closed";
const MOCK = [
  { id: "CMP-1024", patient: "Priya S.", category: "treatment", title: "Pain after procedure not addressed", severity: "high", status: "open" as Status, date: "2026-08-28" },
  { id: "CMP-1022", patient: "Anonymous", category: "waiting", title: "Long waiting time", severity: "medium", status: "in_review" as Status, date: "2026-08-24" },
  { id: "CMP-1019", patient: "Rahul K.", category: "staff", title: "Reception was rude", severity: "low", status: "resolved" as Status, date: "2026-08-20" },
];

export default function TreatmentHubPage() {
  useRequireRole("owner" as any);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [rows, setRows] = useState(MOCK);
  const filtered = useMemo(()=> rows.filter(r=>{
    if(filter!=="all" && r.status!==filter) return false;
    if(q && !`${r.id} ${r.patient} ${r.title}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }),[q,filter,rows]);

  function setStatus(id: string, s: Status){
    setRows(rs=> rs.map(r=> r.id===id? {...r, status:s}: r));
    toast.success(`Marked ${id} as ${s}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="relative overflow-hidden rounded-[20px] border border-purple-100 bg-gradient-to-br from-violet-50 via-indigo-50 to-white p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white"><HeartPulse className="size-5" /></span>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Treatment</h1>
            <p className="text-xs text-muted-foreground">Complaints, treatment plans, consent & discharge — one hub. Mock data until backend wired to <code>clc_complaints</code> etc.</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="complaints">
        <TabsList>
          <TabsTrigger value="complaints" className="gap-1.5"><MessageSquare className="size-4" />Complaints</TabsTrigger>
          <TabsTrigger value="plans" className="gap-1.5"><ClipboardList className="size-4" />Treatment Plans</TabsTrigger>
          <TabsTrigger value="consent" className="gap-1.5"><ShieldCheck className="size-4" />Consent Forms</TabsTrigger>
          <TabsTrigger value="discharge" className="gap-1.5"><FileText className="size-4" />Discharge</TabsTrigger>
        </TabsList>

        <TabsContent value="complaints" className="space-y-4 mt-4">
          <div className="rounded-xl border bg-card p-4 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search ID, patient, subject..." className="pl-9 h-9" />
            </div>
            <Select value={filter} onValueChange={(v) => setFilter(v ?? "all")}>
              <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_review">In review</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <span className="ml-auto flex gap-2 text-xs">
              <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-amber-500" /> {rows.filter(r=>r.status==="open").length} open</span>
              <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-blue-500" /> {rows.filter(r=>r.status==="in_review").length} in review</span>
            </span>
          </div>
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader><TableRow className="bg-muted/40"><TableHead>ID</TableHead><TableHead>Patient</TableHead><TableHead>Category</TableHead><TableHead>Subject</TableHead><TableHead>Severity</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.map(r=> (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.id}</TableCell>
                    <TableCell className="text-sm">{r.patient}</TableCell>
                    <TableCell><Badge variant="outline" className="rounded-full text-[11px] capitalize">{r.category}</Badge></TableCell>
                    <TableCell className="max-w-[260px] truncate text-sm">{r.title}</TableCell>
                    <TableCell><Badge variant="outline" className={r.severity==="high"?"bg-red-50 text-red-700 border-red-200": r.severity==="medium"?"bg-amber-50 text-amber-700 border-amber-200":"bg-zinc-50 text-zinc-600 border-zinc-200"}>{r.severity}</Badge></TableCell>
                    <TableCell>
                      <Select value={r.status} onValueChange={v=> setStatus(r.id, v as Status)}>
                        <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="open">open</SelectItem><SelectItem value="in_review">in_review</SelectItem><SelectItem value="resolved">resolved</SelectItem><SelectItem value="closed">closed</SelectItem></SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right"><Button size="sm" variant="ghost" onClick={()=> toast.info("Respond — wire to backend")}>Respond</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filtered.length===0 && <p className="p-8 text-center text-sm text-muted-foreground">No complaints match filters.</p>}
          </div>
        </TabsContent>

        <TabsContent value="plans" className="mt-4">
          <TreatmentPlanForm />
        </TabsContent>
        <TabsContent value="consent" className="mt-4">
          <ConsentForm />
        </TabsContent>
        <TabsContent value="discharge" className="mt-4">
          <DischargeForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TreatmentPlanForm(){
  const [v,setV]=useState({patient:"", diagnosis:"", plan:"", duration:"", followUp:""});
  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <h3 className="font-semibold text-sm">Treatment Plan</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div><Label className="text-xs">Patient *</Label><Input value={v.patient} onChange={e=>setV({...v,patient:e.target.value})} placeholder="Patient name / ID" className="mt-1 h-9" /></div>
        <div><Label className="text-xs">Diagnosis</Label><Input value={v.diagnosis} onChange={e=>setV({...v,diagnosis:e.target.value})} placeholder="e.g. Acute bronchitis" className="mt-1 h-9" /></div>
      </div>
      <div><Label className="text-xs">Plan / Prescription</Label><Textarea value={v.plan} onChange={e=>setV({...v,plan:e.target.value})} rows={4} placeholder="Medications, procedures, lifestyle advice..." className="mt-1" /></div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div><Label className="text-xs">Duration</Label><Input value={v.duration} onChange={e=>setV({...v,duration:e.target.value})} placeholder="e.g. 7 days" className="mt-1 h-9" /></div>
        <div><Label className="text-xs">Follow-up date</Label><Input type="date" value={v.followUp} onChange={e=>setV({...v,followUp:e.target.value})} className="mt-1 h-9" /></div>
      </div>
      <Button onClick={()=> toast.success("Treatment plan saved (mock)")} className="h-9">Save plan</Button>
    </div>
  );
}
function ConsentForm(){
  const [v,setV]=useState({patient:"", procedure:"", risks:"", consent:false});
  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <h3 className="font-semibold text-sm">Consent Form</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div><Label className="text-xs">Patient *</Label><Input value={v.patient} onChange={e=>setV({...v,patient:e.target.value})} placeholder="Patient name" className="mt-1 h-9" /></div>
        <div><Label className="text-xs">Procedure *</Label><Input value={v.procedure} onChange={e=>setV({...v,procedure:e.target.value})} placeholder="e.g. Minor surgery / injection" className="mt-1 h-9" /></div>
      </div>
      <div><Label className="text-xs">Risks & benefits explained</Label><Textarea value={v.risks} onChange={e=>setV({...v,risks:e.target.value})} rows={3} placeholder="Describe risks, alternatives, and consent discussion..." className="mt-1" /></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.consent} onChange={e=>setV({...v,consent:e.target.checked})} /> Patient/guardian consents</label>
      <Button onClick={()=> { if(!v.consent) return toast.error("Consent checkbox required"); toast.success("Consent recorded (mock)");}} className="h-9">Record consent</Button>
    </div>
  );
}
function DischargeForm(){
  const [v,setV]=useState({patient:"", summary:"", instructions:"", date:""});
  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <h3 className="font-semibold text-sm">Discharge Summary</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div><Label className="text-xs">Patient *</Label><Input value={v.patient} onChange={e=>setV({...v,patient:e.target.value})} placeholder="Patient name" className="mt-1 h-9" /></div>
        <div><Label className="text-xs">Discharge date</Label><Input type="date" value={v.date} onChange={e=>setV({...v,date:e.target.value})} className="mt-1 h-9" /></div>
      </div>
      <div><Label className="text-xs">Summary</Label><Textarea value={v.summary} onChange={e=>setV({...v,summary:e.target.value})} rows={3} placeholder="Course in hospital, treatment given..." className="mt-1" /></div>
      <div><Label className="text-xs">Home instructions</Label><Textarea value={v.instructions} onChange={e=>setV({...v,instructions:e.target.value})} rows={3} placeholder="Meds, diet, follow-up, warning signs..." className="mt-1" /></div>
      <Button onClick={()=> toast.success("Discharge summary saved (mock)")} className="h-9">Save discharge</Button>
    </div>
  );
}
