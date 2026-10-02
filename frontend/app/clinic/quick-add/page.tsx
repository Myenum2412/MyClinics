"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listPatients, listDoctors, listAppointments, listRecords, updateAppointment, createQuickAdd, type Patient, type Doctor, type Appointment, type MedicineRecord } from "@/lib/clinic-api";
import { useRequireRole } from "@/hooks/use-clinic-session";
import { useDropdownOptions } from "@/lib/dropdown-options";
import { todayISO } from "@/lib/datetime";

// Load odontogram + its CSS only when the "Other" investigation chart opens —
// same lazy module as /clinic/investigation and /clinic/examination.
const OdontogramShell = dynamic(
  () => import("../investigation/odontogram-lazy").then((m) => m.OdontogramShell),
  { ssr: false, loading: () => <div className="h-[420px] animate-pulse rounded-xl bg-muted/40" /> }
);

async function odontogramApi() {
  return import("../investigation/odontogram-lazy");
}

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

  // Shared patient/doctor live only in the header above — sections reuse them,
  // so no per-section patient/doctor mirrors.
  const [rec,setRec]=useState({visitDate:todayISO(), visitTime:"09:00", followUpDate:"", chiefComplaint:"", symptoms:"", diagnosis:"", icdCode:"", treatment:"", advice:"", bp:"", temp:"", pulse:"", allergies:"", labTests:"", internalNotes:""});
  const [rx,setRx]=useState({diagnosis:"", notes:""});
  // Prescription medicines — multi-select rows like /clinic/prescriptions (at least 1)
  const [rxMeds,setRxMeds]=useState([{name:"", dosage:"", frequency:"", duration:"", instructions:""}]);
  const addRxMedicine=()=> setRxMeds(m=>[...m,{name:"", dosage:"", frequency:"", duration:"", instructions:""}]);
  const removeRxMedicine=(i:number)=> setRxMeds(m=> m.filter((_,idx)=> idx!==i));
  const setRxMedicine=(i:number,patch:Partial<typeof rxMeds[0]>)=> setRxMeds(m=> m.map((row,idx)=> idx===i? {...row,...patch}:row));
  // Examination — full /clinic/examination form (patient/doctor come from the shared header)
  const [exam,setExam]=useState({
    visitDate:todayISO(), status:"pending", issueType:"", oralFindings:"", notes:"",
    chiefComplaints:[{complaint:"", duration:"", severity:"", notes:""}],
    bloodPressure:"", temperature:"", pulse:"", respiratoryRate:"", spo2:"",
    allergies:"", medicalConditions:"", previousSurgeries:"", currentMedications:"", patientHistory:"", familyHistory:"", habits:"",
    hpiPresentingComplaint:"", hpiOnset:"", hpiDurationValue:"", hpiDurationUnit:"", hpiProgression:"", hpiSymptoms:"", hpiAggravatingFactors:"", hpiRelievingFactors:"", hpiAssociatedSymptoms:"", hpiPreviousTreatment:"", hpiAdditionalNotes:"",
  });
  const setExamComplaint=(i:number,patch:Partial<typeof exam.chiefComplaints[0]>)=> setExam(s=>({...s, chiefComplaints: s.chiefComplaints.map((row,idx)=> idx===i? {...row,...patch}:row)}));
  // Investigation — full /clinic/investigation form (incl. odontogram for "Other" + record link)
  const [inv,setInv]=useState({title:"", category:"vital-test", visitDate:todayISO(), status:"pending", notes:"", medicalRecordId:"", showChart:true, details:{} as Record<string,string>});
  const [invRecords,setInvRecords]=useState<MedicineRecord[]>([]);
  const [invRecordsLoading,setInvRecordsLoading]=useState(false);
  // Linked-record picker options follow the shared patient (same as /clinic/investigation).
  useEffect(()=>{
    if(!clinicId) return;
    const pid=patients.find(p=>p.fullName===sharedPatient)?.patientId;
    if(!pid){ setInvRecords([]); setInv(s=> s.medicalRecordId ? {...s, medicalRecordId:""} : s); return; }
    setInvRecordsLoading(true);
    listRecords(clinicId,{patientId:pid,limit:50}).then(r=>setInvRecords((r as any)?.items ?? [])).catch(()=>setInvRecords([])).finally(()=>setInvRecordsLoading(false));
  },[clinicId, patients, sharedPatient]);
  const INV_FIELDS: Record<string, Array<{key:string;label:string;placeholder:string}>> = {
    "vital-test": [
      { key: "bloodPressure", label: "Blood pressure", placeholder: "e.g. 120/80 mmHg" },
      { key: "temperature", label: "Temperature", placeholder: "e.g. 98.6 °F" },
      { key: "pulse", label: "Pulse", placeholder: "e.g. 72 bpm" },
      { key: "respiratoryRate", label: "Respiratory rate", placeholder: "e.g. 16 /min" },
      { key: "spo2", label: "SpO₂", placeholder: "e.g. 98 %" },
      { key: "height", label: "Height", placeholder: "e.g. 170 cm" },
      { key: "weight", label: "Weight", placeholder: "e.g. 68 kg" },
      { key: "bloodSugar", label: "Blood sugar", placeholder: "e.g. 110 mg/dL (fasting)" },
    ],
    "x-ray": [
      { key: "xrayType", label: "X-ray type", placeholder: "e.g. IOPA, OPG, CBCT, Chest" },
      { key: "region", label: "Region / tooth", placeholder: "e.g. 46, upper arch" },
      { key: "findings", label: "Findings", placeholder: "Radiographic findings…" },
      { key: "impression", label: "Impression", placeholder: "Radiologist impression…" },
    ],
    "blood-report": [
      { key: "testPanel", label: "Test / panel", placeholder: "e.g. CBC, FBS, Lipid profile, HbA1c" },
      { key: "hemoglobin", label: "Hemoglobin", placeholder: "e.g. 13.5 g/dL" },
      { key: "wbc", label: "WBC count", placeholder: "e.g. 7,200 /µL" },
      { key: "platelets", label: "Platelet count", placeholder: "e.g. 2.4 L/µL" },
      { key: "esr", label: "ESR", placeholder: "e.g. 12 mm/hr" },
      { key: "fastingSugar", label: "Fasting sugar", placeholder: "e.g. 95 mg/dL" },
      { key: "ppSugar", label: "PP sugar", placeholder: "e.g. 130 mg/dL" },
      { key: "remarks", label: "Remarks", placeholder: "Pathologist remarks…" },
    ],
    "biopsy": [
      { key: "biopsySite", label: "Biopsy site", placeholder: "e.g. left buccal mucosa" },
      { key: "specimenType", label: "Specimen type", placeholder: "e.g. Incisional, Excisional, Punch, FNAC" },
      { key: "clinicalDiagnosis", label: "Clinical diagnosis", placeholder: "Provisional clinical diagnosis…" },
      { key: "grossFindings", label: "Gross findings", placeholder: "Specimen description…" },
      { key: "labName", label: "Referred lab", placeholder: "Lab name…" },
    ],
    "other": [],
  };
  const INV_TITLE_PLACEHOLDERS: Record<string,string> = {
    "vital-test": "e.g. Vitals — routine check",
    "x-ray": "e.g. IOPA — 46",
    "blood-report": "e.g. CBC + fasting sugar",
    "biopsy": "e.g. Biopsy — left buccal mucosa",
    "other": "e.g. Root canal assessment — 46",
  };


  const medInstructions=getOptions("medicine_instructions");
  const medicinesOpts=getOptions("medicines");

  async function submitAll(){
    try{
      const pId=(name:string)=> patients.find(p=>p.fullName===name)?.patientId;
      const dId=(name:string)=> doctors.find(d=>d.name===name)?.doctorId;
      const patientId = pId(sharedPatient);
      const doctorId = dId(sharedDoctor);
      if(!patientId || !doctorId){
        toast.error("Select patient and doctor");
        return;
      }
      const payload: any = { patientId, doctorId };
      const recTouched = rec.diagnosis.trim() || rec.chiefComplaint.trim();
      if(recTouched && !(rec.diagnosis.trim() && rec.chiefComplaint.trim())){
        toast.error("Records needs both diagnosis and chief complaint");
        return;
      }
      if(rec.diagnosis.trim() && rec.chiefComplaint.trim()){
        payload.record = { visitDate: rec.visitDate, visitTime: rec.visitTime, diagnosis: rec.diagnosis, chiefComplaint: rec.chiefComplaint, symptoms: rec.symptoms||null, treatment: rec.treatment||null, advice: rec.advice||null, icdCode: rec.icdCode||null, bp: rec.bp||null, temp: rec.temp||null, pulse: rec.pulse||null, allergies: rec.allergies||null, labTests: rec.labTests||null, internalNotes: rec.internalNotes||null, followUpDate: rec.followUpDate||null };
      }
      // Prescription — multi-medicine select like /clinic/prescriptions (at least 1).
      const validRxMeds = rxMeds.filter(m=> m.name.trim());
      const rxTouched = rx.diagnosis.trim() || rx.notes.trim() || rxMeds.some(m=> m.name.trim()||m.dosage.trim()||m.frequency.trim()||m.duration.trim()||m.instructions.trim());
      if(rxTouched && validRxMeds.length===0){
        toast.error("Add at least one medicine for Prescription");
        return;
      }
      if(validRxMeds.length>0){
        payload.prescription = { diagnosis: rx.diagnosis||null, medicines: validRxMeds.map(m=>({ name: m.name.trim(), dosage: m.dosage.trim()||null, frequency: m.frequency.trim()||null, duration: m.duration.trim()||null, instructions: m.instructions.trim()||null })), notes: rx.notes||null, visitDate: todayISO() };
      }
      // Examination — same validation as /clinic/examination (issue type + oral findings min 2 chars).
      // Guard first: touched-but-incomplete sections error instead of silently dropping data.
      const examTouched = exam.oralFindings.trim() || exam.issueType || exam.notes.trim()
        || exam.chiefComplaints.some(c=> c.complaint.trim()||c.duration.trim()||c.severity||c.notes.trim())
        || exam.bloodPressure.trim()||exam.temperature.trim()||exam.pulse.trim()||exam.respiratoryRate.trim()||exam.spo2.trim()
        || exam.allergies.trim()||exam.medicalConditions.trim()||exam.previousSurgeries.trim()||exam.currentMedications.trim()||exam.patientHistory.trim()||exam.familyHistory.trim()||exam.habits.trim()
        || exam.hpiPresentingComplaint.trim()||exam.hpiOnset||exam.hpiDurationValue.trim()||exam.hpiDurationUnit||exam.hpiProgression||exam.hpiSymptoms.trim()||exam.hpiAggravatingFactors.trim()||exam.hpiRelievingFactors.trim()||exam.hpiAssociatedSymptoms.trim()||exam.hpiPreviousTreatment.trim()||exam.hpiAdditionalNotes.trim();
      if(examTouched && (!exam.issueType || exam.oralFindings.trim().length < 2)){
        toast.error("Examination needs issue type (Hard / Soft) and oral findings (min 2 characters)");
        return;
      }
      if(exam.issueType && exam.oralFindings.trim().length >= 2){
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
      // Investigation — same validation as /clinic/investigation (title min 2 chars).
      // Odontogram chart always applies here, like the /clinic/examination form.
      const invDetailsTouched = Object.values(inv.details).some(v=> v.trim());
      const invTouched = inv.title.trim() || inv.notes.trim() || invDetailsTouched;
      if(invTouched && inv.title.trim().length < 2){
        toast.error("Investigation needs a title (min 2 characters)");
        return;
      }
      if(inv.title.trim().length >= 2){
        const cleanDetails: Record<string,string> = {};
        for(const [k,v] of Object.entries(inv.details)){ if(v.trim()) cleanDetails[k]=v.trim(); }
        let chartData: Record<string, unknown> | null = null;
        try {
          const { getStatusChart } = await odontogramApi();
          const chart = getStatusChart() as unknown;
          if(chart && typeof chart === "object") chartData = chart as Record<string, unknown>;
        } catch { chartData = null; }
        payload.investigation = { title: inv.title.trim(), category: inv.category, details: Object.keys(cleanDetails).length? cleanDetails : null, visitDate: inv.visitDate, status: inv.status, notes: inv.notes.trim() || null, medicalRecordId: inv.medicalRecordId || null, chartData };
      }
      if(!payload.record && !payload.prescription && !payload.examination && !payload.investigation){
        toast.error("Fill at least one section (Records, Examination, Investigation or Prescription)");
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
        <p className="mt-1 text-sm text-muted-foreground">Select patient — doctor auto-shows. All cards below reuse the shared patient and doctor.</p>
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

      {/* 2 Records — optimized, no duplicate patient (medicines live in Prescription below) */}
      <Card className="rounded-2xl"><CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2">2. Records {optimized && <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-normal">{sharedPatient}</span>}</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label className="text-xs">Visit date *</Label><Input type="date" value={rec.visitDate} onChange={e=>setRec({...rec,visitDate:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Visit time</Label><Input type="time" value={rec.visitTime} onChange={e=>setRec({...rec,visitTime:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Follow-up date</Label><Input type="date" value={rec.followUpDate} onChange={e=>setRec({...rec,followUpDate:e.target.value})} className="mt-1 h-9"/></div>
          <div className="sm:col-span-2"><Label className="text-xs">Chief complaint *</Label><Textarea value={rec.chiefComplaint} onChange={e=>setRec({...rec,chiefComplaint:e.target.value})} rows={2}/></div>
          <div className="sm:col-span-2"><Label className="text-xs">Symptoms</Label><Textarea value={rec.symptoms} onChange={e=>setRec({...rec,symptoms:e.target.value})} rows={2}/></div>
          <div><Label className="text-xs">Diagnosis *</Label><Input value={rec.diagnosis} onChange={e=>setRec({...rec,diagnosis:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">ICD Code</Label><Input value={rec.icdCode} onChange={e=>setRec({...rec,icdCode:e.target.value})} placeholder="e.g. I10" className="mt-1 h-9"/></div>
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

      {/* 3 Examination — full /clinic/examination form (details + complaints + vitals + medical + HPI) */}
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

      {/* 4 Investigation — full /clinic/investigation form (report details + record link + odontogram) */}
      <Card className="rounded-2xl"><CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2">4. Investigation {optimized && <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-normal">{sharedPatient}</span>}</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><Label className="text-xs">Title *</Label><Input value={inv.title} onChange={e=>setInv({...inv,title:e.target.value})} placeholder={INV_TITLE_PLACEHOLDERS[inv.category] ?? "e.g. IOPA — 46"} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Report type</Label><select value={inv.category} onChange={e=>setInv({...inv,category:e.target.value, details:{}})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="vital-test">Vital Test</option><option value="x-ray">X-Ray</option><option value="blood-report">Blood Report</option><option value="biopsy">Biopsy</option><option value="other">Other</option></select></div>
          <div><Label className="text-xs">Visit date *</Label><Input type="date" value={inv.visitDate} onChange={e=>setInv({...inv,visitDate:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Status</Label><select value={inv.status} onChange={e=>setInv({...inv,status:e.target.value})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="pending">Pending</option><option value="in-progress">In Progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>
          <div><Label className="text-xs">Linked medical record (optional)</Label><select value={inv.medicalRecordId} onChange={e=>setInv({...inv,medicalRecordId:e.target.value})} disabled={invRecordsLoading || !sharedPatient} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="">{!sharedPatient ? "Select a patient first" : invRecordsLoading ? "Loading records…" : "No linked record"}</option>{invRecords.map(r=><option key={r.recordId} value={r.recordId}>{r.visitDate} — {r.diagnosis}</option>)}</select></div>
          <div className="sm:col-span-2"><Label className="text-xs">Notes</Label><Textarea value={inv.notes} onChange={e=>setInv({...inv,notes:e.target.value})} rows={2} placeholder="Clinical notes for this investigation…"/></div>
        </div>
        {(INV_FIELDS[inv.category] ?? []).length>0 && (
          <div className="grid sm:grid-cols-2 gap-4">
            <p className="text-xs font-semibold sm:col-span-2">Report details — {inv.category}</p>
            {(INV_FIELDS[inv.category] ?? []).map(f=> (
              <div key={f.key}><Label className="text-xs">{f.label}</Label><Input value={inv.details[f.key] ?? ""} onChange={e=>setInv(s=>({...s, details:{...s.details, [f.key]:e.target.value}}))} placeholder={f.placeholder} className="mt-1 h-9"/></div>
            ))}
          </div>
        )}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">Dental odontogram</Label>
            <Button type="button" variant="ghost" size="sm" onClick={()=>setInv(s=>({...s, showChart:!s.showChart}))}>{inv.showChart ? "Hide" : "Show"}</Button>
          </div>
          {inv.showChart && (
            <div className="isolate overflow-auto rounded-xl border bg-white">
              <OdontogramShell key="quick-add-investigation" language="en" />
            </div>
          )}
        </div>
      </CardContent></Card>

      {/* 5 Prescription — select medicines */}
      <Card className="rounded-2xl"><CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2">5. Prescription {optimized && <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-normal">{sharedPatient}</span>}</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><Label className="text-xs">Diagnosis</Label><Input value={rx.diagnosis} onChange={e=>setRx({...rx,diagnosis:e.target.value})} className="mt-1 h-9"/></div>
        </div>
        <div className="rounded-xl border p-3 space-y-3">
          <div className="flex items-center justify-between"><p className="text-xs font-semibold">Medicines * (at least 1) — select + Add More</p><Button type="button" variant="outline" size="sm" onClick={addRxMedicine}>+ Add More</Button></div>
          {rxMeds.map((med,i)=> (
            <div key={i} className="grid sm:grid-cols-5 gap-2 items-end">
              <select value={med.name} onChange={e=>setRxMedicine(i,{name:e.target.value})} className="h-9 rounded-xl border border-border bg-card px-3 text-sm"><option value="">Medicine *</option>{medicinesOpts.map(m=><option key={m} value={m}>{m}</option>)}</select>
              <Input value={med.dosage} onChange={e=>setRxMedicine(i,{dosage:e.target.value})} placeholder="Dosage"/>
              <Input value={med.frequency} onChange={e=>setRxMedicine(i,{frequency:e.target.value})} placeholder="Frequency"/>
              <Input value={med.duration} onChange={e=>setRxMedicine(i,{duration:e.target.value})} placeholder="Duration"/>
              <div className="flex gap-1">
                <select value={med.instructions} onChange={e=>setRxMedicine(i,{instructions:e.target.value})} className="h-9 flex-1 rounded-xl border border-border bg-card px-3 text-sm"><option value="">Instructions</option>{medInstructions.map(x=><option key={x} value={x}>{x}</option>)}</select>
                {rxMeds.length>1 && <Button type="button" variant="ghost" size="sm" onClick={()=>removeRxMedicine(i)}>✕</Button>}
              </div>
            </div>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><Label className="text-xs">Notes</Label><Textarea value={rx.notes} onChange={e=>setRx({...rx,notes:e.target.value})} rows={2}/></div>
        </div>
      </CardContent></Card>


      <div className="sticky bottom-4 flex justify-center gap-3 pt-2">
        <Button variant="outline" size="lg" className="h-11 px-8" onClick={()=>{ setSharedPatient(""); setSharedDoctor(""); setRec(s=>({...s, chiefComplaint:"", diagnosis:""})); setRx(s=>({...s, diagnosis:"", notes:""})); setRxMeds([{name:"", dosage:"", frequency:"", duration:"", instructions:""}]); setExam({visitDate:todayISO(), status:"pending", issueType:"", oralFindings:"", notes:"", chiefComplaints:[{complaint:"", duration:"", severity:"", notes:""}], bloodPressure:"", temperature:"", pulse:"", respiratoryRate:"", spo2:"", allergies:"", medicalConditions:"", previousSurgeries:"", currentMedications:"", patientHistory:"", familyHistory:"", habits:"", hpiPresentingComplaint:"", hpiOnset:"", hpiDurationValue:"", hpiDurationUnit:"", hpiProgression:"", hpiSymptoms:"", hpiAggravatingFactors:"", hpiRelievingFactors:"", hpiAssociatedSymptoms:"", hpiPreviousTreatment:"", hpiAdditionalNotes:""}); setInv({title:"", category:"vital-test", visitDate:todayISO(), status:"pending", notes:"", medicalRecordId:"", showChart:true, details:{}}); toast.info("Cancelled"); }}>Cancel</Button>
        <Button size="lg" className="h-11 px-8 shadow-lg" onClick={submitAll}>Save</Button>
      </div>
    </div>
  );
}
