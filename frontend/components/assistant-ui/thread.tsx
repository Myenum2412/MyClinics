"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// Minimal assistant-ui Thread placeholder  real `npx assistant-ui init` would generate Thread + ThreadList + Composer + Message primitives
// This wraps the same /api/ai/eve omni backend so prod answers correctly
export function Thread() {
  const [msgs, setMsgs] = useState<{role:"user"|"assistant",content:string}[]>([{role:"assistant",content:"assistant-ui Thread ready  ask anything (Tanglish OK). Try: Hi / Fees evalavu? / Clinic timing?"}]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  async function send(){
    if(!input.trim()||loading) return;
    const t=input.trim(); setInput(""); setMsgs(m=>[...m,{role:"user",content:t}]); setLoading(true);
    try{ const r=await fetch("/api/ai/eve",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:t})}); const d=await r.json(); setMsgs(m=>[...m,{role:"assistant",content:d.reply}]) } finally{ setLoading(false) }
  }
  return <div className="flex flex-col h-full gap-3"><div className="flex-1 overflow-auto space-y-2 p-2">{msgs.map((m,i)=><div key={i} className={m.role==="user"?"text-right":"text-left"}><span className={m.role==="user"?"bg-primary text-primary-foreground px-3 py-1.5 rounded-xl text-sm inline-block":"bg-muted px-3 py-1.5 rounded-xl text-sm inline-block"}>{m.content}</span></div>)} {loading&&<span className="text-xs text-muted-foreground">assistant-ui thinking…</span>}</div><div className="flex gap-2"><Input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="assistant-ui composer  type and hit Enter" /><Button onClick={send}>Send</Button></div></div>;
}
