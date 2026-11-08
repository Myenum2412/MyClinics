"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listPatients, listDoctors, listAppointments, updateAppointment, deleteAppointment, type Patient, type Doctor, type Appointment, type AppointmentStatus } from "@/lib/clinic-api";
import { useRequireRole } from "@/hooks/use-clinic-session";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pencil, Trash2 } from "lucide-react";


export default function QuickAddPage(){
  const session = useRequireRole("staff" as any);
  const clinicId = session?.clinicId ?? "";
  const [patients,setPatients]=useState<Patient[]>([]);
  const [doctors,setDoctors]=useState<Doctor[]>([]);
  const [sharedPatient,setSharedPatient]=useState("");
  const [sharedDoctor,setSharedDoctor]=useState("");
  const [appointments,setAppointments]=useState<Appointment[]>([]);
  const [savingStatusId,setSavingStatusId]=useState<string | null>(null);
  // Optimistic status change: paint immediately, revert only if the API rejects it.
  async function changeAppointmentStatus(id:string, status:AppointmentStatus, previous:AppointmentStatus){
    if(id===savingStatusId) return;
    setAppointments(prev=>prev.map(a=>a.appointmentId===id?{...a,status}:a));
    setSavingStatusId(id);
    try{
      await updateAppointment(clinicId,id,{status});
      toast.success("Status updated");
    }catch(err){
      setAppointments(prev=>prev.map(a=>a.appointmentId===id?{...a,status:previous}:a));
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }finally{
      setSavingStatusId(null);
    }
  }

  // ── Appointment selection / edit / delete ────────────────────────────────
  const [selectedApptIds,setSelectedApptIds]=useState<Set<string>>(new Set());
  const [apptDeleteTarget,setApptDeleteTarget]=useState<string[]|null>(null);
  const [editAppt,setEditAppt]=useState<Appointment|null>(null);
  const [editApptForm,setEditApptForm]=useState({doctorId:"",date:"",time:"",reason:""});
  const [savingAppt,setSavingAppt]=useState(false);

  function openEditAppt(a:Appointment){
    setEditAppt(a);
    setEditApptForm({doctorId:a.doctorId,date:a.date,time:a.time,reason:a.reason ?? ""});
  }

  async function saveApptEdit(){
    if(!editAppt) return;
    const {doctorId,date,time,reason}=editApptForm;
    if(!doctorId || !date || !time){ toast.error("Doctor, date and time are required"); return; }
    setSavingAppt(true);
    try{
      const updated = await updateAppointment(clinicId, editAppt.appointmentId, {
        doctorId, date, time, reason: reason.trim() || null,
      });
      setAppointments(prev=>prev.map(a=>a.appointmentId===editAppt.appointmentId?{
        ...a,
        doctorId,
        date,
        time,
        reason: reason.trim() || null,
        status: updated.status,
        tokenNumber: updated.tokenNumber ?? a.tokenNumber,
        session: updated.session ?? a.session,
      }:a));
      toast.success("Appointment updated");
      setEditAppt(null);
    }catch(err){
      toast.error(err instanceof Error ? err.message : "Failed to update appointment");
    }finally{
      setSavingAppt(false);
    }
  }

  async function deleteAppointments(ids:string[]){
    if(ids.length===0) return;
    const results = await Promise.allSettled(ids.map(id=>deleteAppointment(clinicId,id)));
    const deleted = ids.filter((_,i)=>results[i].status==="fulfilled");
    if(deleted.length){
      setAppointments(prev=>prev.filter(a=>!deleted.includes(a.appointmentId)));
      setSelectedApptIds(prev=>{
        const next=new Set(prev);
        deleted.forEach(id=>next.delete(id));
        return next;
      });
      toast.success(deleted.length===1?"Appointment deleted":`${deleted.length} appointments deleted`);
    }
    const failed = ids.length - deleted.length;
    if(failed) toast.error(`${failed} appointment${failed===1?"":"s"} could not be deleted`);
  }
  useEffect(()=>{ if(!clinicId) return; listPatients(clinicId,{limit:100}).then(r=>setPatients((r as any)?.items ?? [])).catch(()=>{}); listDoctors(clinicId,{limit:100}).then(r=>setDoctors((r as any)?.items ?? [])).catch(()=>{}); listAppointments(clinicId,{limit:100}).then(r=>setAppointments((r as any)?.items ?? [])).catch(()=>{}); },[clinicId]);
  // auto-show doctor when patient selected
  const onSharedPatient=(name:string)=>{
    setSharedPatient(name);
    const p=patients.find(x=>x.fullName===name);
    if(p?.doctorId){
      const doc=doctors.find(d=>d.doctorId===p.doctorId);
      if(doc) setSharedDoctor(doc.name);
    }
  };

  // Shared patient/doctor live only in the header above — sections reuse them,
  // so no per-section patient/doctor mirrors.

  const optimized = sharedPatient && sharedDoctor;

  return (
    <div className="flex flex-col gap-6">
      {/* Premium header — patient optimized */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-violet-500/5 p-6">
        <h1 className="text-lg font-semibold tracking-tight">Quick Add — Appointments</h1>
        <p className="mt-1 text-sm text-muted-foreground">Select patient — doctor auto-shows. Status changes apply instantly.</p>
        <div className="mt-4 grid sm:grid-cols-2 gap-4">
          <div><Label className="text-xs">Patient *</Label><select value={sharedPatient} onChange={e=>onSharedPatient(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="">Select patient</option>{patients.map(p=><option key={p.patientId} value={p.fullName}>{p.fullName}</option>)}</select></div>
          <div><Label className="text-xs">Doctor (auto)</Label><Input value={sharedDoctor} readOnly placeholder="Auto from patient" className="mt-1 h-10 bg-muted"/></div>
        </div>
        {optimized && <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Optimized: {sharedPatient} · {sharedDoctor}</p>}
      </div>

      {/* 1 Appointments — table, status only */}
      <Card className="rounded-2xl"><CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2">1. Appointments — select to change status {optimized && <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-normal">{sharedPatient} · {sharedDoctor}</span>}</CardTitle></CardHeader><CardContent>
        {(() => {
          const pid = patients.find(p=>p.fullName===sharedPatient)?.patientId;
          const appts = pid ? appointments.filter(a=>a.patientId===pid) : [];
          if(!sharedPatient) return <p className="text-sm text-muted-foreground">Select patient above to see appointments.</p>;
          if(appts.length===0) return <p className="text-sm text-muted-foreground">No appointments for this patient.</p>;
          const visibleIds = appts.map(a=>a.appointmentId);
          const selectedVisible = visibleIds.filter(id=>selectedApptIds.has(id));
          const allSelected = visibleIds.length>0 && selectedVisible.length===visibleIds.length;
          const toggleAll = () => setSelectedApptIds(prev=>{
            const next=new Set(prev);
            if(allSelected) visibleIds.forEach(id=>next.delete(id));
            else visibleIds.forEach(id=>next.add(id));
            return next;
          });
          const toggleOne = (id:string) => setSelectedApptIds(prev=>{
            const next=new Set(prev);
            if(next.has(id)) next.delete(id); else next.add(id);
            return next;
          });
          return (
            <>
              {selectedVisible.length>0 && (
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
                  <span className="text-xs font-semibold text-destructive">{selectedVisible.length} selected</span>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={()=>setSelectedApptIds(new Set())}>Clear</Button>
                    <Button variant="outline" size="sm" className="h-7 gap-1.5 border-destructive/30 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={()=>setApptDeleteTarget(selectedVisible)}>
                      <Trash2 className="size-3.5"/> Delete selected
                    </Button>
                  </div>
                </div>
              )}
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-xs">
                    <tr>
                      <th className="w-8 p-2">
                        <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all appointments"/>
                      </th>
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-left">Time</th>
                      <th className="p-2 text-left">Doctor</th>
                      <th className="p-2 text-left">Reason</th>
                      <th className="p-2 text-left">Status</th>
                      <th className="p-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appts.map(a=>{
                      const doctorLabel = a.doctorName || doctors.find(d=>d.doctorId===a.doctorId)?.name || "—";
                      return (
                        <tr key={a.appointmentId} className="border-t align-middle">
                          <td className="p-2">
                            <Checkbox checked={selectedApptIds.has(a.appointmentId)} onCheckedChange={()=>toggleOne(a.appointmentId)} aria-label={`Select appointment ${a.date} ${a.time}`}/>
                          </td>
                          <td className="whitespace-nowrap p-2">{a.date}</td>
                          <td className="whitespace-nowrap p-2">{a.time}</td>
                          <td className="p-2">{doctorLabel}</td>
                          <td className="max-w-[200px] truncate p-2">{a.reason || "—"}</td>
                          <td className="p-2">
                            <select value={a.status} disabled={savingStatusId===a.appointmentId} onChange={e=>changeAppointmentStatus(a.appointmentId, e.target.value as AppointmentStatus, a.status)} className="h-7 rounded-lg border bg-card px-2 text-xs disabled:opacity-60">
                              <option value="scheduled">Scheduled</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                              <option value="no_show">No Show</option>
                              <option value="rescheduled">Rescheduled</option>
                            </select>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={()=>openEditAppt(a)}><Pencil className="size-3"/> Edit</Button>
                              <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={()=>setApptDeleteTarget([a.appointmentId])}><Trash2 className="size-3"/> Delete</Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          );
        })()}
      </CardContent></Card>


      {/* Edit appointment */}
      <Dialog open={!!editAppt} onOpenChange={(open)=>{ if(!open) setEditAppt(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit appointment</DialogTitle>
            <DialogDescription>Change the doctor, slot or reason for this appointment.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="text-xs">Doctor *</Label>
              <select value={editApptForm.doctorId} onChange={e=>setEditApptForm(f=>({...f,doctorId:e.target.value}))} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm">
                <option value="">Select doctor</option>
                {doctors.map(d=><option key={d.doctorId} value={d.doctorId}>{d.name}</option>)}
              </select>
            </div>
            <div><Label className="text-xs">Date *</Label><Input type="date" value={editApptForm.date} onChange={e=>setEditApptForm(f=>({...f,date:e.target.value}))} className="mt-1 h-9"/></div>
            <div><Label className="text-xs">Time *</Label><Input type="time" value={editApptForm.time} onChange={e=>setEditApptForm(f=>({...f,time:e.target.value}))} className="mt-1 h-9"/></div>
            <div className="sm:col-span-2"><Label className="text-xs">Reason</Label><Input value={editApptForm.reason} onChange={e=>setEditApptForm(f=>({...f,reason:e.target.value}))} className="mt-1 h-9" placeholder="Reason for visit"/></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setEditAppt(null)} disabled={savingAppt}>Cancel</Button>
            <Button onClick={saveApptEdit} disabled={savingAppt}>{savingAppt ? "Saving..." : "Save changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete appointment(s) */}
      <ConfirmDeleteDialog
        open={!!apptDeleteTarget}
        onOpenChange={(open)=>{ if(!open) setApptDeleteTarget(null); }}
        title={apptDeleteTarget && apptDeleteTarget.length>1 ? `Delete ${apptDeleteTarget.length} appointments?` : "Delete this appointment?"}
        description="The appointment will be removed and cancellation alerts will be queued for the patient and doctor."
        onConfirm={async ()=>{ await deleteAppointments(apptDeleteTarget ?? []); setApptDeleteTarget(null); }}
      />

    </div>
  );
}
