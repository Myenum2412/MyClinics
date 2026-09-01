"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkles, Globe, MousePointerClick, ScanLine, Loader2 } from "lucide-react";

interface Msg { role: "user" | "assistant"; content: string }

export function EveAssistant({ clinicName, role }: { clinicName: string; role: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "assistant", content: `Hi, I'm Eve — your browser agent for ${clinicName} (${role}). Ask me to book, check patients, or drive the browser: "Go to /clinic/appointments and snapshot".` },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  async function send() {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");
    setMsgs((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      // Uses the browser-agent backend: /api/ai/eve — falls back to clinic AI if not configured
      const res = await fetch("/api/ai/eve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, clinicName, role }),
      });
      const data = await res.json();
      setMsgs((m) => [...m, { role: "assistant", content: data.reply ?? data.error ?? "No reply" }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: "assistant", content: String(e) }]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollTo({ top: 99999, behavior: "smooth" }), 100);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <Card className="flex flex-col h-[560px]">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2"><Sparkles className="size-5" /> Eve Browser Agent</CardTitle>
          <CardDescription>Powered by `npx shadcn add @agentcn/eve/browser-agent` + `eve` + `playwright` — `agent/agent.ts:1` `agent/tools/*`</CardDescription>
        </CardHeader>
        <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {msgs.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{m.content}</div>
            </div>
          ))}
          {loading && <div className="flex gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> thinking + browsing...</div>}
        </div>
        <div className="border-t p-3 flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder='Try: "Go to /clinic/patients and snapshot" or "Fees evalavu?" (Tanglish)' />
          <Button onClick={send} disabled={loading}>Send</Button>
        </div>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Browser Tools</CardTitle><CardDescription>Eve drives a real Chromium</CardDescription></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2"><Globe className="size-4" /> <code>browser_goto(url)</code></div>
          <div className="flex items-center gap-2"><ScanLine className="size-4" /> <code>browser_snapshot()</code></div>
          <div className="flex items-center gap-2"><MousePointerClick className="size-4" /> <code>browser_click(selector)</code> / <code>browser_type</code></div>
          <p className="text-xs text-muted-foreground pt-2">Model: `anthropic/claude-sonnet-4-6` in `agent/agent.ts:4` — swap to your NVIDIA omni `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning` via env.</p>
        </CardContent>
      </Card>
    </div>
  );
}
