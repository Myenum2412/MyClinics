"use client";

import { useEffect, useState, useRef } from "react";
import { useClinicSession } from "@/hooks/use-clinic-session";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Sparkles, Plus, Trash2, MessageSquare, Clock, Send, Loader2, Search, Zap } from "lucide-react";
import { PromptInput, PromptInputTextarea, PromptInputActions, PromptInputAction } from "@/components/nexus-ui/prompt-input";

interface Msg { role: "user" | "assistant"; content: string }
interface Chat { id: string; title: string; createdAt: string; messages: Msg[] }
const STORAGE_KEY = "clinic-ai-chats";

const SUGGESTIONS = ["Hi", "Fees evalavu bro?", "Clinic timing enna?", "Enakku appointment venum"];

export default function ClinicAiAssistantPage() {
  const { session, loading } = useClinicSession();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [q, setQ] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) try { const c = JSON.parse(raw) as Chat[]; setChats(c); if (c[0]) setActiveId(c[0].id); } catch {}
  }, []);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(chats)); }, [chats]);
  const active = chats.find((c) => c.id === activeId) ?? null;
  const filtered = chats.filter((c) => c.title.toLowerCase().includes(q.toLowerCase()));

  function newChat() {
    const id = Date.now().toString();
    const chat: Chat = { id, title: "New chat", createdAt: new Date().toISOString(), messages: [{ role: "assistant", content: "Vanakkam! I'm your premium clinic assistant — Tanglish ready. How can I help today?" }] };
    setChats((p) => [chat, ...p]); setActiveId(id);
  }
  function deleteChat(id: string) { setChats((p) => p.filter((c) => c.id !== id)); if (activeId === id) setActiveId(null); }

  async function send(value?: string) {
    const text = (value ?? input).trim();
    if (!text || !active || sending) return;
    setInput(""); setSending(true);
    setChats((p) => p.map((c) => c.id === active.id ? { ...c, title: c.messages.length <= 1 ? text.slice(0, 32) : c.title, messages: [...c.messages, { role: "user" as const, content: text }] } : c));
    try {
      const res = await fetch("/api/ai/eve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text, clinicName: "Meenu Care", role: session?.role }) });
      const data = await res.json();
      setChats((p) => p.map((c) => c.id === active.id ? { ...c, messages: [...c.messages, { role: "assistant", content: (data.reply as string) ?? "No reply" }] } : c));
    } catch (e) { setChats((p) => p.map((c) => c.id === active.id ? { ...c, messages: [...c.messages, { role: "assistant", content: String(e) }] } : c)); }
    finally { setSending(false); setTimeout(() => listRef.current?.scrollTo({ top: 99999, behavior: "smooth" }), 80); }
  }

  if (loading || !session) return <div className="p-8"><Skeleton className="h-64 w-full rounded-2xl" /></div>;

  return (
    <div className="h-[calc(100vh-96px)] flex gap-4 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 -m-4 lg:-m-8 p-4 lg:p-6">
      {/* Main Chat — premium clear */}
      <div className="flex-1 flex flex-col rounded-[24px] border bg-white/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] overflow-hidden">
        {/* Premium header */}
        <div className="h-[64px] shrink-0 flex items-center justify-between px-6 border-b bg-white/60 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-md"><Sparkles className="size-4 text-white" /></div>
            <div>
              <div className="flex items-center gap-2"><span className="font-semibold text-[15px]">AI Assistant</span><span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">● live</span><span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border">omni</span></div>
              <p className="text-xs text-muted-foreground">Meenu Care • {session.role} • Tanglish ready</p>
            </div>
          </div>
          <Button onClick={newChat} className="rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md hover:opacity-90 h-9 px-5"><Plus className="size-4" /> New chat</Button>
        </div>

        {!active ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="size-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-xl mb-4"><Sparkles className="size-8 text-white" /></div>
            <h2 className="text-xl font-semibold">How can I help today?</h2>
            <p className="text-sm text-muted-foreground max-w-md mt-1">Premium clear chat — ask in English or Tanglish. Your history stays on the right.</p>
            <div className="flex flex-wrap gap-2 justify-center mt-6">
              {SUGGESTIONS.map((s) => <button key={s} onClick={() => { newChat(); setTimeout(() => setInput(s), 100); }} className="px-4 py-2 rounded-full bg-white border shadow-sm text-sm hover:bg-violet-50 hover:border-violet-200 transition">{s}</button>)}
            </div>
            <Button onClick={newChat} className="mt-6 rounded-full">Start chatting</Button>
          </div>
        ) : (
          <>
            <div ref={listRef} className="flex-1 overflow-y-auto">
              <div className="max-w-[760px] mx-auto w-full px-6 py-8 space-y-6">
                {active.messages.map((m, i) => (
                  <div key={i} className={m.role === "user" ? "flex justify-end" : "flex gap-3"}>
                    {m.role === "assistant" && <div className="size-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shrink-0 mt-1"><Sparkles className="size-4 text-white" /></div>}
                    <div className={`max-w-[72%] rounded-[20px] px-5 py-3.5 text-[14px] leading-relaxed shadow-sm ${m.role === "user" ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-br-md" : "bg-white border text-foreground rounded-bl-md"}`}>{m.content}</div>
                  </div>
                ))}
                {sending && <div className="flex gap-3"><div className="size-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center"><Zap className="size-4 text-white" /></div><div className="bg-white border rounded-[20px] rounded-bl-md px-5 py-3.5 text-sm flex items-center gap-2"><Loader2 className="size-4 animate-spin text-violet-600" /> Thinking...</div></div>}
              </div>
            </div>
            <div className="p-4 bg-gradient-to-t from-white via-white to-transparent">
              <div className="max-w-[760px] mx-auto">
                <PromptInput onSubmit={send} className="shadow-xl rounded-[24px] border-violet-100 bg-white">
                  <PromptInputTextarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask anything — Hi / Fees evalavu bro? (Shift+Enter new line)" className="text-[14px]" />
                  <PromptInputActions>
                    <span className="text-[11px] text-muted-foreground hidden sm:block">Enter to send • Shift+Enter new line</span>
                    <Button size="icon" onClick={() => send()} disabled={sending || !input.trim()} className="size-9 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md disabled:opacity-40"><Send className="size-4" /></Button>
                  </PromptInputActions>
                </PromptInput>
                <p className="text-[10px] text-muted-foreground text-center mt-2">Premium • Clear • @nexus-ui/prompt-input • omni Tanglish</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right History — premium */}
      <div className="w-[340px] shrink-0 hidden lg:flex flex-col rounded-[20px] border bg-white/70 backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="p-4 border-b bg-white/50">
          <div className="flex items-center justify-between mb-3"><span className="font-semibold text-sm flex items-center gap-2"><Clock className="size-4 text-violet-600" /> History</span><span className="text-xs bg-violet-50 text-violet-700 px-2 py-1 rounded-full border">{chats.length}</span></div>
          <div className="relative"><Search className="size-4 absolute left-3 top-2.5 text-muted-foreground" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chats" className="w-full pl-9 pr-3 py-2 rounded-full bg-slate-50 border text-sm focus:outline-none focus:ring-2 focus:ring-violet-200" /></div>
        </div>
        <div className="flex-1 overflow-auto p-2 space-y-1">
          {filtered.length === 0 && <p className="text-xs text-muted-foreground p-6 text-center">No chats yet — start a new one</p>}
          {filtered.map((c) => (
            <div key={c.id} onClick={() => setActiveId(c.id)} className={`group p-3.5 rounded-2xl cursor-pointer border transition-all ${activeId === c.id ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white border-violet-600 shadow-md" : "bg-white hover:bg-slate-50 border-transparent hover:border-slate-200"}`}>
              <div className="flex items-start justify-between gap-2"><p className={`text-sm font-medium truncate pr-2 ${activeId === c.id ? "text-white" : ""}`}>{c.title}</p><button onClick={(e) => { e.stopPropagation(); deleteChat(c.id); }} className={`size-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 ${activeId === c.id ? "hover:bg-white/20 text-white" : "hover:bg-slate-100"}`}><Trash2 className="size-3.5" /></button></div>
              <p className={`text-xs truncate mt-1 ${activeId === c.id ? "text-white/80" : "text-muted-foreground"}`}>{c.messages[c.messages.length - 1]?.content.slice(0, 60) ?? "—"}</p>
              <p className={`text-[11px] mt-1.5 ${activeId === c.id ? "text-white/60" : "text-muted-foreground"}`}>{new Date(c.createdAt).toLocaleDateString()} • {c.messages.length} msgs</p>
            </div>
          ))}
        </div>
        <div className="p-3 border-t bg-slate-50/50 text-[11px] text-muted-foreground">Stored locally • synced to Mongo for patients • Clear premium</div>
      </div>
    </div>
  );
}
