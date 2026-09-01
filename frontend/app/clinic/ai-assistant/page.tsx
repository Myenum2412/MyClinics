"use client";

import { useEffect, useState, useRef } from "react";
import { useClinicSession } from "@/hooks/use-clinic-session";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Plus, Trash2, MessageSquare, Clock, Send, Loader2 } from "lucide-react";

interface Msg { role: "user" | "assistant"; content: string }
interface Chat { id: string; title: string; createdAt: string; messages: Msg[] }

const STORAGE_KEY = "clinic-ai-chats";

export default function ClinicAiAssistantPage() {
  const { session, loading } = useClinicSession();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try { const c = JSON.parse(raw) as Chat[]; setChats(c); if (c[0]) setActiveId(c[0].id); } catch {}
    }
  }, []);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(chats)); }, [chats]);

  const active = chats.find((c) => c.id === activeId) ?? null;

  function newChat() {
    const id = Date.now().toString();
    const chat: Chat = { id, title: "New chat", createdAt: new Date().toISOString(), messages: [{ role: "assistant", content: "Hi, I'm your clinic AI — Tanglish OK! Ask: Hi / Fees evalavu? / Clinic timing? / Enakku appointment venum" }] };
    setChats((p) => [chat, ...p]); setActiveId(id);
  }
  function deleteChat(id: string) { setChats((p) => p.filter((c) => c.id !== id)); if (activeId === id) setActiveId(chats[0]?.id ?? null); }

  async function send() {
    if (!input.trim() || !active || sending) return;
    const text = input.trim(); setInput(""); setSending(true);
    const updated = chats.map((c) => c.id === active.id ? { ...c, title: c.messages.length <= 1 ? text.slice(0, 30) : c.title, messages: [...c.messages, { role: "user" as const, content: text }] } : c);
    setChats(updated);
    try {
      const res = await fetch("/api/ai/eve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text, clinicName: "Meenu Care", role: session?.role }) });
      const data = await res.json();
      const reply = (data.reply as string) ?? "No reply";
      setChats((p) => p.map((c) => c.id === active.id ? { ...c, messages: [...c.messages, { role: "assistant", content: reply }] } : c));
    } catch (e) {
      setChats((p) => p.map((c) => c.id === active.id ? { ...c, messages: [...c.messages, { role: "assistant", content: String(e) }] } : c));
    } finally { setSending(false); setTimeout(() => listRef.current?.scrollTo({ top: 99999, behavior: "smooth" }), 80); }
  }

  if (loading || !session) return <div className="p-8"><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="flex gap-4 h-[calc(100vh-120px)]">
      {/* Chat */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2"><Sparkles className="size-4 text-primary" /><span className="font-semibold text-sm">AI Assistant</span><span className="text-xs text-muted-foreground">Eve + omni • {session.role}</span></div>
          <Button size="sm" variant="outline" onClick={newChat}><Plus className="size-4" /> New chat</Button>
        </div>
        {!active ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center"><MessageSquare className="size-8 text-muted-foreground/40" /><p className="text-sm text-muted-foreground">Start a new chat from history on the right</p><Button onClick={newChat}>New chat</Button></div>
        ) : (
          <>
            <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {active.messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{m.content}</div>
                </div>
              ))}
              {sending && <div className="flex gap-2 text-xs text-muted-foreground"><Loader2 className="size-3 animate-spin" /> assistant thinking...</div>}
            </div>
            <div className="border-t p-3 flex gap-2">
              <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder='Ask: Hi / Fees evalavu bro? / Clinic enga irukku?' />
              <Button onClick={send} disabled={sending}><Send className="size-4" /></Button>
            </div>
          </>
        )}
      </Card>
      {/* History right side */}
      <Card className="w-[320px] shrink-0 flex flex-col overflow-hidden hidden lg:flex">
        <div className="border-b px-4 py-3 flex items-center justify-between">
          <span className="font-semibold text-sm flex items-center gap-2"><Clock className="size-4" /> History</span>
          <Button size="sm" variant="ghost" onClick={newChat}><Plus className="size-4" /></Button>
        </div>
        <div className="flex-1 overflow-auto">
          <div className="p-2 space-y-1">
            {chats.length === 0 && <p className="text-xs text-muted-foreground p-4 text-center">No chats yet</p>}
            {chats.map((c) => (
              <div key={c.id} onClick={() => setActiveId(c.id)} className={`group flex items-center justify-between rounded-lg px-3 py-2.5 cursor-pointer hover:bg-muted ${activeId === c.id ? "bg-muted border" : "border border-transparent"}`}>
                <div className="min-w-0">
                  <p className="text-sm truncate font-medium">{c.title}</p>
                  <p className="text-[11px] text-muted-foreground">{new Date(c.createdAt).toLocaleString()} • {c.messages.length} msgs</p>
                </div>
                <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); deleteChat(c.id); }}><Trash2 className="size-3.5" /></Button>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t p-3 text-[11px] text-muted-foreground">Stored locally • also in Mongo `wa_conversations` for patients • Eve `agent/*` + `assistant-ui` Thread</div>
      </Card>
    </div>
  );
}
