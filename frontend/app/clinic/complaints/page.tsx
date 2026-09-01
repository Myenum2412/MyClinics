"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import { listRecords, listPatients, listDoctors, type MedicineRecord, type Patient, type Doctor } from "@/lib/clinic-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { PersonAvatar } from "@/components/clinic/person-avatar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import dynamic from "next/dynamic";
import { formatDate } from "@/lib/format-time";
import { HeartPulse, Search, ClipboardList, ShieldCheck, FileText, MessageSquare, RefreshCw, Plus } from "lucide-react";

const StatsBilling = dynamic(() => import("@/components/stats-billing"), { loading: () => <div className="h-[120px]" aria-hidden /> });

export default function TreatmentPage() {
  // Fix redirect: allow any clinic role (staff=2 is minimum for sidebar); was "owner" which doesn't exist -> can() failed -> redirect to /clinic
  const session = useRequireRole("staff" as any);
  const clinicId = session?.clinicId ?? "";
  const [records, setRecords] = useState<MedicineRecord[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const patientMap = useMemo(() => { const m = new Map<string, Patient>(); patients.forEach(p => m.set(p.patientId, p)); return m; }, [patients]);
  const doctorMap = useMemo(() => { const m = new Map<string, Doctor>(); doctors.forEach(d => m.set(d.doctorId, d)); return m; }, [doctors]);

  const load = useCallback(() => {
    if (!clinicId) return;
    setLoading(true);
    Promise.allSettled([listRecords(clinicId, { limit: 100 }), listPatients(clinicId, { limit: 100 }), listDoctors(clinicId, { limit: 100 })])
      .then(([r, p, d]) => {
        if (r.status === "fulfilled") setRecords(r.value.items);
        else toast.error("Failed to load treatments");
        if (p.status === "fulfilled") setPatients(p.value.items);
        if (d.status === "fulfilled") setDoctors(d.value.items);
      }).finally(() => setLoading(false));
  }, [clinicId]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let list = [...records];
    if (q.trim()) {
      const qq = q.toLowerCase();
      list = list.filter(r => {
        const pn = patientMap.get(r.patientId)?.fullName.toLowerCase() ?? "";
        const dn = doctorMap.get(r.doctorId)?.name.toLowerCase() ?? "";
        return r.diagnosis.toLowerCase().includes(qq) || (r.treatment ?? "").toLowerCase().includes(qq) || pn.includes(qq) || dn.includes(qq);
      });
    }
    return list;
  }, [records, q, patientMap, doctorMap]);

  const paged = useMemo(() => filtered.slice(page * pageSize, page * pageSize + pageSize), [filtered, page]);
  const pageCount = Math.ceil(filtered.length / pageSize);

  // Stats-like bills for header card (reuse billing stats shape)
  const billsLike = useMemo(() => filtered.map(r => ({ total: 0, status: "paid" as const, paymentStatus: "paid" as const, balanceDue: 0 } as any)), [filtered]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header hero */}
      <div className="relative overflow-hidden rounded-[20px] border border-purple-100 bg-gradient-to-br from-violet-50 via-indigo-50 to-white p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white"><HeartPulse className="size-5" /></span>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Treatment</h1>
            <p className="text-xs text-muted-foreground">Real treatment records from medical records • Complaints & forms</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="records">
        <TabsList>
          <TabsTrigger value="records" className="gap-1.5"><ClipboardList className="size-4" />Records</TabsTrigger>
          <TabsTrigger value="complaints" className="gap-1.5"><MessageSquare className="size-4" />Complaints</TabsTrigger>
          <TabsTrigger value="plans" className="gap-1.5"><ClipboardList className="size-4" />Treatment Plans</TabsTrigger>
          <TabsTrigger value="consent" className="gap-1.5"><ShieldCheck className="size-4" />Consent</TabsTrigger>
          <TabsTrigger value="discharge" className="gap-1.5"><FileText className="size-4" />Discharge</TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="space-y-4 mt-4">
          {/* Section card like /clinic/appointments StatsAppointments — search + actions */}
          {!loading && (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Treatment Records</h3>
                  <p className="text-xs text-muted-foreground">{filtered.length} records • from medicine API</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input value={q} onChange={e => { setQ(e.target.value); setPage(0); }} placeholder="Search diagnosis, treatment, patient..." className="pl-9 h-9" />
                  </div>
                  <Select value={statusFilter} onValueChange={v => setStatusFilter(v ?? "all")}>
                    <SelectTrigger className="h-9 w-32"><SelectValue placeholder="Filter" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All</SelectItem></SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={load} className="h-9 gap-1.5"><RefreshCw className="size-3.5" />Sync</Button>
                </div>
              </div>
            </div>
          )}

          {/* Table like /clinic/appointments — Card + Table + Pagination */}
          <Card className="shadow-sm">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
              ) : filtered.length === 0 ? (
                <div className="py-16 text-center">
                  <ClipboardList className="size-10 mx-auto text-muted-foreground/40" />
                  <p className="mt-3 text-sm font-medium text-muted-foreground">No treatment records found.</p>
                  <p className="text-xs text-muted-foreground">Create via Medicine / Medical Record first.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                        <TableHead>Patient</TableHead>
                        <TableHead>Doctor</TableHead>
                        <TableHead>Diagnosis</TableHead>
                        <TableHead>Treatment</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paged.map(r => {
                        const p = patientMap.get(r.patientId);
                        const d = doctorMap.get(r.doctorId);
                        return (
                          <TableRow key={r.recordId} className="hover:bg-muted/30">
                            <TableCell>
                              <div className="flex items-center gap-2.5">
                                <PersonAvatar clinicId={clinicId} ownerType="patient" ownerId={r.patientId} name={p?.fullName ?? r.patientId} />
                                <span className="text-xs font-semibold">{p?.fullName ?? r.patientId}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">{d?.name ?? r.doctorId}</TableCell>
                            <TableCell className="max-w-[220px] truncate text-xs">{r.diagnosis}</TableCell>
                            <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">{r.treatment ?? "—"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatDate(r.visitDate)}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline" className="rounded-full text-[11px]">{r.symptoms ? "Has symptoms" : "—"}</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
            {!loading && filtered.length > 0 && (
              <Pagination page={page + 1} pageSize={pageSize} totalItems={filtered.length} onPageChange={p => setPage(Math.max(0, Math.min(p - 1, pageCount - 1)))} itemLabel="records" />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="complaints" className="mt-4">
          <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
            <MessageSquare className="size-8 mx-auto mb-2 opacity-40" />
            Complaints — wire to <code>clc_complaints</code> next. Patient side at <code>/clinic/patient/complaints</code> already live.
          </div>
        </TabsContent>
        <TabsContent value="plans" className="mt-4"><TreatmentPlanForm /></TabsContent>
        <TabsContent value="consent" className="mt-4"><ConsentForm /></TabsContent>
        <TabsContent value="discharge" className="mt-4"><DischargeForm /></TabsContent>
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
      <div><Label className="text-xs">Risks & benefits explained</Label><Textarea value={v.risks} onChange={e=>setV({...v,risks:e.target.value})} rows={3} placeholder="Describe risks, alternatives..." className="mt-1" /></div>
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
      <div><Label className="text-xs">Home instructions</Label><Textarea value={v.instructions} onChange={e=>setV({...v,instructions:e.target.value})} rows={3} placeholder="Meds, diet, follow-up..." className="mt-1" /></div>
      <Button onClick={()=> toast.success("Discharge summary saved (mock)")} className="h-9">Save discharge</Button>
    </div>
  );
}
