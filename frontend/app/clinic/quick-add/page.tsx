"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { listPatients, listDoctors, listAppointments, type Patient, type Doctor } from "@/lib/clinic-api";
import { useRequireRole } from "@/hooks/use-clinic-session";

export default function QuickAddPage(){
  const session = useRequireRole("staff" as any);
  const clinicId = session?.clinicId ?? "";
  const [patients,setPatients]=useState<Patient[]>([]);
  const [doctors,setDoctors]=useState<Doctor[]>([]);
  useEffect(()=>{ if(!clinicId) return; listPatients(clinicId,{limit:100}).then(r=>setPatients(r.items)).catch(()=>{}); listDoctors(clinicId,{limit:100}).then(r=>setDoctors(r.items)).catch(()=>{}); },[clinicId]);

  return (
    <div className="flex flex-col gap-6">
      <div><h1 className="text-2xl font-bold tracking-tight">Quick Add</h1><p className="text-sm text-muted-foreground">All forms with inputs & dropdowns in one page.</p></div>
      <Tabs defaultValue="appointments">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="treatment">Treatment</TabsTrigger>
          <TabsTrigger value="prescription">Prescription</TabsTrigger>
          <TabsTrigger value="medicine">Medicine</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>
        <TabsContent value="appointments" className="mt-4"><AppointmentForm patients={patients} doctors={doctors} clinicId={clinicId}/></TabsContent>
        <TabsContent value="treatment" className="mt-4"><TreatmentForm patients={patients} doctors={doctors}/></TabsContent>
        <TabsContent value="prescription" className="mt-4"><PrescriptionForm patients={patients} doctors={doctors} clinicId={clinicId}/></TabsContent>
        <TabsContent value="medicine" className="mt-4"><MedicineForm/></TabsContent>
        <TabsContent value="billing" className="mt-4"><BillingForm patients={patients}/></TabsContent>
      </Tabs>
    </div>
  );
}

function AppointmentForm({patients, doctors, clinicId}:{patients:Patient[];doctors:Doctor[];clinicId:string}){
  const [v,setV]=useState({patient:"", doctor:"", date:"", time:"", reason:""});
  const submit=async()=>{ if(!v.patient||!v.doctor||!v.date||!v.time) return toast.error("Patient, doctor, date, time required");
    try{ const p=patients.find(x=>x.fullName===v.patient); const d=doctors.find(x=>x.name===v.doctor); await import("@/lib/clinic-api").then(m=>m.createAppointment(clinicId,{patientId:p!.patientId, doctorId:d!.doctorId, date:v.date, time:v.time, reason:v.reason})); toast.success("Appointment created"); }catch(e:any){toast.error(e.message);} };
  return <Card><CardHeader><CardTitle className="text-base">Appointments</CardTitle></CardHeader><CardContent className="space-y-4">
    <div className="grid sm:grid-cols-2 gap-4">
      <div><Label className="text-xs">Patient *</Label><select value={v.patient} onChange={e=>setV({...v,patient:e.target.value})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="">Select patient</option>{patients.map(p=><option key={p.patientId} value={p.fullName}>{p.fullName}</option>)}</select></div>
      <div><Label className="text-xs">Doctor *</Label><select value={v.doctor} onChange={e=>setV({...v,doctor:e.target.value})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="">Select doctor</option>{doctors.map(d=><option key={d.doctorId} value={d.name}>{d.name}</option>)}</select></div>
      <div><Label className="text-xs">Date *</Label><Input type="date" value={v.date} onChange={e=>setV({...v,date:e.target.value})} className="mt-1 h-9"/></div>
      <div><Label className="text-xs">Time *</Label><Input type="time" value={v.time} onChange={e=>setV({...v,time:e.target.value})} className="mt-1 h-9"/></div>
      <div className="sm:col-span-2"><Label className="text-xs">Reason</Label><Input value={v.reason} onChange={e=>setV({...v,reason:e.target.value})} className="mt-1 h-9" placeholder="e.g. Consultation"/></div>
    </div>
    <Button onClick={submit} className="h-9">Create Appointment</Button>
  </CardContent></Card>
}
function TreatmentForm({patients, doctors}:{patients:Patient[];doctors:Doctor[]}){
  const [v,setV]=useState({patient:"", doctor:"", diagnosis:"", treatment:"", medicines:"", followUp:""});
  const submit=()=>{ if(!v.patient||!v.diagnosis) return toast.error("Patient & diagnosis required"); toast.success("Treatment saved locally"); };
  return <Card><CardHeader><CardTitle className="text-base">Treatment</CardTitle></CardHeader><CardContent className="space-y-4">
    <div className="grid sm:grid-cols-2 gap-4">
      <div><Label className="text-xs">Patient *</Label><select value={v.patient} onChange={e=>setV({...v,patient:e.target.value})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="">Select patient</option>{patients.map(p=><option key={p.patientId} value={p.fullName}>{p.fullName}</option>)}</select></div>
      <div><Label className="text-xs">Doctor</Label><select value={v.doctor} onChange={e=>setV({...v,doctor:e.target.value})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="">Select doctor</option>{doctors.map(d=><option key={d.doctorId} value={d.name}>{d.name}</option>)}</select></div>
      <div><Label className="text-xs">Diagnosis *</Label><select value={v.diagnosis} onChange={e=>setV({...v,diagnosis:e.target.value})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="">Select</option><option>Fever</option><option>Infection</option><option>Other</option></select></div>
      <div><Label className="text-xs">Treatment</Label><select value={v.treatment} onChange={e=>setV({...v,treatment:e.target.value})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="">Select</option><option>Medication</option><option>Therapy</option><option>Surgery</option></select></div>
      <div><Label className="text-xs">Medicines</Label><Input value={v.medicines} onChange={e=>setV({...v,medicines:e.target.value})} className="mt-1 h-9"/></div>
      <div><Label className="text-xs">Follow-up</Label><Input type="date" value={v.followUp} onChange={e=>setV({...v,followUp:e.target.value})} className="mt-1 h-9"/></div>
    </div>
    <Button onClick={submit} className="h-9">Save Treatment</Button>
  </CardContent></Card>
}
function PrescriptionForm({patients, doctors, clinicId}:{patients:Patient[];doctors:Doctor[];clinicId:string}){
  const [v,setV]=useState({patient:"", doctor:"", diagnosis:"", medicine:"", dosage:""});
  const submit=async()=>{ if(!v.patient||!v.medicine) return toast.error("Patient & medicine required"); try{ const p=patients.find(x=>x.fullName===v.patient); const d=doctors.find(x=>x.name===v.doctor); await import("@/lib/clinic-api").then(m=>m.createPrescription(clinicId,{patientId:p!.patientId, doctorId:d?.doctorId, visitDate:new Date().toISOString().slice(0,10), diagnosis:v.diagnosis, medicines:[{name:v.medicine,dosage:v.dosage}]})); toast.success("Prescription created"); }catch(e:any){toast.error(e.message);} };
  return <Card><CardHeader><CardTitle className="text-base">Prescription</CardTitle></CardHeader><CardContent className="space-y-4">
    <div className="grid sm:grid-cols-2 gap-4">
      <div><Label className="text-xs">Patient *</Label><select value={v.patient} onChange={e=>setV({...v,patient:e.target.value})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="">Select patient</option>{patients.map(p=><option key={p.patientId} value={p.fullName}>{p.fullName}</option>)}</select></div>
      <div><Label className="text-xs">Doctor</Label><select value={v.doctor} onChange={e=>setV({...v,doctor:e.target.value})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="">Select doctor</option>{doctors.map(d=><option key={d.doctorId} value={d.name}>{d.name}</option>)}</select></div>
      <div><Label className="text-xs">Diagnosis</Label><Input value={v.diagnosis} onChange={e=>setV({...v,diagnosis:e.target.value})} className="mt-1 h-9"/></div>
      <div><Label className="text-xs">Medicine *</Label><select value={v.medicine} onChange={e=>setV({...v,medicine:e.target.value})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="">Select</option><option>Paracetamol</option><option>Antibiotic</option><option>Vitamin</option></select></div>
      <div><Label className="text-xs">Dosage</Label><Input value={v.dosage} onChange={e=>setV({...v,dosage:e.target.value})} placeholder="e.g. 1x daily 3 days" className="mt-1 h-9"/></div>
    </div>
    <Button onClick={submit} className="h-9">Create Prescription</Button>
  </CardContent></Card>
}
function MedicineForm(){
  const [v,setV]=useState({name:"", category:"", stock:"", price:""});
  return <Card><CardHeader><CardTitle className="text-base">Medicine</CardTitle></CardHeader><CardContent className="space-y-4">
    <div className="grid sm:grid-cols-2 gap-4">
      <div><Label className="text-xs">Medicine Name *</Label><Input value={v.name} onChange={e=>setV({...v,name:e.target.value})} className="mt-1 h-9"/></div>
      <div><Label className="text-xs">Category</Label><select value={v.category} onChange={e=>setV({...v,category:e.target.value})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="">Select</option><option>Tablet</option><option>Syrup</option><option>Injection</option></select></div>
      <div><Label className="text-xs">Stock</Label><Input type="number" value={v.stock} onChange={e=>setV({...v,stock:e.target.value})} className="mt-1 h-9"/></div>
      <div><Label className="text-xs">Price</Label><Input type="number" value={v.price} onChange={e=>setV({...v,price:e.target.value})} className="mt-1 h-9"/></div>
    </div>
    <Button onClick={()=> toast.success("Medicine saved (wire to pharmacy API)")} className="h-9">Save Medicine</Button>
  </CardContent></Card>
}
function BillingForm({patients}:{patients:Patient[]}){
  const [v,setV]=useState({patient:"", amount:"", method:"cash", notes:""});
  return <Card><CardHeader><CardTitle className="text-base">Billing</CardTitle></CardHeader><CardContent className="space-y-4">
    <div className="grid sm:grid-cols-2 gap-4">
      <div><Label className="text-xs">Patient *</Label><select value={v.patient} onChange={e=>setV({...v,patient:e.target.value})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="">Select patient</option>{patients.map(p=><option key={p.patientId} value={p.fullName}>{p.fullName}</option>)}</select></div>
      <div><Label className="text-xs">Amount *</Label><Input type="number" value={v.amount} onChange={e=>setV({...v,amount:e.target.value})} className="mt-1 h-9"/></div>
      <div><Label className="text-xs">Payment Method</Label><select value={v.method} onChange={e=>setV({...v,method:e.target.value})} className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option></select></div>
      <div className="sm:col-span-2"><Label className="text-xs">Notes</Label><Textarea value={v.notes} onChange={e=>setV({...v,notes:e.target.value})} rows={2}/></div>
    </div>
    <Button onClick={()=> toast.success("Billing saved (wire to billing API)")} className="h-9">Create Bill</Button>
  </CardContent></Card>
}
