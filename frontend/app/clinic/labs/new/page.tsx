"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import { LabForm, LabFormState } from "@/components/clinic/lab-form";

export default function NewLabPage() {
  const router=useRouter();
  const [saving,setSaving]=useState(false);
  const handleSave=(form:LabFormState)=>{
    setSaving(true);
    const labs=JSON.parse(localStorage.getItem("clinic_labs")||"[]");
    labs.push({...form,id:Date.now().toString()});
    localStorage.setItem("clinic_labs",JSON.stringify(labs));
    toast.success("Lab created");
    router.push("/clinic/labs");
  };
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 border-b bg-background">
        <div className="px-4 py-6 sm:px-6 lg:px-8 flex items-center gap-4">
          <Link href="/clinic/labs" className="p-2 hover:bg-muted rounded-lg"><ChevronLeft size={20} /></Link>
          <div><h1 className="text-2xl font-bold">New Lab</h1><p className="text-sm text-muted-foreground">Add a lab with contact details and basic format</p></div>
        </div>
      </div>
      <div className="px-4 py-8 sm:px-6 lg:px-8"><LabForm onSave={handleSave} onCancel={()=>router.push("/clinic/labs")} saving={saving} /></div>
    </div>
  );
}
