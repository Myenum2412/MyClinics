"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import { createLab } from "@/lib/clinic-api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, CheckCircle, AlertCircle, Copy, Check, KeyRound, Mail, ExternalLink } from "lucide-react";

export default function NewLabPage(){
  const session=useRequireRole("clinic_admin");
  const clinicId=session?.clinicId??"";
  const router=useRouter();
  const [saving,setSaving]=useState(false);
  const [saveError,setSaveError]=useState<string|null>(null);
  const [created,setCreated]=useState<{email:string,password:string,labName:string}|null>(null);
  const [copied,setCopied]=useState(false);
  const [f,setF]=useState({name:"",contactPerson:"",phone:"",email:"",password:"",confirmPassword:"",address:"",city:"",state:"",pincode:"",licenseNo:"",labType:""});
  const upd=(k:string,v:string)=>setF(s=>({...s,[k]:v}));
  const copyPw=(pw:string)=>{navigator.clipboard.writeText(pw).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});};
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault();
    if(!f.name.trim()) return toast.error("Lab Name is required");
    if(!f.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return toast.error("Valid Email is required");
    if(!f.password || f.password.length<8) return toast.error("Password must be at least 8 characters");
    if(f.password!==f.confirmPassword) return toast.error("Passwords do not match");
    setSaving(true);setSaveError(null);
    try{
      await createLab(clinicId,{name:f.name.trim(),contactPerson:f.contactPerson.trim()||null,phone:f.phone.trim()||null,email:f.email.trim(),password:f.password,address:f.address.trim()||null,city:f.city.trim()||null,state:f.state.trim()||null,pincode:f.pincode.trim()||null,licenseNo:f.licenseNo.trim()||null,labType:f.labType||null});
      setCreated({email:f.email.trim(),password:f.password,labName:f.name.trim()});
    }catch(err){const msg=err instanceof Error?err.message:"Failed to create lab";setSaveError(msg);toast.error(msg);} finally{setSaving(false);}
  };
  return <div className="min-h-screen bg-background">
    <div className="sticky top-0 z-10 border-b border-border bg-background">
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-4">
            <Link href="/clinic/labs" className="inline-flex items-center justify-center rounded-lg p-2 hover:bg-muted mt-1"><ChevronLeft size={20} className="text-muted-foreground"/></Link>
            <div><h1 className="text-2xl font-bold text-foreground">New Lab</h1><p className="text-sm text-muted-foreground mt-1">Register a new lab in your clinic</p></div>
          </div>
        </div>
      </div>
    </div>
    {saveError && <div className="px-4 sm:px-6 lg:px-8 pt-4"><div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"><AlertCircle className="mt-0.5 size-4 shrink-0"/><div><p className="font-semibold">Could not save lab</p><p className="mt-0.5 text-destructive/80">{saveError}</p></div><button className="ml-auto text-destructive/60 hover:text-destructive" onClick={()=>setSaveError(null)}>✕</button></div></div>}
    <div className="px-4 py-8 sm:px-6 lg:px-8"><form onSubmit={submit} className="space-y-6">
      <Card className="border-border bg-gradient-to-b from-muted/50 to-transparent"><CardHeader className="pb-3"><CardTitle className="text-base font-semibold text-foreground">1. Lab Information</CardTitle><p className="mt-1 text-sm text-muted-foreground">Basic lab details and contact</p></CardHeader><CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label className="text-sm font-medium">Lab Name <span className="text-destructive">*</span></Label><Input value={f.name} onChange={e=>upd("name",e.target.value)} placeholder="City Lab Diagnostics" className="border-border"/></div>
          <div className="space-y-2"><Label className="text-sm font-medium">Lab Type</Label><Select value={f.labType} onValueChange={v=>upd("labType",v ?? "")}><SelectTrigger className="border-border"><SelectValue placeholder="Select type"/></SelectTrigger><SelectContent><SelectItem value="pathology">Pathology</SelectItem><SelectItem value="radiology">Radiology</SelectItem><SelectItem value="microbiology">Microbiology</SelectItem><SelectItem value="general">General</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label className="text-sm font-medium">Contact Person</Label><Input value={f.contactPerson} onChange={e=>upd("contactPerson",e.target.value)} placeholder="Dr. John Doe" className="border-border"/></div>
          <div className="space-y-2"><Label className="text-sm font-medium">Phone</Label><Input value={f.phone} onChange={e=>upd("phone",e.target.value)} placeholder="9876543210" className="border-border"/></div>
          <div className="space-y-2"><Label className="text-sm font-medium">License No</Label><Input value={f.licenseNo} onChange={e=>upd("licenseNo",e.target.value)} placeholder="License number" className="border-border"/></div>
        </div>
      </CardContent></Card>
      <Card className="border-border bg-gradient-to-b from-muted/50 to-transparent"><CardHeader className="pb-3"><CardTitle className="text-base font-semibold">2. Address</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="space-y-2"><Label className="text-sm font-medium">Full Address</Label><Textarea value={f.address} onChange={e=>upd("address",e.target.value)} placeholder="Enter complete address" rows={3} className="border-border"/></div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2"><Label className="text-sm font-medium">City</Label><Input value={f.city} onChange={e=>upd("city",e.target.value)} placeholder="City" className="border-border"/></div>
          <div className="space-y-2"><Label className="text-sm font-medium">State</Label><Input value={f.state} onChange={e=>upd("state",e.target.value)} placeholder="State" className="border-border"/></div>
          <div className="space-y-2"><Label className="text-sm font-medium">Pincode</Label><Input value={f.pincode} onChange={e=>upd("pincode",e.target.value)} placeholder="Pincode" className="border-border"/></div>
        </div>
      </CardContent></Card>
      <Card className="border-border bg-gradient-to-b from-muted/50 to-transparent"><CardHeader className="pb-3"><CardTitle className="text-base font-semibold">3. Portal Access</CardTitle><p className="mt-1 text-sm text-muted-foreground">Lab login credentials — uses common login page</p></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2"><Label className="text-sm font-medium">Email <span className="text-destructive">*</span></Label><Input type="email" value={f.email} onChange={e=>upd("email",e.target.value)} placeholder="lab@example.com" className="border-border"/><p className="text-xs text-muted-foreground">Lab portal login username</p></div>
        <div className="hidden md:block"/>
        <div className="space-y-2"><Label className="text-sm font-medium">Password <span className="text-destructive">*</span></Label><Input type="password" value={f.password} onChange={e=>upd("password",e.target.value)} placeholder="••••••••" className="border-border"/><p className="text-xs text-muted-foreground">Minimum 8 characters</p></div>
        <div className="space-y-2"><Label className="text-sm font-medium">Confirm Password <span className="text-destructive">*</span></Label><Input type="password" value={f.confirmPassword} onChange={e=>upd("confirmPassword",e.target.value)} placeholder="••••••••" className="border-border"/></div>
      </CardContent></Card>
      <div className="flex gap-3 border-t border-border pt-8"><Button variant="outline" type="button" onClick={()=>router.push("/clinic/labs")} disabled={saving} className="border-primary/30 text-primary hover:bg-accent">Cancel</Button><div className="flex-1"/><Button type="submit" disabled={saving} size="lg">{saving?"Creating...":"Save Lab"}</Button></div>
    </form></div>
    <Dialog open={created!==null} onOpenChange={o=>{if(!o&&created){setCreated(null);router.push("/clinic/labs");}}}>
      <DialogContent className="sm:max-w-md"><DialogHeader><div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/10"><CheckCircle className="size-7 text-success"/></div><DialogTitle className="text-center text-lg">Lab Registered Successfully</DialogTitle><DialogDescription className="text-center">{created?.labName} has been added to your clinic.</DialogDescription></DialogHeader>
        {created && <div className="rounded-xl border border-border bg-accent/50 p-4 space-y-3">
          <div className="flex items-center gap-3"><span className="flex size-8 items-center justify-center rounded-lg bg-accent"><Mail className="size-4"/></span><div><p className="text-xs text-muted-foreground">Portal Login (Email)</p><p className="text-sm font-medium truncate">{created.email}</p></div></div>
          <div className="flex items-center gap-3"><span className="flex size-8 items-center justify-center rounded-lg bg-accent"><KeyRound className="size-4"/></span><div className="flex-1"><p className="text-xs text-muted-foreground">Password</p><p className="text-sm font-mono font-semibold tracking-wide">{created.password}</p></div><button type="button" onClick={()=>copyPw(created.password)} className="flex size-7 items-center justify-center rounded-md border bg-background">{copied?<Check className="size-3.5 text-success"/>:<Copy className="size-3.5 text-muted-foreground"/>}</button></div>
        </div>}
        <DialogFooter className="gap-2"><Button variant="outline" className="flex-1" onClick={()=>{setCreated(null);router.push("/clinic/labs");}}>Go to Labs</Button><Button className="flex-1 gap-1.5" onClick={()=>window.open("/login?callbackUrl=/clinic/lab","_blank")}><ExternalLink className="size-4"/>Open Lab Portal</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
