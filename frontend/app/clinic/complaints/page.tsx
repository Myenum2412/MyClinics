"use client";
import { useState, useMemo } from "react";
import { useRequireRole } from "@/hooks/use-clinic-session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Clock, Search, Filter } from "lucide-react";

type Status = "open" | "in_review" | "resolved" | "closed";
const MOCK = [
  { id: "CMP-1024", patient: "Priya S.", category: "treatment", title: "Pain after procedure not addressed", severity: "high", status: "open" as Status, date: "2026-08-28" },
  { id: "CMP-1022", patient: "Anonymous", category: "waiting", title: "Long waiting time", severity: "medium", status: "in_review" as Status, date: "2026-08-24" },
  { id: "CMP-1019", patient: "Rahul K.", category: "staff", title: "Reception was rude", severity: "low", status: "resolved" as Status, date: "2026-08-20" },
];

export default function ClinicComplaintsPage() {
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Patient Complaints</h1>
        <p className="text-sm text-muted-foreground">Triage treatment & experience complaints — SLA 48h. Data shown is mock until backend is wired.</p>
      </div>

      <div className="rounded-xl border bg-card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search ID, patient, subject..." className="pl-9 h-9" />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v ?? "all")}>
          <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Status" /></SelectTrigger>
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
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>ID</TableHead><TableHead>Patient</TableHead><TableHead>Category</TableHead><TableHead>Subject</TableHead><TableHead>Severity</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(r=> (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.id}</TableCell>
                <TableCell className="text-sm">{r.patient}</TableCell>
                <TableCell><Badge variant="outline" className="rounded-full text-[11px] capitalize">{r.category}</Badge></TableCell>
                <TableCell className="max-w-[260px] truncate text-sm">{r.title}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={r.severity==="high"?"bg-red-50 text-red-700 border-red-200": r.severity==="medium"?"bg-amber-50 text-amber-700 border-amber-200":"bg-zinc-50 text-zinc-600 border-zinc-200"}>{r.severity}</Badge>
                </TableCell>
                <TableCell>
                  <Select value={r.status} onValueChange={v=> setStatus(r.id, v as Status)}>
                    <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">open</SelectItem>
                      <SelectItem value="in_review">in_review</SelectItem>
                      <SelectItem value="resolved">resolved</SelectItem>
                      <SelectItem value="closed">closed</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right"><Button size="sm" variant="ghost" onClick={()=> toast.info("Add response / notes — wire to backend")}>Respond</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length===0 && <p className="p-8 text-center text-sm text-muted-foreground">No complaints match filters.</p>}
      </div>
      <p className="text-xs text-muted-foreground flex items-center gap-1"><Filter className="size-3" /> Tip: connect to <code>clc_complaints</code> collection + audit log on status change.</p>
    </div>
  );
}
