"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import { createLab } from "@/lib/clinic-api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft } from "lucide-react";
export default function NewLabPage(){
  const session=useRequireRole("clinic_admin");
  const clinicId=session?.clinicId??"";
  const router=useRouter();
  const [saving,setSaving]=useState(false);
  const [f,setF]=useState({name:"",contactPerson:"",phone:"",email:"",password:"",confirmPassword:"",address:"",city:"",state:"",pincode:"",licenseNo:"",labType:""});
  const upd=(k:string,v:string)=>setF(s=>({...s,[k]:v}));
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault();
    if(!f.name.trim()) return toast.error("Lab Name is required");
    if(!f.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return toast.error("Valid Email is required");
    if(!f.password || f.password.length<8) return toast.error("Password must be at least 8 characters");
    if(f.password!==f.confirmPassword) return toast.error("Passwords do not match");
    setSaving(true);
    try{
      await createLab(clinicId,{name:f.name.trim(),contactPerson:f.contactPerson.trim()||null,phone:f.phone.trim()||null,email:f.email.trim(),password:f.password,address:f.address.trim()||null,city:f.city.trim()||null,state:f.state.trim()||null,pincode:f.pincode.trim()||null,licenseNo:f.licenseNo.trim()||null,labType:f.labType||null});
      toast.success("Lab created"); router.push("/clinic/labs");
    }catch(err){ toast.error(err instanceof Error?err.message:"Failed to create lab"); } finally{setSaving(false);}
  };
  return <div className="min-h-screen bg-background">
    <div className="sticky top-0 z-10 border-b bg-background"><div className="px-4 py-6 sm:px-6 lg:px-8 flex items-start gap-4"><Link href="/clinic/labs" className="mt-1 rounded-lg p-2 hover:bg-muted"><ChevronLeft size={20}/></Link><div><h1 className="text-2xl font-bold">New Lab</h1><p className="text-sm text-muted-foreground">Create a lab account for this clinic</p></div></div></div>
    <div className="px-4 py-8 sm:px-6 lg:px-8"><form onSubmit={submit} className="space-y-6 max-w-3xl">
      <Card><CardHeader><CardTitle className="text-base">Lab Details</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2"><Label>Lab Name *</Label><Input value={f.name} onChange={e=>upd("name",e.target.value)} placeholder="Enter lab name"/></div>
        <div className="grid gap-2"><Label>Lab Type</Label><Select value={f.labType} onValueChange={v=>upd("labType",v ?? "")}><SelectTrigger><SelectValue placeholder="Select type"/></SelectTrigger><SelectContent><SelectItem value="pathology">Pathology</SelectItem><SelectItem value="radiology">Radiology</SelectItem><SelectItem value="microbiology">Microbiology</SelectItem><SelectItem value="general">General</SelectItem></SelectContent></Select></div>
        <div className="grid gap-2"><Label>Contact Person</Label><Input value={f.contactPerson} onChange={e=>upd("contactPerson",e.target.value)} placeholder="Contact person"/></div>
        <div className="grid gap-2"><Label>Phone</Label><Input value={f.phone} onChange={e=>upd("phone",e.target.value)} placeholder="Phone"/></div>
        <div className="grid gap-2"><Label>Email *</Label><Input type="email" value={f.email} onChange={e=>upd("email",e.target.value)} placeholder="lab@example.com"/></div>
        <div className="grid gap-2"><Label>License No</Label><Input value={f.licenseNo} onChange={e=>upd("licenseNo",e.target.value)} placeholder="License number"/></div>
        <div className="grid gap-2"><Label>Password *</Label><Input type="password" value={f.password} onChange={e=>upd("password",e.target.value)} placeholder="Password"/></div>
        <div className="grid gap-2"><Label>Confirm Password *</Label><Input type="password" value={f.confirmPassword} onChange={e=>upd("confirmPassword",e.target.value)} placeholder="Confirm password"/></div>
        <div className="grid gap-2 md:col-span-2"><Label>Address</Label><Input value={f.address} onChange={e=>upd("address",e.target.value)} placeholder="Full address"/></div>
        <div className="grid gap-2"><Label>City</Label><Input value={f.city} onChange={e=>upd("city",e.target.value)} placeholder="City"/></div>
        <div className="grid gap-2"><Label>State</Label><Input value={f.state} onChange={e=>upd("state",e.target.value)} placeholder="State"/></div>
        <div className="grid gap-2"><Label>Pincode</Label><Input value={f.pincode} onChange={e=>upd("pincode",e.target.value)} placeholder="Pincode"/></div>
      </CardContent></Card>
      <Button type="submit" disabled={saving}>{saving?"Creating...":"Create Lab"}</Button>
    </form></div>
  </div>;
}
