"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format-time";
import { PersonAvatar } from "@/components/clinic/person-avatar";
import { Download, History, ClipboardList, Pill, Stethoscope, Phone, CalendarDays, FileText, Sparkles, HeartPulse } from "lucide-react";
import type { Patient, MedicalRecordFile, MedicineRecord, Prescription, Appointment } from "@/lib/clinic-api";

export function PremiumOverviewSkeleton(){
  return <div className="space-y-4 animate-pulse">
    <div className="h-36 rounded-2xl bg-muted" />
    <div className="grid lg:grid-cols-3 gap-4">{[0,1,2].map(i=><div key={i} className="h-32 rounded-2xl bg-muted"/> )}</div>
  </div>
}
export function PremiumEmpty({icon:Icon=Sparkles,title,desc}:{icon?:any,title:string,desc:string}){
  return <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed bg-muted/20 px-6 py-10 text-center"><Icon className="size-8 text-muted-foreground/50"/><p className="text-sm font-medium">{title}</p><p className="text-xs text-muted-foreground max-w-xs">{desc}</p></div>
}
