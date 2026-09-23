"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface LabFormState {
  labName: string; labCode: string; labType: string;
  contactPerson: string; mobile: string; alternateMobile: string; email: string;
  address: string; city: string; state: string; pincode: string;
  accreditation: string; workingHours: string; turnaroundTime: string; reportHeader: string; notes: string;
}
export const EMPTY_LAB: LabFormState = { labName:"", labCode:"", labType:"", contactPerson:"", mobile:"", alternateMobile:"", email:"", address:"", city:"", state:"", pincode:"", accreditation:"", workingHours:"", turnaroundTime:"", reportHeader:"", notes:"" };

function Section({title, children}: {title:string, children:React.ReactNode}) {
  return <Card><CardHeader className="pb-3"><CardTitle className="text-base">{title}</CardTitle></CardHeader><CardContent className="space-y-4">{children}</CardContent></Card>;
}
function Field({label, required, error, children}:{label:string, required?:boolean, error?:string, children:React.ReactNode}) {
  return <div className="space-y-2"><Label className="text-sm font-medium">{label}{required && <span className="text-destructive"> *</span>}</Label>{children}{error && <p className="text-xs text-destructive">{error}</p>}</div>;
}

export function LabForm({initial=EMPTY_LAB, saving, onSave, onCancel}:{initial?: LabFormState, saving?:boolean, onSave:(v:LabFormState)=>void, onCancel:()=>void}) {
  const [form,setForm]=useState<LabFormState>({...EMPTY_LAB,...initial});
  const [errors,setErrors]=useState<Record<string,string>>({});
  const set=(k:keyof LabFormState,v:string)=>setForm(p=>({...p,[k]:v}));
  const validate=()=>{
    const e:Record<string,string>={};
    if(!form.labName.trim()) e.labName="Lab name required";
    if(!form.mobile.trim()) e.mobile="Mobile required";
    else if(!/^[6-9]\d{9}$/.test(form.mobile.replace(/\D/g,""))) e.mobile="Invalid Indian mobile";
    if(form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email="Invalid email";
    setErrors(e); return Object.keys(e).length===0;
  };
  return (
    <form onSubmit={e=>{e.preventDefault(); if(validate()) onSave(form);}} className="space-y-6">
      <Section title="1. Lab Details">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Lab Name" required error={errors.labName}><Input value={form.labName} onChange={e=>set("labName",e.target.value)} placeholder="City Diagnostics" /></Field>
          <Field label="Lab Code"><Input value={form.labCode} onChange={e=>set("labCode",e.target.value)} placeholder="LAB-001" /></Field>
          <Field label="Lab Type"><Select value={form.labType} onValueChange={v=>set("labType",v ?? "")}><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger><SelectContent><SelectItem value="Pathology">Pathology</SelectItem><SelectItem value="Radiology">Radiology</SelectItem><SelectItem value="Both">Both</SelectItem><SelectItem value="Collection Center">Collection Center</SelectItem></SelectContent></Select></Field>
          <Field label="Accreditation"><Select value={form.accreditation} onValueChange={v=>set("accreditation",v ?? "")}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="NABL">NABL</SelectItem><SelectItem value="NABH">NABH</SelectItem><SelectItem value="ISO 15189">ISO 15189</SelectItem><SelectItem value="None">None</SelectItem></SelectContent></Select></Field>
        </div>
      </Section>
      <Section title="2. Contact Details">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Contact Person"><Input value={form.contactPerson} onChange={e=>set("contactPerson",e.target.value)} placeholder="Dr. Sharma" /></Field>
          <Field label="Mobile" required error={errors.mobile}><Input value={form.mobile} onChange={e=>set("mobile",e.target.value)} placeholder="9876543210" /></Field>
          <Field label="Alternate Mobile"><Input value={form.alternateMobile} onChange={e=>set("alternateMobile",e.target.value)} placeholder="9876543210" /></Field>
          <Field label="Email" error={errors.email}><Input type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="lab@example.com" /></Field>
          <Field label="Working Hours"><Input value={form.workingHours} onChange={e=>set("workingHours",e.target.value)} placeholder="8 AM - 8 PM" /></Field>
          <Field label="Turnaround Time"><Input value={form.turnaroundTime} onChange={e=>set("turnaroundTime",e.target.value)} placeholder="24 hours" /></Field>
        </div>
        <Field label="Report Header"><Input value={form.reportHeader} onChange={e=>set("reportHeader",e.target.value)} placeholder="Header text for reports" /></Field>
      </Section>
      <Section title="3. Address">
        <Field label="Address"><Textarea value={form.address} onChange={e=>set("address",e.target.value)} placeholder="Full address" rows={2} /></Field>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="City"><Input value={form.city} onChange={e=>set("city",e.target.value)} /></Field>
          <Field label="State"><Input value={form.state} onChange={e=>set("state",e.target.value)} /></Field>
          <Field label="Pincode"><Input value={form.pincode} onChange={e=>set("pincode",e.target.value)} placeholder="110001" /></Field>
        </div>
      </Section>
      <Section title="4. Notes">
        <Field label="Notes"><Textarea value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="Additional notes" rows={3} /></Field>
      </Section>
      <div className="flex gap-3 border-t pt-6">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <div className="flex-1" />
        <Button type="submit" disabled={saving}>{saving?"Saving...":"Save Lab"}</Button>
      </div>
    </form>
  );
}
