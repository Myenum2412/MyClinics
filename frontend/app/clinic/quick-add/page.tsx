"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listPatients, listDoctors, listAppointments, updateAppointment, deleteAppointment, createQuickAdd, createMedicine, type Patient, type Doctor, type Appointment, type AppointmentStatus } from "@/lib/clinic-api";
import { useRequireRole } from "@/hooks/use-clinic-session";
import { useDropdownOptions } from "@/lib/dropdown-options";
import { todayISO } from "@/lib/datetime";
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
  const { getOptions } = useDropdownOptions(clinicId);
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

  // 2. Examination — simple /clinic/examination form (details only)
  const [exam,setExam]=useState({
    visitDate:todayISO(), status:"pending", issueType:"", oralFindings:"", notes:"",
    chiefComplaints:[{complaint:"", duration:"", severity:"", notes:""}],
    medicalConditions:"", patientHistory:"", habits:"",
    hpiPresentingComplaint:"",
  });
  // 3. Investigation — simple /clinic/investigation form (details only)
  const [inv,setInv]=useState({title:"", category:"vital-test", visitDate:todayISO(), status:"pending", notes:"", details:{} as Record<string,string>});
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
  // 4. Treatment — simple /clinic/complaints form (details only)
  const [trt,setTrt]=useState({followUpDate:"", finalDiagnosis:""});
  // 5. Prescription — simple /clinic/prescriptions form (details only)
  const [rx,setRx]=useState({diagnosis:"", notes:""});
  const [rxMeds,setRxMeds]=useState([{name:"", dosage:"", frequency:"", duration:"", instructions:""}]);
  const addRxMedicine=()=> setRxMeds(m=>[...m,{name:"", dosage:"", frequency:"", duration:"", instructions:""}]);
  const removeRxMedicine=(i:number)=> setRxMeds(m=> m.filter((_,idx)=> idx!==i));
  const setRxMedicine=(i:number,patch:Partial<typeof rxMeds[0]>)=> setRxMeds(m=> m.map((row,idx)=> idx===i? {...row,...patch}:row));
  // 6. Medicine — simple /clinic/pharmacy/medicines form (details only)
  const [med,setMed]=useState({name:"", genericName:"", brand:"", category:"", dosageForm:"", strength:"", unit:"", manufacturer:"", purchasePrice:"", sellingPrice:"", expiryDate:""});

  const medInstructions=getOptions("medicine_instructions");
  const medicinesOpts=getOptions("medicines");

  async function submitAll(){
    try{
      const pId=(name:string)=> patients.find(p=>p.fullName===name)?.patientId;
      const dId=(name:string)=> doctors.find(d=>d.name===name)?.doctorId;
      const patientId = pId(sharedPatient);
      const doctorId = dId(sharedDoctor);
      const clean=(v:string)=> v.trim() || null;

      // ── Examination ──
      const examTouched = exam.oralFindings.trim() || exam.issueType || exam.notes.trim()
        || exam.chiefComplaints.some(c=> c.complaint.trim()||c.duration.trim()||c.severity||c.notes.trim())
        || exam.medicalConditions.trim()||exam.patientHistory.trim()||exam.habits.trim()
        || exam.hpiPresentingComplaint.trim();
      if(examTouched && (!exam.issueType || exam.oralFindings.trim().length < 2)){
        toast.error("Examination needs issue type (Hard / Soft) and oral findings (min 2 characters)");
        return;
      }
      // ── Investigation ──
      const invDetailsTouched = Object.values(inv.details).some(v=> v.trim());
      const invTouched = inv.title.trim() || inv.notes.trim() || invDetailsTouched;
      if(invTouched && inv.title.trim().length < 2){
        toast.error("Investigation needs a title (min 2 characters)");
        return;
      }
      // ── Treatment ──
      const trtTouched = trt.finalDiagnosis.trim() || trt.followUpDate;
      if(trtTouched && !trt.finalDiagnosis.trim()){
        toast.error("Treatment needs Final Diagnosis");
        return;
      }
      // ── Prescription ──
      const validRxMeds = rxMeds.filter(m=> m.name.trim());
      const rxTouched = rx.diagnosis.trim() || rx.notes.trim() || rxMeds.some(m=> m.name.trim()||m.dosage.trim()||m.frequency.trim()||m.duration.trim()||m.instructions.trim());
      if(rxTouched && validRxMeds.length===0){
        toast.error("Add at least one medicine for Prescription");
        return;
      }
      // ── Medicine ──
      const medTouched = med.name.trim() || med.genericName.trim() || med.brand.trim() || med.category.trim()
        || med.dosageForm.trim() || med.strength.trim() || med.unit.trim() || med.manufacturer.trim()
        || med.purchasePrice.trim() || med.sellingPrice.trim() || med.expiryDate.trim();

      if(!examTouched && !invTouched && !trtTouched && !rxTouched && !medTouched){
        toast.error("Fill at least one section (Examination, Investigation, Treatment, Prescription or Medicine)");
        return;
      }
      if((examTouched || invTouched || rxTouched) && (!patientId || !doctorId)){
        toast.error("Select patient and doctor");
        return;
      }
      if(trtTouched && !sharedPatient){
        toast.error("Select patient for Treatment");
        return;
      }

      const payload: any = { patientId, doctorId };
      if(exam.issueType && exam.oralFindings.trim().length >= 2){
        const validComplaints = exam.chiefComplaints.map(c=>({ complaint: clean(c.complaint), duration: clean(c.duration), severity: c.severity || null, notes: clean(c.notes) })).filter(c=> c.complaint || c.duration || c.severity || c.notes);
        payload.examination = {
          visitDate: exam.visitDate, status: exam.status, issueType: exam.issueType,
          oralFindings: exam.oralFindings.trim(), notes: clean(exam.notes),
          medicalConditions: clean(exam.medicalConditions),
          patientHistory: clean(exam.patientHistory), habits: clean(exam.habits),
          hpi: { presentingComplaint: clean(exam.hpiPresentingComplaint) },
          chiefComplaints: validComplaints.length? validComplaints : null,
        };
      }
      if(inv.title.trim().length >= 2){
        const cleanDetails: Record<string,string> = {};
        for(const [k,v] of Object.entries(inv.details)){ if(v.trim()) cleanDetails[k]=v.trim(); }
        payload.investigation = { title: inv.title.trim(), category: inv.category, details: Object.keys(cleanDetails).length? cleanDetails : null, visitDate: inv.visitDate, status: inv.status, notes: inv.notes.trim() || null };
      }
      if(validRxMeds.length>0){
        payload.prescription = { diagnosis: rx.diagnosis||null, medicines: validRxMeds.map(m=>({ name: m.name.trim(), dosage: m.dosage.trim()||null, frequency: m.frequency.trim()||null, duration: m.duration.trim()||null, instructions: m.instructions.trim()||null })), notes: rx.notes||null, visitDate: todayISO() };
      }

      // Single submit — backend creates all and sends ONE consolidated WhatsApp notification with full data (quick-add only)

      let quickAddRan = false;
      if(payload.examination || payload.investigation || payload.prescription){
        await createQuickAdd(clinicId, payload);
        quickAddRan = true;

      }
      if(trtTouched){
        try{
          const existing = JSON.parse(localStorage.getItem("treatment_combined") || "[]");
          const entry = {
            id: `TR-${Date.now()}`,
            createdAt: new Date().toISOString(),
            patient: sharedPatient,
            type: "record",
            data: {
              Patient: sharedPatient,
              "Visit Date & Time": todayISO(),
              Doctor: sharedDoctor,
              "Follow-up Date": trt.followUpDate,
              "Follow-up Schedule": trt.followUpDate,
              Diagnosis: trt.finalDiagnosis.trim(),
              "Diagnosis / Clinical Impression": trt.finalDiagnosis.trim(),
            },
          };
          localStorage.setItem("treatment_combined", JSON.stringify([entry, ...(Array.isArray(existing)?existing:[])]));

        }catch{ /* local-only; ignore parse errors */ }
      }
      if(medTouched){
        await createMedicine(clinicId, {
          name: med.name.trim(),
          genericName: med.genericName.trim() || null,
          brand: med.brand.trim() || null,
          category: med.category.trim() || null,
          dosageForm: med.dosageForm.trim() || null,
          strength: med.strength.trim() || null,
          unit: med.unit.trim() || null,
          manufacturer: med.manufacturer.trim() || null,
          purchasePrice: med.purchasePrice.trim() === "" ? 0 : Number(med.purchasePrice),
          sellingPrice: med.sellingPrice.trim() === "" ? 0 : Number(med.sellingPrice),
          expiryDate: med.expiryDate || null,
          prescriptionRequired: false, reorderLevel: 0, minStockLevel: 0, taxPercent: 0, discount: 0, status: "active",
        });
      }
      toast.success(quickAddRan ? "Quick Fill saved — single notification sent" : "Saved successfully");
    }catch(e:any){ toast.error(e.message); }
  }

  const optimized = sharedPatient && sharedDoctor;

  return (
    <div className="flex flex-col gap-6">
      {/* Premium header — patient optimized */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-violet-500/5 p-6">
        <h1 className="text-lg font-semibold tracking-tight">Quick Add — Fill blanks</h1>
        <p className="mt-1 text-sm text-muted-foreground">Select patient — doctor auto-shows. Fill the cards below — nothing is saved until you press Save.</p>
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

      {/* 2 Examination — simple /clinic/examination form (details only) */}
      <Card className="rounded-2xl"><CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2">2. Examination — Oral Findings {optimized && <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-normal">{sharedPatient}</span>}</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label className="text-xs">Visit date *</Label><Input type="date" value={exam.visitDate} onChange={e=>setExam({...exam,visitDate:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Status</Label><select value={exam.status} onChange={e=>setExam({...exam,status:e.target.value})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="pending">Pending</option><option value="in-progress">In Progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>
          <div><Label className="text-xs">Issue type *</Label><select value={exam.issueType} onChange={e=>setExam({...exam,issueType:e.target.value})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="">Select (Hard / Soft)</option><option value="hard">Hard</option><option value="soft">Soft</option></select></div>
          <div className="sm:col-span-2"><Label className="text-xs">Chief Complaint</Label><Textarea value={exam.chiefComplaints[0]?.complaint ?? ""} onChange={e=>setExam(s=>({...s, chiefComplaints: s.chiefComplaints.length ? s.chiefComplaints.map((row,i)=> i===0 ? {...row, complaint:e.target.value} : row) : [{complaint:e.target.value,duration:"",severity:"",notes:""}]}))} rows={2} placeholder="Enter the patient's chief complaint…"/></div>
          <div className="sm:col-span-2"><Label className="text-xs">Oral findings *</Label><Textarea value={exam.oralFindings} onChange={e=>setExam({...exam,oralFindings:e.target.value})} rows={2} placeholder="Describe the oral examination findings…"/></div>
          <div className="sm:col-span-2"><Label className="text-xs">Notes</Label><Textarea value={exam.notes} onChange={e=>setExam({...exam,notes:e.target.value})} rows={2} placeholder="Additional notes for this examination…"/></div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><Label className="text-xs">History of Presenting Illness</Label><Textarea value={exam.hpiPresentingComplaint} onChange={e=>setExam({...exam,hpiPresentingComplaint:e.target.value})} rows={4} placeholder="Describe the history of presenting illness…"/></div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><Label className="text-xs">Medical Information</Label><Textarea value={exam.medicalConditions} onChange={e=>setExam({...exam,medicalConditions:e.target.value})} rows={2} placeholder="Diabetes, Hypertension…"/></div>
          <div className="sm:col-span-2"><Label className="text-xs">Dental History</Label><Textarea value={exam.patientHistory} onChange={e=>setExam({...exam,patientHistory:e.target.value})} rows={2} placeholder="Past dental treatments, extractions, braces…"/></div>
          <div className="sm:col-span-2"><Label className="text-xs">Habits</Label><Textarea value={exam.habits} onChange={e=>setExam({...exam,habits:e.target.value})} rows={2} placeholder="Smoking, alcohol, diet…"/></div>
        </div>
      </CardContent></Card>

      {/* 3 Investigation — simple /clinic/investigation form (details only) */}
      <Card className="rounded-2xl"><CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2">3. Investigation {optimized && <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-normal">{sharedPatient}</span>}</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><Label className="text-xs">Title *</Label><Input value={inv.title} onChange={e=>setInv({...inv,title:e.target.value})} placeholder={INV_TITLE_PLACEHOLDERS[inv.category] ?? "e.g. IOPA — 46"} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Report type</Label><select value={inv.category} onChange={e=>setInv({...inv,category:e.target.value, details:{}})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="vital-test">Vital Test</option><option value="x-ray">X-Ray</option><option value="blood-report">Blood Report</option><option value="biopsy">Biopsy</option><option value="other">Other</option></select></div>
          <div><Label className="text-xs">Visit date *</Label><Input type="date" value={inv.visitDate} onChange={e=>setInv({...inv,visitDate:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Status</Label><select value={inv.status} onChange={e=>setInv({...inv,status:e.target.value})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="pending">Pending</option><option value="in-progress">In Progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>
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
      </CardContent></Card>

      {/* 4 Treatment — simple /clinic/complaints form (details only) */}
      <Card className="rounded-2xl"><CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2">4. Treatment {optimized && <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-normal">{sharedPatient}</span>}</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label className="text-xs">Follow-up Date</Label><select value={trt.followUpDate} onChange={e=>setTrt({...trt,followUpDate:e.target.value})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="">Select follow-up</option><option value="Follow-up in 3 days">Follow-up in 3 days</option><option value="Follow-up in 7 days">Follow-up in 7 days</option><option value="Follow-up in 14 days">Follow-up in 14 days</option></select></div>
          <div className="sm:col-span-2"><Label className="text-xs">Final Diagnosis *</Label><Textarea value={trt.finalDiagnosis} onChange={e=>setTrt({...trt,finalDiagnosis:e.target.value})} rows={3} placeholder="Type final diagnosis notes..." className="mt-1"/></div>
        </div>
      </CardContent></Card>

      {/* 5 Prescription — simple /clinic/prescriptions form (details only) */}
      <Card className="rounded-2xl"><CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2">5. Prescription {optimized && <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-normal">{sharedPatient}</span>}</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><Label className="text-xs">Diagnosis</Label><Input value={rx.diagnosis} onChange={e=>setRx({...rx,diagnosis:e.target.value})} className="mt-1 h-9"/></div>
        </div>
        <div className="rounded-xl border p-3 space-y-3">
          <div className="flex items-center justify-between"><p className="text-xs font-semibold">Medicines * (at least 1) — select + Add More</p><Button type="button" variant="outline" size="sm" onClick={addRxMedicine}>+ Add More</Button></div>
          {rxMeds.map((m,i)=> (
            <div key={i} className="grid sm:grid-cols-5 gap-2 items-end">
              <select value={m.name} onChange={e=>setRxMedicine(i,{name:e.target.value})} className="h-9 rounded-xl border border-border bg-card px-3 text-sm"><option value="">Medicine *</option>{medicinesOpts.map(mm=><option key={mm} value={mm}>{mm}</option>)}</select>
              <Input value={m.dosage} onChange={e=>setRxMedicine(i,{dosage:e.target.value})} placeholder="Dosage"/>
              <Input value={m.frequency} onChange={e=>setRxMedicine(i,{frequency:e.target.value})} placeholder="Frequency"/>
              <Input value={m.duration} onChange={e=>setRxMedicine(i,{duration:e.target.value})} placeholder="Duration"/>
              <div className="flex gap-1">
                <select value={m.instructions} onChange={e=>setRxMedicine(i,{instructions:e.target.value})} className="h-9 flex-1 rounded-xl border border-border bg-card px-3 text-sm"><option value="">Instructions</option>{medInstructions.map(x=><option key={x} value={x}>{x}</option>)}</select>
                {rxMeds.length>1 && <Button type="button" variant="ghost" size="sm" onClick={()=>removeRxMedicine(i)}>✕</Button>}
              </div>
            </div>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><Label className="text-xs">Notes</Label><Textarea value={rx.notes} onChange={e=>setRx({...rx,notes:e.target.value})} rows={2}/></div>
        </div>
      </CardContent></Card>

      {/* 6 Medicine — simple /clinic/pharmacy/medicines form (details only) */}
      <Card className="rounded-2xl"><CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2">6. Medicine</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label className="text-xs">Medicine name *</Label><Input value={med.name} onChange={e=>setMed({...med,name:e.target.value})} placeholder="e.g. Paracetamol 650" className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Generic name</Label><Input value={med.genericName} onChange={e=>setMed({...med,genericName:e.target.value})} placeholder="e.g. Paracetamol" className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Brand</Label><Input value={med.brand} onChange={e=>setMed({...med,brand:e.target.value})} placeholder="e.g. Dolo" className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Category</Label><Input value={med.category} onChange={e=>setMed({...med,category:e.target.value})} placeholder="e.g. Analgesic" className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Dosage form</Label><Input value={med.dosageForm} onChange={e=>setMed({...med,dosageForm:e.target.value})} placeholder="e.g. Tablet, Syrup" className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Strength</Label><Input value={med.strength} onChange={e=>setMed({...med,strength:e.target.value})} placeholder="e.g. 650 mg" className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Unit</Label><Input value={med.unit} onChange={e=>setMed({...med,unit:e.target.value})} placeholder="e.g. Tablet, Bottle" className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Manufacturer</Label><Input value={med.manufacturer} onChange={e=>setMed({...med,manufacturer:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Purchase price</Label><Input type="number" min="0" value={med.purchasePrice} onChange={e=>setMed({...med,purchasePrice:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Selling price</Label><Input type="number" min="0" value={med.sellingPrice} onChange={e=>setMed({...med,sellingPrice:e.target.value})} className="mt-1 h-9"/></div>
          <div><Label className="text-xs">Expiry date</Label><Input type="date" value={med.expiryDate} onChange={e=>setMed({...med,expiryDate:e.target.value})} className="mt-1 h-9"/></div>
        </div>
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

      <div className="sticky bottom-4 flex justify-center gap-3 pt-2">
        <Button variant="outline" size="lg" className="h-11 px-8" onClick={()=>{ setSharedPatient(""); setSharedDoctor(""); setExam({visitDate:todayISO(), status:"pending", issueType:"", oralFindings:"", notes:"", chiefComplaints:[{complaint:"", duration:"", severity:"", notes:""}], medicalConditions:"", patientHistory:"", habits:"", hpiPresentingComplaint:""}); setInv({title:"", category:"vital-test", visitDate:todayISO(), status:"pending", notes:"", details:{}}); setTrt({followUpDate:"", finalDiagnosis:""}); setRx({diagnosis:"", notes:""}); setRxMeds([{name:"", dosage:"", frequency:"", duration:"", instructions:""}]); setMed({name:"", genericName:"", brand:"", category:"", dosageForm:"", strength:"", unit:"", manufacturer:"", purchasePrice:"", sellingPrice:"", expiryDate:""}); toast.info("Cancelled"); }}>Cancel</Button>
        <Button size="lg" className="h-11 px-8 shadow-lg" onClick={submitAll}>Save</Button>
      </div>
    </div>
  );
}
