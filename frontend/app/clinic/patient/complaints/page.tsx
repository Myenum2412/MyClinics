"use client";
import { useState } from "react";
import { useRequireRole } from "@/hooks/use-clinic-session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Megaphone, Send, Clock, CheckCircle2, AlertTriangle, MessageSquare, ShieldCheck, Star } from "lucide-react";

type Status = "open" | "in_review" | "resolved" | "closed";
type Category = "treatment" | "staff" | "waiting" | "hygiene" | "billing" | "other";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "treatment", label: "Treatment / Care Quality" },
  { value: "staff", label: "Staff Behaviour" },
  { value: "waiting", label: "Waiting Time / Appointment" },
  { value: "hygiene", label: "Cleanliness / Facilities" },
  { value: "billing", label: "Billing / Charges" },
  { value: "other", label: "Other" },
];

const STATUS_STYLE: Record<Status, string> = {
  open: "bg-amber-50 text-amber-700 border-amber-200",
  in_review: "bg-blue-50 text-blue-700 border-blue-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

const MOCK = [
  { id: "CMP-1024", category: "treatment" as Category, title: "Pain after procedure not addressed", status: "in_review" as Status, date: "28 Aug 2026", response: "We have escalated to Dr. Ajay  you’ll get a call within 24h." },
  { id: "CMP-1019", category: "waiting" as Category, title: "45 min wait beyond appointment time", status: "resolved" as Status, date: "20 Aug 2026", response: "Apologies  slot timing revised. Thank you for feedback!" },
];

export default function PatientComplaintsPage() {
  useRequireRole("patient");
  const [category, setCategory] = useState<Category>("treatment");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [anonymous, setAnonymous] = useState(false);
  const [items, setItems] = useState(MOCK);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !details.trim()) { toast.error("Please fill subject and details"); return; }
    const next = { id: `CMP-${1000 + items.length + 1}`, category, title: title.trim(), status: "open" as Status, date: "01 Sep 2026", response: "" };
    setItems([next, ...items]);
    toast.success("Complaint submitted  clinic will review shortly");
    setTitle(""); setDetails("");
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-[22px] border border-purple-100 bg-gradient-to-br from-[#F5F3FF] via-[#EEF2FF] to-white p-5 sm:p-7">
        <div className="flex gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white shadow-md"><Megaphone className="size-6" /></span>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Complaints & Feedback</h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-2xl">Share concerns about your treatment or experience. Your feedback is confidential and reviewed by clinic management. For emergencies, contact the clinic directly.</p>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-medium text-slate-500">
              <span className="inline-flex items-center gap-1 rounded-full bg-white border border-purple-100 px-2.5 py-1"><ShieldCheck className="size-3.5 text-emerald-600" /> Private & secure</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white border border-purple-100 px-2.5 py-1"><Clock className="size-3.5 text-indigo-600" /> Response within 24–48h</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Form */}
        <form onSubmit={submit} className="lg:col-span-3 rounded-[20px] border border-purple-100/80 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><MessageSquare className="size-4 text-indigo-600" /> Submit a complaint</h2>
          <p className="text-xs text-slate-500 -mt-2">Be specific  include date, doctor/staff involved, and what happened. This helps us resolve faster.</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Category *</Label>
              <Select value={category} onValueChange={(v) => setCategory((v as Category) ?? "treatment")}>
                <SelectTrigger className="mt-1 h-10 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Severity</Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v ?? "medium")}>
                <SelectTrigger className="mt-1 h-10 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low  suggestion</SelectItem>
                  <SelectItem value="medium">Medium  concern</SelectItem>
                  <SelectItem value="high">High  urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground">Subject *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Follow-up was rushed, concerns not explained" className="mt-1 h-10 rounded-xl" maxLength={120} />
            <p className="mt-1 text-right text-[11px] text-slate-400">{title.length}/120</p>
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground">Details *</Label>
            <Textarea value={details} onChange={e => setDetails(e.target.value)} rows={5} placeholder="Describe what happened, when, and your expected resolution..." className="mt-1 rounded-xl" maxLength={1000} />
            <p className="mt-1 text-right text-[11px] text-slate-400">{details.length}/1000</p>
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <input type="checkbox" checked={anonymous} onChange={e => setAnonymous(e.target.checked)} className="rounded border-slate-300" />
            Submit anonymously (clinic sees details but not your name)
          </label>

          <div className="flex gap-2 pt-1">
            <Button type="submit" className="min-h-[44px] rounded-xl gap-2 bg-indigo-600 hover:bg-indigo-700"><Send className="size-4" /> Submit complaint</Button>
            <Button type="button" variant="outline" className="min-h-[44px] rounded-xl" onClick={() => { setTitle(""); setDetails(""); }}>Clear</Button>
          </div>
          <p className="text-[11px] text-slate-400">By submitting you agree the clinic may contact you for clarification. Abuse / false reports may be flagged.</p>
        </form>

        {/* History */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-bold text-slate-900">My complaints ({items.length})</h2>
          {items.map(c => (
            <div key={c.id} className="rounded-2xl border border-purple-100/80 bg-white p-4 shadow-2xs">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-mono text-slate-500">{c.id} · {c.date} · {CATEGORIES.find(x=>x.value===c.category)?.label}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 leading-snug line-clamp-2">{c.title}</p>
                </div>
                <Badge variant="outline" className={`shrink-0 rounded-full text-[11px] font-bold ${STATUS_STYLE[c.status]}`}>{c.status.replace("_"," ")}</Badge>
              </div>
              {c.response ? (
                <div className="mt-3 rounded-xl bg-indigo-50/70 border border-indigo-100 p-3 text-xs leading-relaxed text-slate-700">
                  <span className="font-bold text-indigo-700 flex items-center gap-1"><CheckCircle2 className="size-3.5" /> Clinic response:</span> {c.response}
                </div>
              ) : (
                <p className="mt-3 inline-flex items-center gap-1 text-xs text-amber-700"><AlertTriangle className="size-3.5" /> Awaiting review</p>
              )}
              <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
                <Star className="size-3" /> Rate resolution after closure (coming soon)
              </div>
            </div>
          ))}
          {items.length===0 && <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">No complaints yet  we hope it stays that way!</p>}
        </div>
      </div>
    </div>
  );
}
