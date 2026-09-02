"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listPatients, listDoctors, listAppointments, updateAppointment, createAppointment, createRecord, createPrescription, type Patient, type Doctor, type Appointment } from "@/lib/clinic-api";
import { useRequireRole } from "@/hooks/use-clinic-session";
import { useDropdownOptions } from "@/lib/dropdown-options";
import { todayISO } from "@/lib/datetime";

export default function QuickAddPage(){
  const session = useRequireRole("staff" as any);
  const clinicId = session?.clinicId ?? "";
  const [patients,setPatients]=useState<Patient[]>([]);
  const [doctors,setDoctors]=useState<Doctor[]>([]);
  const { getOptions } = useDropdownOptions(clinicId);
  const [sharedPatient,setSharedPatient]=useState("");
  const [sharedDoctor,setSharedDoctor]=useState("");
  const [appointments,setAppointments]=useState<Appointment[]>([]);
  useEffect(()=>{ if(!clinicId) return; listPatients(clinicId,{limit:100}).then(r=>setPatients(r.items)).catch(()=>{}); listDoctors(clinicId,{limit:100}).then(r=>setDoctors(r.items)).catch(()=>{}); listAppointments(clinicId,{limit:100}).then(r=>setAppointments(r.items)).catch(()=>{}); },[clinicId]);
  // auto-show doctor when patient selected
  const onSharedPatient=(name:string)=>{
    setSharedPatient(name);
    const p=patients.find(x=>x.fullName===name);
    if(p?.doctorId){
      const doc=doctors.find(d=>d.doctorId===p.doctorId);
      if(doc) setSharedDoctor(doc.name);
    }
  };

  // Shared state for all forms — kept at page level for sync
  const [appt,setAppt]=useState({patient:"", doctor:"", department:"", visitType:"New Visit", date:todayISO(), time:"09:00", duration:"30", reason:"", priority:"Normal", status:"scheduled", symptoms:"", notes:"", reminder:"Same Day", whatsapp:"Yes", doctorNotify:"Yes"});
  const [rec,setRec]=useState({patient:"", visitDate:todayISO(), visitTime:"09:00", doctor:"", visitType:"New Visit", followUpDate:"", chiefComplaint:"", symptoms:"", diagnosis:"", icdCode:"", treatment:"", advice:"", bp:"", temp:"", pulse:"", allergies:"", labTests:"", internalNotes:""});
  const [medicines,setMedicines]=useState([{name:"", dosage:"", frequency:"", duration:"", instructions:""}]);
  const addMedicine=()=> setMedicines(m=>[...m,{name:"", dosage:"", frequency:"", duration:"", instructions:""}]);
  const removeMedicine=(i:number)=> setMedicines(m=> m.filter((_,idx)=> idx!==i));
  const setMedicine=(i:number,patch:Partial<typeof medicines[0]>)=> setMedicines(m=> m.map((row,idx)=> idx===i? {...row,...patch}:row));
  const [treat,setTreat]=useState({patient:"", doctor:"", diagnosis:"", treatment:"", medicines:"", followUp:"", consent:""});
  const [rx,setRx]=useState({patient:"", doctor:"", diagnosis:"", medicine:"", dosage:"", frequency:"", duration:"", instructions:"", notes:""});

  useEffect(()=>{ if(sharedPatient){ setAppt(s=>({...s, patient:sharedPatient})); setRec(s=>({...s, patient:sharedPatient})); setTreat(s=>({...s, patient:sharedPatient})); setRx(s=>({...s, patient:sharedPatient})); }},[sharedPatient]);
  useEffect(()=>{ if(sharedDoctor){ setAppt(s=>({...s, doctor:sharedDoctor})); setRec(s=>({...s, doctor:sharedDoctor})); setTreat(s=>({...s, doctor:sharedDoctor})); setRx(s=>({...s, doctor:sharedDoctor})); }},[sharedDoctor]);

  const visitTypes=getOptions("visit_types");
  const priorities=getOptions("appointment_priorities");
  const durations=getOptions("appointment_durations");
  const reminders=getOptions("reminder_options");
  const medInstructions=getOptions("medicine_instructions");
  const medicinesOpts=getOptions("medicines");

  async function submitAll(){
    try{
      const pId=(name:string)=> patients.find(p=>p.fullName===name)?.patientId;
      const dId=(name:string)=> doctors.find(d=>d.name===name)?.doctorId;
      if(appt.patient && appt.doctor && appt.date && appt.time && appt.reason){
        await createAppointment(clinicId,{patientId:pId(appt.patient)!, doctorId:dId(appt.doctor)!, date:appt.date, time:appt.time, reason:appt.reason, notes:appt.notes||null});
      }
      if(rec.patient && rec.diagnosis && rec.chiefComplaint){
        const validMeds = medicines.filter(m=> m.name.trim());
        await createRecord(clinicId,{patientId:pId(rec.patient)!, doctorId:dId(rec.doctor)!, visitDate:rec.visitDate, diagnosis:rec.diagnosis, symptoms:rec.symptoms||null, treatment:rec.treatment||null, notes:rec.advice||null, medicines: validMeds});
      }
      if(rx.patient && rx.medicine){
        await createPrescription(clinicId,{patientId:pId(rx.patient)!, doctorId: rx.doctor? dId(rx.doctor):undefined, visitDate:todayISO(), diagnosis:rx.diagnosis||null, medicines:[{name:rx.medicine, dosage:rx.dosage, frequency:rx.frequency, duration:rx.duration, instructions:rx.instructions}], notes:rx.notes||null});
      }
      toast.success("Quick Fill — all filled sections saved");
    }catch(e:any){ toast.error(e.message); }
  }

  const optimized = sharedPatient && sharedDoctor;

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 via-background to-background">
      <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Premium header — Linear/Stripe style */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 sm:p-7">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-violet-500/[0.05] pointer-events-none" />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Quick Add</p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground">Fill blanks — patient optimized</h1>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">Select patient once, doctor auto-fills. All sections below reuse the same context — no duplicate entry.</p>
            </div>
            {optimized && <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300">● {sharedPatient} · {sharedDoctor}</span>}
          </div>
          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            <div><Label className="text-xs font-medium">Patient *</Label><select value={sharedPatient} onChange={e=>onSharedPatient(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm shadow-sm focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition"><option value="">Select patient</option>{patients.map(p=><option key={p.patientId} value={p.fullName}>{p.fullName}</option>)}</select></div>
            <div><Label className="text-xs font-medium">Doctor (auto)</Label><Input value={sharedDoctor} readOnly placeholder="Auto from patient" className="mt-1.5 h-11 rounded-xl bg-muted/50 border-border/60"/></div>
          </div>
        </div>
      </div>

      {/* 1 Appointments — table, status only */}
      <Card className="rounded-2xl border-border/60 overflow-hidden"><CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2">1. Appointments — select to change status {optimized && <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-normal">{sharedPatient} · {sharedDoctor}</span>}</CardTitle></CardHeader><CardContent>
        {(() => {
          const pid = patients.find(p=>p.fullName===sharedPatient)?.patientId;
          const appts = pid ? appointments.filter(a=>a.patientId===pid) : [];
          if(!sharedPatient) return <p className="text-sm text-muted-foreground">Select patient above to see appointments.</p>;
          if(appts.length===0) return <p className="text-sm text-muted-foreground">No appointments for this patient.</p>;
          return <div className="overflow-hidden rounded-xl border"><table className="w-full text-sm"><thead className="bg-muted text-xs"><tr><th className="p-2 text-left">Date</th><th className="p-2 text-left">Time</th><th className="p-2 text-left">Reason</th><th className="p-2 text-left">Status</th></tr></thead><tbody>{appts.map(a=> <tr key={a.appointmentId} className="border-t"><td className="p-2">{a.date}</td><td className="p-2">{a.time}</td><td className="p-2">{a.reason||"—"}</td><td className="p-2"><select value={a.status} onChange={async e=>{ try{ await updateAppointment(clinicId,a.appointmentId,{status:e.target.value as any}); toast.success("Status updated"); const r=await listAppointments(clinicId,{limit:100}); setAppointments(r.items);}catch(err:any){ toast.error(err.message);} }} className="h-7 rounded-lg border bg-card px-2 text-xs"><option value="scheduled">Scheduled</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="no_show">No Show</option></select></td></tr>)}</tbody></table></div>;
        })()}
      </CardContent></Card>

      {/* 2 Records — optimized, no duplicate patient */}
      <Card className="rounded-2xl border-border/60 overflow-hidden"><CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2">2. Records — Medicine {optimized && <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-normal">{sharedPatient}</span>}</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label className="text-xs">Visit date *</Label><Input type="date" value={rec.visitDate} onChange={e=>setRec({...rec,visitDate:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Visit time</Label><Input type="time" value={rec.visitTime} onChange={e=>setRec({...rec,visitTime:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Visit type *</Label><select value={rec.visitType} onChange={e=>setRec({...rec,visitType:e.target.value})} className="mt-1 h-9 w-full rounded-none border border-border bg-card px-3 text-sm">{visitTypes.map(o=><option key={o} value={o}>{o}</option>)}</select></div>
          <div><Label className="text-xs">Follow-up date</Label><Input type="date" value={rec.followUpDate} onChange={e=>setRec({...rec,followUpDate:e.target.value})} className="mt-1 h-9"/></div>
          <div className="sm:col-span-2"><Label className="text-xs">Chief complaint *</Label><Textarea value={rec.chiefComplaint} onChange={e=>setRec({...rec,chiefComplaint:e.target.value})} rows={2}/></div>
          <div className="sm:col-span-2"><Label className="text-xs">Symptoms</Label><Textarea value={rec.symptoms} onChange={e=>setRec({...rec,symptoms:e.target.value})} rows={2}/></div>
          <div><Label className="text-xs">Diagnosis *</Label><Input value={rec.diagnosis} onChange={e=>setRec({...rec,diagnosis:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">ICD Code</Label><Input value={rec.icdCode} onChange={e=>setRec({...rec,icdCode:e.target.value})} placeholder="e.g. I10" className="mt-1 h-9"/></div>
        </div>
        <div className="rounded-xl border p-3 space-y-3">
          <div className="flex items-center justify-between"><p className="text-xs font-semibold">Medicines * (at least 1) — enterable + Add More</p><Button type="button" variant="outline" size="sm" onClick={addMedicine}>+ Add More</Button></div>
          {medicines.map((med,i)=> (
            <div key={i} className="grid sm:grid-cols-5 gap-2 items-end">
              <select value={med.name} onChange={e=>setMedicine(i,{name:e.target.value})} className="h-9 rounded-xl border border-border bg-card px-3 text-sm"><option value="">Medicine *</option>{medicinesOpts.map(m=><option key={m} value={m}>{m}</option>)}</select>
              <Input value={med.dosage} onChange={e=>setMedicine(i,{dosage:e.target.value})} placeholder="Dosage *"/>
              <Input value={med.frequency} onChange={e=>setMedicine(i,{frequency:e.target.value})} placeholder="Frequency *"/>
              <Input value={med.duration} onChange={e=>setMedicine(i,{duration:e.target.value})} placeholder="Duration *"/>
              <div className="flex gap-1">
                <select value={med.instructions} onChange={e=>setMedicine(i,{instructions:e.target.value})} className="h-9 flex-1 rounded-xl border border-border bg-card px-3 text-sm"><option value="">Instructions</option>{medInstructions.map(x=><option key={x} value={x}>{x}</option>)}</select>
                {medicines.length>1 && <Button type="button" variant="ghost" size="sm" onClick={()=>removeMedicine(i)}>✕</Button>}
              </div>
            </div>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><Label className="text-xs">Treatment / Procedures</Label><Textarea value={rec.treatment} onChange={e=>setRec({...rec,treatment:e.target.value})} rows={2}/></div>
          <div className="sm:col-span-2"><Label className="text-xs">Advice to patient</Label><Textarea value={rec.advice} onChange={e=>setRec({...rec,advice:e.target.value})} rows={2}/></div>
          <div><Label className="text-xs">Vitals — BP</Label><Input value={rec.bp} onChange={e=>setRec({...rec,bp:e.target.value})} placeholder="120/80" className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Temperature °C</Label><Input value={rec.temp} onChange={e=>setRec({...rec,temp:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Pulse bpm</Label><Input value={rec.pulse} onChange={e=>setRec({...rec,pulse:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Allergies</Label><Input value={rec.allergies} onChange={e=>setRec({...rec,allergies:e.target.value})} className="mt-1 h-9"/></div>
          <div className="sm:col-span-2"><Label className="text-xs">Lab tests</Label><Textarea value={rec.labTests} onChange={e=>setRec({...rec,labTests:e.target.value})} rows={2}/></div>
          <div className="sm:col-span-2"><Label className="text-xs">Internal notes</Label><Textarea value={rec.internalNotes} onChange={e=>setRec({...rec,internalNotes:e.target.value})} rows={2}/></div>
        </div>
      </CardContent></Card>

      {/* 3 Treatment — optimized */}
      <Card className="rounded-2xl border-border/60 overflow-hidden"><CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2">3. Treatment {optimized && <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-normal">{sharedPatient}</span>}</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label className="text-xs">Diagnosis *</Label><Input value={treat.diagnosis} onChange={e=>setTreat({...treat,diagnosis:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Treatment</Label><Input value={treat.treatment} onChange={e=>setTreat({...treat,treatment:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Medicines</Label><select value={treat.medicines} onChange={e=>setTreat({...treat,medicines:e.target.value})} className="mt-1 h-9 w-full rounded-none border border-border bg-card px-3 text-sm"><option value="">Select</option>{medicinesOpts.slice(0,10).map(m=><option key={m} value={m}>{m}</option>)}</select></div>
          <div><Label className="text-xs">Follow-up</Label><Input type="date" value={treat.followUp} onChange={e=>setTreat({...treat,followUp:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Patient Consent</Label><select value={treat.consent} onChange={e=>setTreat({...treat,consent:e.target.value})} className="mt-1 h-9 w-full rounded-none border border-border bg-card px-3 text-sm"><option value="">Select</option><option>Yes</option><option>No</option><option>Pending</option></select></div>
        </div>
      </CardContent></Card>

      {/* 4 Prescription — optimized */}
      <Card className="rounded-2xl border-border/60 overflow-hidden"><CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2">4. Prescription {optimized && <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-normal">{sharedPatient}</span>}</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label className="text-xs">Diagnosis</Label><Input value={rx.diagnosis} onChange={e=>setRx({...rx,diagnosis:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Medicine *</Label><select value={rx.medicine} onChange={e=>setRx({...rx,medicine:e.target.value})} className="mt-1 h-9 w-full rounded-none border border-border bg-card px-3 text-sm"><option value="">Select</option>{medicinesOpts.slice(0,10).map(m=><option key={m} value={m}>{m}</option>)}</select></div>
          <div><Label className="text-xs">Dosage</Label><Input value={rx.dosage} onChange={e=>setRx({...rx,dosage:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Frequency</Label><Input value={rx.frequency} onChange={e=>setRx({...rx,frequency:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Duration</Label><Input value={rx.duration} onChange={e=>setRx({...rx,duration:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Instructions</Label><select value={rx.instructions} onChange={e=>setRx({...rx,instructions:e.target.value})} className="mt-1 h-9 w-full rounded-none border border-border bg-card px-3 text-sm"><option value="">Select</option>{medInstructions.map(i=><option key={i} value={i}>{i}</option>)}</select></div>
          <div className="sm:col-span-2"><Label className="text-xs">Notes</Label><Textarea value={rx.notes} onChange={e=>setRx({...rx,notes:e.target.value})} rows={2}/></div>
        </div>
      </CardContent></Card>


      <div className="sticky bottom-6 flex justify-center pt-4"><Button size="lg" className="h-11 rounded-xl px-8 shadow-sm" onClick={submitAll}>Save All — Quick Fill</Button></div>
      </div>
    </div>
  );
}
