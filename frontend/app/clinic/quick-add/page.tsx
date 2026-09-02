"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listPatients, listDoctors, createAppointment, createRecord, createPrescription, type Patient, type Doctor } from "@/lib/clinic-api";
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
  const [sharedDate,setSharedDate]=useState(todayISO());
  useEffect(()=>{ if(!clinicId) return; listPatients(clinicId,{limit:100}).then(r=>setPatients(r.items)).catch(()=>{}); listDoctors(clinicId,{limit:100}).then(r=>setDoctors(r.items)).catch(()=>{}); },[clinicId]);

  // Shared state for all forms — kept at page level for sync
  const [appt,setAppt]=useState({patient:"", doctor:"", department:"", visitType:"New Visit", date:todayISO(), time:"09:00", duration:"30", reason:"", priority:"Normal", symptoms:"", notes:"", reminder:"Same Day", whatsapp:"Yes", doctorNotify:"Yes"});
  const [rec,setRec]=useState({patient:"", visitDate:todayISO(), visitTime:"09:00", doctor:"", visitType:"New Visit", followUpDate:"", chiefComplaint:"", symptoms:"", diagnosis:"", icdCode:"", treatment:"", advice:"", bp:"", temp:"", pulse:"", allergies:"", labTests:"", internalNotes:""});
  const [medRow,setMedRow]=useState({name:"", dosage:"", frequency:"", duration:"", instructions:""});
  const [treat,setTreat]=useState({patient:"", doctor:"", diagnosis:"", treatment:"", medicines:"", followUp:"", consent:""});
  const [rx,setRx]=useState({patient:"", doctor:"", diagnosis:"", medicine:"", dosage:"", frequency:"", duration:"", instructions:"", notes:""});

  useEffect(()=>{ if(sharedPatient){ setAppt(s=>({...s, patient:sharedPatient})); setRec(s=>({...s, patient:sharedPatient})); setTreat(s=>({...s, patient:sharedPatient})); setRx(s=>({...s, patient:sharedPatient})); }},[sharedPatient]);
  useEffect(()=>{ if(sharedDoctor){ setAppt(s=>({...s, doctor:sharedDoctor})); setRec(s=>({...s, doctor:sharedDoctor})); setTreat(s=>({...s, doctor:sharedDoctor})); setRx(s=>({...s, doctor:sharedDoctor})); }},[sharedDoctor]);
  useEffect(()=>{ if(sharedDate){ setAppt(s=>({...s, date:sharedDate})); setRec(s=>({...s, visitDate:sharedDate})); }},[sharedDate]);

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
        await createRecord(clinicId,{patientId:pId(rec.patient)!, doctorId:dId(rec.doctor)!, visitDate:rec.visitDate, diagnosis:rec.diagnosis, symptoms:rec.symptoms||null, treatment:rec.treatment||null, notes:rec.advice||null, medicines: medRow.name ? [medRow] : []});
      }
      if(rx.patient && rx.medicine){
        await createPrescription(clinicId,{patientId:pId(rx.patient)!, doctorId: rx.doctor? dId(rx.doctor):undefined, visitDate:todayISO(), diagnosis:rx.diagnosis||null, medicines:[{name:rx.medicine, dosage:rx.dosage, frequency:rx.frequency, duration:rx.duration, instructions:rx.instructions}], notes:rx.notes||null});
      }
      toast.success("Quick Add — all filled sections saved");
    }catch(e:any){ toast.error(e.message); }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-primary/20 bg-primary/5"><CardHeader><CardTitle className="text-base">Common Information — shared across all sections</CardTitle></CardHeader><CardContent>
        <div className="grid sm:grid-cols-3 gap-4">
          <div><Label className="text-xs">Patient * (common)</Label><select value={sharedPatient} onChange={e=>setSharedPatient(e.target.value)} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="">Select patient</option>{patients.map(p=><option key={p.patientId} value={p.fullName}>{p.fullName}</option>)}</select></div>
          <div><Label className="text-xs">Doctor (common)</Label><select value={sharedDoctor} onChange={e=>setSharedDoctor(e.target.value)} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="">Select doctor</option>{doctors.map(d=><option key={d.doctorId} value={d.name}>{d.name}</option>)}</select></div>
          <div><Label className="text-xs">Visit / Invoice Date (common)</Label><Input type="date" value={sharedDate} onChange={e=>setSharedDate(e.target.value)} className="mt-1 h-9"/></div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Changing here auto-fills Patient/Doctor/Date in all 5 sections below — no duplicate entry needed.</p>
      </CardContent></Card>

      {/* 1 Appointments */}
      <Card><CardHeader><CardTitle className="text-base">1. Appointments — /clinic/appointments</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label className="text-xs">Patient *</Label><select value={appt.patient} onChange={e=>setAppt({...appt,patient:e.target.value})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="">Select patient</option>{patients.map(p=><option key={p.patientId} value={p.fullName}>{p.fullName}</option>)}</select></div>
          <div><Label className="text-xs">Doctor *</Label><select value={appt.doctor} onChange={e=>setAppt({...appt,doctor:e.target.value})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="">Select doctor</option>{doctors.map(d=><option key={d.doctorId} value={d.name}>{d.name}</option>)}</select></div>
          <div><Label className="text-xs">Department</Label><Input value={appt.department} onChange={e=>setAppt({...appt,department:e.target.value})} className="mt-1 h-9" placeholder="e.g. Cardiology"/></div>
          <div><Label className="text-xs">Visit Type</Label><select value={appt.visitType} onChange={e=>setAppt({...appt,visitType:e.target.value})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm">{visitTypes.map(o=><option key={o} value={o}>{o}</option>)}</select></div>
          <div><Label className="text-xs">Date *</Label><Input type="date" value={appt.date} onChange={e=>setAppt({...appt,date:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Time *</Label><Input type="time" value={appt.time} onChange={e=>setAppt({...appt,time:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Duration</Label><select value={appt.duration} onChange={e=>setAppt({...appt,duration:e.target.value})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm">{durations.map(o=><option key={o} value={o}>{o} min</option>)}</select></div>
          <div><Label className="text-xs">Priority</Label><select value={appt.priority} onChange={e=>setAppt({...appt,priority:e.target.value})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm">{priorities.map(o=><option key={o} value={o}>{o}</option>)}</select></div>
          <div className="sm:col-span-2"><Label className="text-xs">Reason for Visit *</Label><Input value={appt.reason} onChange={e=>setAppt({...appt,reason:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Symptoms</Label><Textarea value={appt.symptoms} onChange={e=>setAppt({...appt,symptoms:e.target.value})} rows={2}/></div>
          <div><Label className="text-xs">Internal Notes</Label><Input value={appt.notes} onChange={e=>setAppt({...appt,notes:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Patient Reminder</Label><select value={appt.reminder} onChange={e=>setAppt({...appt,reminder:e.target.value})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm">{reminders.map(o=><option key={o} value={o}>{o}</option>)}</select></div>
          <div><Label className="text-xs">WhatsApp Alert</Label><select value={appt.whatsapp} onChange={e=>setAppt({...appt,whatsapp:e.target.value})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"><option>Yes</option><option>No</option></select></div>
          <div><Label className="text-xs">Doctor Notification</Label><select value={appt.doctorNotify} onChange={e=>setAppt({...appt,doctorNotify:e.target.value})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"><option>Yes</option><option>No</option></select></div>
        </div>
      </CardContent></Card>

      {/* 2 Records */}
      <Card><CardHeader><CardTitle className="text-base">2. Records — /clinic/records (Medicine)</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label className="text-xs">Patient *</Label><select value={rec.patient} onChange={e=>setRec({...rec,patient:e.target.value})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="">Select patient</option>{patients.map(p=><option key={p.patientId} value={p.fullName}>{p.fullName}</option>)}</select></div>
          <div><Label className="text-xs">Visit date *</Label><Input type="date" value={rec.visitDate} onChange={e=>setRec({...rec,visitDate:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Visit time</Label><Input type="time" value={rec.visitTime} onChange={e=>setRec({...rec,visitTime:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Doctor *</Label><select value={rec.doctor} onChange={e=>setRec({...rec,doctor:e.target.value})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="">Select doctor</option>{doctors.map(d=><option key={d.doctorId} value={d.name}>{d.name}</option>)}</select></div>
          <div><Label className="text-xs">Visit type *</Label><select value={rec.visitType} onChange={e=>setRec({...rec,visitType:e.target.value})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm">{visitTypes.map(o=><option key={o} value={o}>{o}</option>)}</select></div>
          <div><Label className="text-xs">Follow-up date</Label><Input type="date" value={rec.followUpDate} onChange={e=>setRec({...rec,followUpDate:e.target.value})} className="mt-1 h-9"/></div>
          <div className="sm:col-span-2"><Label className="text-xs">Chief complaint *</Label><Textarea value={rec.chiefComplaint} onChange={e=>setRec({...rec,chiefComplaint:e.target.value})} rows={2}/></div>
          <div className="sm:col-span-2"><Label className="text-xs">Symptoms</Label><Textarea value={rec.symptoms} onChange={e=>setRec({...rec,symptoms:e.target.value})} rows={2}/></div>
          <div><Label className="text-xs">Diagnosis *</Label><Input value={rec.diagnosis} onChange={e=>setRec({...rec,diagnosis:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">ICD Code</Label><Input value={rec.icdCode} onChange={e=>setRec({...rec,icdCode:e.target.value})} placeholder="e.g. I10" className="mt-1 h-9"/></div>
        </div>
        <div className="rounded-lg border p-3 space-y-2">
          <p className="text-xs font-semibold">Medicines * (at least 1)</p>
          <div className="grid sm:grid-cols-5 gap-2">
            <select value={medRow.name} onChange={e=>setMedRow({...medRow,name:e.target.value})} className="h-9 rounded-xl border border-border bg-card px-3 text-sm"><option value="">Medicine *</option>{medicinesOpts.map(m=><option key={m} value={m}>{m}</option>)}</select>
            <Input value={medRow.dosage} onChange={e=>setMedRow({...medRow,dosage:e.target.value})} placeholder="Dosage *"/>
            <Input value={medRow.frequency} onChange={e=>setMedRow({...medRow,frequency:e.target.value})} placeholder="Frequency *"/>
            <Input value={medRow.duration} onChange={e=>setMedRow({...medRow,duration:e.target.value})} placeholder="Duration *"/>
            <select value={medRow.instructions} onChange={e=>setMedRow({...medRow,instructions:e.target.value})} className="h-9 rounded-xl border border-border bg-card px-3 text-sm"><option value="">Instructions</option>{medInstructions.map(i=><option key={i} value={i}>{i}</option>)}</select>
          </div>
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

      {/* 3 Treatment */}
      <Card><CardHeader><CardTitle className="text-base">3. Treatment — /clinic/complaints</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label className="text-xs">Patient *</Label><select value={treat.patient} onChange={e=>setTreat({...treat,patient:e.target.value})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="">Select patient</option>{patients.map(p=><option key={p.patientId} value={p.fullName}>{p.fullName}</option>)}</select></div>
          <div><Label className="text-xs">Doctor</Label><select value={treat.doctor} onChange={e=>setTreat({...treat,doctor:e.target.value})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="">Select doctor</option>{doctors.map(d=><option key={d.doctorId} value={d.name}>{d.name}</option>)}</select></div>
          <div><Label className="text-xs">Diagnosis *</Label><Input value={treat.diagnosis} onChange={e=>setTreat({...treat,diagnosis:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Treatment</Label><Input value={treat.treatment} onChange={e=>setTreat({...treat,treatment:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Medicines</Label><select value={treat.medicines} onChange={e=>setTreat({...treat,medicines:e.target.value})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="">Select</option>{medicinesOpts.slice(0,10).map(m=><option key={m} value={m}>{m}</option>)}</select></div>
          <div><Label className="text-xs">Follow-up</Label><Input type="date" value={treat.followUp} onChange={e=>setTreat({...treat,followUp:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Patient Consent</Label><select value={treat.consent} onChange={e=>setTreat({...treat,consent:e.target.value})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="">Select</option><option>Yes</option><option>No</option><option>Pending</option></select></div>
        </div>
      </CardContent></Card>

      {/* 4 Prescription */}
      <Card><CardHeader><CardTitle className="text-base">4. Prescription — /clinic/prescriptions</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label className="text-xs">Patient *</Label><select value={rx.patient} onChange={e=>setRx({...rx,patient:e.target.value})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="">Select patient</option>{patients.map(p=><option key={p.patientId} value={p.fullName}>{p.fullName}</option>)}</select></div>
          <div><Label className="text-xs">Doctor</Label><select value={rx.doctor} onChange={e=>setRx({...rx,doctor:e.target.value})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="">Select doctor</option>{doctors.map(d=><option key={d.doctorId} value={d.name}>{d.name}</option>)}</select></div>
          <div><Label className="text-xs">Diagnosis</Label><Input value={rx.diagnosis} onChange={e=>setRx({...rx,diagnosis:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Medicine *</Label><select value={rx.medicine} onChange={e=>setRx({...rx,medicine:e.target.value})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="">Select</option>{medicinesOpts.slice(0,10).map(m=><option key={m} value={m}>{m}</option>)}</select></div>
          <div><Label className="text-xs">Dosage</Label><Input value={rx.dosage} onChange={e=>setRx({...rx,dosage:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Frequency</Label><Input value={rx.frequency} onChange={e=>setRx({...rx,frequency:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Duration</Label><Input value={rx.duration} onChange={e=>setRx({...rx,duration:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Instructions</Label><select value={rx.instructions} onChange={e=>setRx({...rx,instructions:e.target.value})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="">Select</option>{medInstructions.map(i=><option key={i} value={i}>{i}</option>)}</select></div>
          <div className="sm:col-span-2"><Label className="text-xs">Notes</Label><Textarea value={rx.notes} onChange={e=>setRx({...rx,notes:e.target.value})} rows={2}/></div>
        </div>
      </CardContent></Card>


      <div className="sticky bottom-4 flex justify-center pt-2"><Button size="lg" className="h-11 px-8 shadow-lg" onClick={submitAll}>Save All — Quick Add</Button></div>
    </div>
  );
}
