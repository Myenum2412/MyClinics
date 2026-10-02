"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listPatients, listDoctors, listAppointments, updateAppointment, createQuickAdd, type Patient, type Doctor, type Appointment } from "@/lib/clinic-api";
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

  // Shared state for all forms — kept at page level for sync
  const [appt,setAppt]=useState({patient:"", doctor:"", department:"", visitType:"New Visit", date:todayISO(), time:"09:00", duration:"30", reason:"", priority:"Normal", status:"scheduled", symptoms:"", notes:"", reminder:"Same Day", whatsapp:"Yes", doctorNotify:"Yes"});
  const [rec,setRec]=useState({patient:"", visitDate:todayISO(), visitTime:"09:00", doctor:"", visitType:"New Visit", followUpDate:"", chiefComplaint:"", symptoms:"", diagnosis:"", icdCode:"", treatment:"", advice:"", bp:"", temp:"", pulse:"", allergies:"", labTests:"", internalNotes:""});
  const [medicines,setMedicines]=useState([{name:"", dosage:"", frequency:"", duration:"", instructions:""}]);
  const addMedicine=()=> setMedicines(m=>[...m,{name:"", dosage:"", frequency:"", duration:"", instructions:""}]);
  const removeMedicine=(i:number)=> setMedicines(m=> m.filter((_,idx)=> idx!==i));
  const setMedicine=(i:number,patch:Partial<typeof medicines[0]>)=> setMedicines(m=> m.map((row,idx)=> idx===i? {...row,...patch}:row));
  const [treat,setTreat]=useState({patient:"", doctor:"", diagnosis:"", treatment:"", medicines:"", followUp:"", consent:""});
  const [rx,setRx]=useState({patient:"", doctor:"", diagnosis:"", medicine:"", dosage:"", frequency:"", duration:"", instructions:"", notes:""});
  // Examination — same shape as /clinic/examination (without odontogram/investigation link)
  const [exam,setExam]=useState({
    visitDate:todayISO(), status:"pending", issueType:"", oralFindings:"", notes:"",
    chiefComplaints:[{complaint:"", duration:"", severity:"", notes:""}],
    bloodPressure:"", temperature:"", pulse:"", respiratoryRate:"", spo2:"",
    allergies:"", medicalConditions:"", previousSurgeries:"", currentMedications:"", patientHistory:"", familyHistory:"", habits:"",
    hpiPresentingComplaint:"", hpiOnset:"", hpiDurationValue:"", hpiDurationUnit:"", hpiProgression:"", hpiSymptoms:"", hpiAggravatingFactors:"", hpiRelievingFactors:"", hpiAssociatedSymptoms:"", hpiPreviousTreatment:"", hpiAdditionalNotes:"",
  });
  const setExamComplaint=(i:number,patch:Partial<typeof exam.chiefComplaints[0]>)=> setExam(s=>({...s, chiefComplaints: s.chiefComplaints.map((row,idx)=> idx===i? {...row,...patch}:row)}));

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
      const patientId = pId(sharedPatient) ?? pId(appt.patient) ?? pId(rec.patient) ?? pId(rx.patient);
      const doctorId = dId(sharedDoctor) ?? dId(appt.doctor) ?? dId(rec.doctor) ?? dId(rx.doctor);
      if(!patientId || !doctorId){
        toast.error("Select patient and doctor");
        return;
      }
      const payload: any = { patientId, doctorId };
      if(appt.patient && appt.doctor && appt.date && appt.time && appt.reason){
        payload.appointment = { date: appt.date, time: appt.time, reason: appt.reason, notes: appt.notes||null, department: appt.department, visitType: appt.visitType, duration: appt.duration, priority: appt.priority };
      }
      if(rec.patient && rec.diagnosis && rec.chiefComplaint){
        const validMeds = medicines.filter(m=> m.name.trim());
        if(validMeds.length===0){
          toast.error("Add at least one medicine for Records");
          return;
        }
        payload.record = { visitDate: rec.visitDate, visitTime: rec.visitTime, diagnosis: rec.diagnosis, chiefComplaint: rec.chiefComplaint, symptoms: rec.symptoms||null, treatment: rec.treatment||null, advice: rec.advice||null, icdCode: rec.icdCode||null, bp: rec.bp||null, temp: rec.temp||null, pulse: rec.pulse||null, allergies: rec.allergies||null, labTests: rec.labTests||null, internalNotes: rec.internalNotes||null, followUpDate: rec.followUpDate||null, medicines: validMeds };
      }
      if(rx.patient && rx.medicine){
        payload.prescription = { diagnosis: rx.diagnosis||null, medicine: rx.medicine, dosage: rx.dosage||null, frequency: rx.frequency||null, duration: rx.duration||null, instructions: rx.instructions||null, notes: rx.notes||null, visitDate: todayISO() };
      }
      if(exam.oralFindings.trim() && exam.issueType){
        const clean=(v:string)=> v.trim() || null;
        const validComplaints = exam.chiefComplaints.map(c=>({ complaint: clean(c.complaint), duration: clean(c.duration), severity: c.severity || null, notes: clean(c.notes) })).filter(c=> c.complaint || c.duration || c.severity || c.notes);
        payload.examination = {
          visitDate: exam.visitDate, status: exam.status, issueType: exam.issueType,
          oralFindings: exam.oralFindings.trim(), notes: clean(exam.notes),
          allergies: clean(exam.allergies), medicalConditions: clean(exam.medicalConditions), previousSurgeries: clean(exam.previousSurgeries), currentMedications: clean(exam.currentMedications), patientHistory: clean(exam.patientHistory), familyHistory: clean(exam.familyHistory), habits: clean(exam.habits),
          hpi: { presentingComplaint: clean(exam.hpiPresentingComplaint), onset: exam.hpiOnset || null, durationValue: clean(exam.hpiDurationValue), durationUnit: exam.hpiDurationUnit || null, progression: exam.hpiProgression || null, symptoms: clean(exam.hpiSymptoms), aggravatingFactors: clean(exam.hpiAggravatingFactors), relievingFactors: clean(exam.hpiRelievingFactors), associatedSymptoms: clean(exam.hpiAssociatedSymptoms), previousTreatment: clean(exam.hpiPreviousTreatment), additionalNotes: clean(exam.hpiAdditionalNotes) },
          chiefComplaints: validComplaints.length? validComplaints : null,
          bloodPressure: clean(exam.bloodPressure), temperature: clean(exam.temperature), pulse: clean(exam.pulse), respiratoryRate: clean(exam.respiratoryRate), spo2: clean(exam.spo2),
        };
      }
      if(!payload.appointment && !payload.record && !payload.prescription && !payload.examination){
        toast.error("Fill at least one section (Appointment, Records, Examination or Prescription)");
        return;
      }
      // Single submit — backend creates all and sends ONE consolidated WhatsApp notification with full data (quick-add only)
      await createQuickAdd(clinicId, payload);
      toast.success("Quick Fill — all filled sections saved and single notification sent");
    }catch(e:any){ toast.error(e.message); }
  }

  const optimized = sharedPatient && sharedDoctor;

  return (
    <div className="flex flex-col gap-6">
      {/* Premium header — patient optimized */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-violet-500/5 p-6">
        <h1 className="text-lg font-semibold tracking-tight">Quick Add — Fill blanks</h1>
        <p className="mt-1 text-sm text-muted-foreground">Select patient — doctor auto-shows. All cards below reuse // no Visit/Invoice Date.</p>
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
          return <div className="overflow-hidden rounded-xl border"><table className="w-full text-sm"><thead className="bg-muted text-xs"><tr><th className="p-2 text-left">Date</th><th className="p-2 text-left">Time</th><th className="p-2 text-left">Reason</th><th className="p-2 text-left">Status</th></tr></thead><tbody>{appts.map(a=> <tr key={a.appointmentId} className="border-t"><td className="p-2">{a.date}</td><td className="p-2">{a.time}</td><td className="p-2">{a.reason||"—"}</td><td className="p-2"><select value={a.status} onChange={async e=>{ try{ await updateAppointment(clinicId,a.appointmentId,{status:e.target.value as any}); toast.success("Status updated"); const r=await listAppointments(clinicId,{limit:100}); setAppointments((r as any)?.items ?? []);}catch(err:any){ toast.error(err.message);} }} className="h-7 rounded-lg border bg-card px-2 text-xs"><option value="scheduled">Scheduled</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="no_show">No Show</option></select></td></tr>)}</tbody></table></div>;
        })()}
      </CardContent></Card>

      {/* 2 Records — optimized, no duplicate patient */}
      <Card className="rounded-2xl"><CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2">2. Records — Medicine {optimized && <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-normal">{sharedPatient}</span>}</CardTitle></CardHeader><CardContent className="space-y-4">
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

      {/* 3 Examination — same fields as /clinic/examination */}
      <Card className="rounded-2xl"><CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2">3. Examination — Oral Findings {optimized && <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-normal">{sharedPatient}</span>}</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label className="text-xs">Visit date *</Label><Input type="date" value={exam.visitDate} onChange={e=>setExam({...exam,visitDate:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Status</Label><select value={exam.status} onChange={e=>setExam({...exam,status:e.target.value})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="pending">Pending</option><option value="in-progress">In Progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>
          <div><Label className="text-xs">Issue type *</Label><select value={exam.issueType} onChange={e=>setExam({...exam,issueType:e.target.value})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="">Select (Hard / Soft)</option><option value="hard">Hard</option><option value="soft">Soft</option></select></div>
          <div className="sm:col-span-2"><Label className="text-xs">Oral findings *</Label><Textarea value={exam.oralFindings} onChange={e=>setExam({...exam,oralFindings:e.target.value})} rows={2} placeholder="Describe the oral examination findings…"/></div>
          <div className="sm:col-span-2"><Label className="text-xs">Notes</Label><Textarea value={exam.notes} onChange={e=>setExam({...exam,notes:e.target.value})} rows={2} placeholder="Additional notes for this examination…"/></div>
        </div>
        <div className="rounded-xl border p-3 space-y-3">
          <div className="flex items-center justify-between"><p className="text-xs font-semibold">Chief complaints</p><Button type="button" variant="outline" size="sm" onClick={()=>setExam(s=>({...s, chiefComplaints:[...s.chiefComplaints,{complaint:"",duration:"",severity:"",notes:""}]}))}>+ Add complaint</Button></div>
          {exam.chiefComplaints.map((c,i)=> (
            <div key={i} className="grid sm:grid-cols-4 gap-2 items-end">
              <Input value={c.complaint} onChange={e=>setExamComplaint(i,{complaint:e.target.value})} placeholder="Complaint"/>
              <Input value={c.duration} onChange={e=>setExamComplaint(i,{duration:e.target.value})} placeholder="Duration"/>
              <select value={c.severity} onChange={e=>setExamComplaint(i,{severity:e.target.value})} className="h-9 rounded-xl border border-border bg-card px-3 text-sm"><option value="">Severity</option><option>Mild</option><option>Moderate</option><option>Severe</option></select>
              <div className="flex gap-1">
                <Input value={c.notes} onChange={e=>setExamComplaint(i,{notes:e.target.value})} placeholder="Notes" className="flex-1"/>
                {exam.chiefComplaints.length>1 && <Button type="button" variant="ghost" size="sm" onClick={()=>setExam(s=>({...s, chiefComplaints: s.chiefComplaints.filter((_,idx)=> idx!==i)}))}>✕</Button>}
              </div>
            </div>
          ))}
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div><Label className="text-xs">Blood pressure</Label><Input value={exam.bloodPressure} onChange={e=>setExam({...exam,bloodPressure:e.target.value})} placeholder="120/80" className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Temperature</Label><Input value={exam.temperature} onChange={e=>setExam({...exam,temperature:e.target.value})} placeholder="98.6" className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Pulse</Label><Input value={exam.pulse} onChange={e=>setExam({...exam,pulse:e.target.value})} placeholder="72" className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Respiratory rate</Label><Input value={exam.respiratoryRate} onChange={e=>setExam({...exam,respiratoryRate:e.target.value})} placeholder="16" className="mt-1 h-9"/></div>
          <div><Label className="text-xs">SpO₂</Label><Input value={exam.spo2} onChange={e=>setExam({...exam,spo2:e.target.value})} placeholder="98" className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Allergies</Label><Input value={exam.allergies} onChange={e=>setExam({...exam,allergies:e.target.value})} placeholder="Penicillin, Nuts" className="mt-1 h-9"/></div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><Label className="text-xs">Medical conditions</Label><Textarea value={exam.medicalConditions} onChange={e=>setExam({...exam,medicalConditions:e.target.value})} rows={2} placeholder="Diabetes, Hypertension…"/></div>
          <div className="sm:col-span-2"><Label className="text-xs">Previous surgeries</Label><Textarea value={exam.previousSurgeries} onChange={e=>setExam({...exam,previousSurgeries:e.target.value})} rows={2} placeholder="Appendectomy (2015)…"/></div>
          <div className="sm:col-span-2"><Label className="text-xs">Current medications</Label><Textarea value={exam.currentMedications} onChange={e=>setExam({...exam,currentMedications:e.target.value})} rows={2} placeholder="Aspirin 500mg (daily)…"/></div>
          <div><Label className="text-xs">Patient history</Label><Textarea value={exam.patientHistory} onChange={e=>setExam({...exam,patientHistory:e.target.value})} rows={2}/></div>
          <div><Label className="text-xs">Family history</Label><Textarea value={exam.familyHistory} onChange={e=>setExam({...exam,familyHistory:e.target.value})} rows={2}/></div>
          <div className="sm:col-span-2"><Label className="text-xs">Habits</Label><Textarea value={exam.habits} onChange={e=>setExam({...exam,habits:e.target.value})} rows={2} placeholder="Smoking, alcohol, diet…"/></div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <p className="text-xs font-semibold sm:col-span-2">History of presenting illness</p>
          <div className="sm:col-span-2"><Label className="text-xs">Presenting complaint</Label><Input value={exam.hpiPresentingComplaint} onChange={e=>setExam({...exam,hpiPresentingComplaint:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Onset</Label><select value={exam.hpiOnset} onChange={e=>setExam({...exam,hpiOnset:e.target.value})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="">Not specified</option><option>Sudden</option><option>Gradual</option></select></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Duration</Label><Input type="number" value={exam.hpiDurationValue} onChange={e=>setExam({...exam,hpiDurationValue:e.target.value})} className="mt-1 h-9" placeholder="Number"/></div>
            <div><Label className="text-xs">Unit</Label><select value={exam.hpiDurationUnit} onChange={e=>setExam({...exam,hpiDurationUnit:e.target.value})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="">Unit</option><option>Days</option><option>Weeks</option><option>Months</option></select></div>
          </div>
          <div><Label className="text-xs">Progression</Label><select value={exam.hpiProgression} onChange={e=>setExam({...exam,hpiProgression:e.target.value})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="">Not specified</option><option>Improving</option><option>Worsening</option><option>Stable</option></select></div>
          <div><Label className="text-xs">Aggravating factors</Label><Input value={exam.hpiAggravatingFactors} onChange={e=>setExam({...exam,hpiAggravatingFactors:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Relieving factors</Label><Input value={exam.hpiRelievingFactors} onChange={e=>setExam({...exam,hpiRelievingFactors:e.target.value})} className="mt-1 h-9"/></div>
          <div className="sm:col-span-2"><Label className="text-xs">Symptoms</Label><Textarea value={exam.hpiSymptoms} onChange={e=>setExam({...exam,hpiSymptoms:e.target.value})} rows={2}/></div>
          <div className="sm:col-span-2"><Label className="text-xs">Associated symptoms</Label><Textarea value={exam.hpiAssociatedSymptoms} onChange={e=>setExam({...exam,hpiAssociatedSymptoms:e.target.value})} rows={2}/></div>
          <div className="sm:col-span-2"><Label className="text-xs">Previous treatment</Label><Textarea value={exam.hpiPreviousTreatment} onChange={e=>setExam({...exam,hpiPreviousTreatment:e.target.value})} rows={2}/></div>
          <div className="sm:col-span-2"><Label className="text-xs">Additional notes</Label><Textarea value={exam.hpiAdditionalNotes} onChange={e=>setExam({...exam,hpiAdditionalNotes:e.target.value})} rows={2}/></div>
        </div>
      </CardContent></Card>

      {/* 4 Treatment — optimized */}
      <Card className="rounded-2xl"><CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2">4. Treatment {optimized && <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-normal">{sharedPatient}</span>}</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label className="text-xs">Diagnosis *</Label><Input value={treat.diagnosis} onChange={e=>setTreat({...treat,diagnosis:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Treatment</Label><Input value={treat.treatment} onChange={e=>setTreat({...treat,treatment:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Medicines</Label><select value={treat.medicines} onChange={e=>setTreat({...treat,medicines:e.target.value})} className="mt-1 h-9 w-full rounded-none border border-border bg-card px-3 text-sm"><option value="">Select</option>{medicinesOpts.slice(0,10).map(m=><option key={m} value={m}>{m}</option>)}</select></div>
          <div><Label className="text-xs">Follow-up</Label><Input type="date" value={treat.followUp} onChange={e=>setTreat({...treat,followUp:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Patient Consent</Label><select value={treat.consent} onChange={e=>setTreat({...treat,consent:e.target.value})} className="mt-1 h-9 w-full rounded-none border border-border bg-card px-3 text-sm"><option value="">Select</option><option>Yes</option><option>No</option><option>Pending</option></select></div>
        </div>
      </CardContent></Card>

      {/* 5 Prescription — optimized */}
      <Card className="rounded-2xl"><CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2">5. Prescription {optimized && <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-normal">{sharedPatient}</span>}</CardTitle></CardHeader><CardContent className="space-y-4">
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


      <div className="sticky bottom-4 flex justify-center gap-3 pt-2">
        <Button variant="outline" size="lg" className="h-11 px-8" onClick={()=>{ setSharedPatient(""); setSharedDoctor(""); setAppt(s=>({...s, reason:"", notes:""})); setRec(s=>({...s, chiefComplaint:"", diagnosis:""})); toast.info("Cancelled"); }}>Cancel</Button>
        <Button size="lg" className="h-11 px-8 shadow-lg" onClick={submitAll}>Save</Button>
      </div>
    </div>
  );
}
