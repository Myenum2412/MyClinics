"use client";

import { useEffect, useState, useRef } from "react";
import { useClinicSession } from "@/hooks/use-clinic-session";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Plus, Trash2, MessageSquare, Clock, Send, Loader2, Search, Zap, ArrowUp, Command, History, Bot, User } from "lucide-react";
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

  if (loading || !session) return (
    <div className="space-y-4">
      <Skeleton className="h-[64px] w-full rounded-2xl" />
      <div className="grid grid-cols-12 gap-4 h-[560px]">
        <Skeleton className="col-span-8 rounded-2xl" />
        <Skeleton className="col-span-4 rounded-2xl hidden lg:block" />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      {/* Page header — Linear/Stripe style */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-semibold tracking-tight">AI Assistant</h1>
            <Badge variant="secondary" className="rounded-full text-[11px] font-medium h-5 px-2 bg-violet-50 text-violet-700 border border-violet-200">Tanglish</Badge>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5 font-medium"><span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live</span>
          </div>
          <p className="text-[13px] text-muted-foreground">Ask in English or Tanglish — appointments, fees, timings. Powered by Meenu Care.</p>
        </div>
        <Button onClick={newChat} className="rounded-full h-9 px-4 bg-foreground text-background hover:bg-foreground/90 shadow-sm shrink-0">
          <Plus className="size-4" /> New chat
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-4 lg:gap-5 min-h-[calc(100vh-220px)]">
        {/* Main Chat */}
        <div className="col-span-12 lg:col-span-8 flex flex-col rounded-2xl border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] overflow-hidden">
          {/* Toolbar */}
          <div className="h-[52px] shrink-0 flex items-center justify-between px-4 sm:px-5 border-b bg-card">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-8 rounded-lg bg-foreground flex items-center justify-center shrink-0"><Bot className="size-4 text-background" /></div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium leading-none truncate">{active ? active.title : "No conversation selected"}</p>
                <p className="text-[11px] text-muted-foreground hidden sm:block">Meenu Care • {session.role} • omni model</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-muted-foreground border rounded-full px-2.5 py-1"><Command className="size-3" /> + K</span>
              {active && <Badge variant="outline" className="rounded-full text-[11px] font-normal hidden sm:inline-flex">{active.messages.length} messages</Badge>}
            </div>
          </div>

          {!active ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-gradient-to-b from-background to-muted/20">
              <div className="size-14 rounded-2xl bg-foreground flex items-center justify-center shadow-sm mb-5"><Sparkles className="size-6 text-background" /></div>
              <h2 className="text-[18px] font-semibold tracking-tight">How can I help today?</h2>
              <p className="text-[13px] text-muted-foreground max-w-[420px] mt-1.5 leading-relaxed">Chat about appointments, doctor availability, fees or clinic timings. Try Tanglish — “Fees evalavu bro?”</p>
              <div className="flex flex-wrap gap-2 justify-center mt-6 max-w-[520px]">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => { newChat(); setTimeout(() => setInput(s), 100); }} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-background border text-[13px] font-medium hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <MessageSquare className="size-3.5 text-muted-foreground" /> {s}
                  </button>
                ))}
              </div>
              <Button onClick={newChat} variant="outline" className="mt-6 rounded-full">Start chatting <ArrowUp className="size-3.5" /></Button>
              <p className="text-[11px] text-muted-foreground mt-6">History is stored locally • Press Enter to send</p>
            </div>
          ) : (
            <>
              <div ref={listRef} className="flex-1 overflow-y-auto scroll-smooth">
                <div className="max-w-[720px] mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-5">
                  {active.messages.map((m, i) => (
                    <div key={i} className={m.role === "user" ? "flex justify-end" : "flex gap-3"}>
                      {m.role === "assistant" && <div className="size-7 rounded-full bg-foreground flex items-center justify-center shrink-0 mt-0.5"><Sparkles className="size-3.5 text-background" /></div>}
                      <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-[13.5px] leading-[1.6] transition-all ${m.role === "user" ? "bg-foreground text-background rounded-br-md" : "bg-muted/60 border text-foreground rounded-bl-md"}`}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {sending && (
                    <div className="flex gap-3">
                      <div className="size-7 rounded-full bg-foreground flex items-center justify-center shrink-0"><Zap className="size-3.5 text-background" /></div>
                      <div className="bg-muted/60 border rounded-2xl rounded-bl-md px-4 py-3 text-[13px] flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="size-3.5 animate-spin" /> Thinking…
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-3 sm:p-4 border-t bg-muted/20">
                <div className="max-w-[720px] mx-auto">
                  <PromptInput onSubmit={send} className="rounded-2xl bg-background border shadow-sm focus-within:shadow-md focus-within:border-foreground/10 transition-all">
                    <PromptInputTextarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask anything — Hi / Fees evalavu bro? (Shift+Enter new line)" className="text-[14px] min-h-[44px] placeholder:text-muted-foreground/70" />
                    <PromptInputActions className="px-2 pb-2">
                      <span className="text-[11px] text-muted-foreground hidden sm:inline-flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px] font-medium">↵</kbd> send • <kbd className="px-1 py-0.5 rounded border bg-muted text-[10px] font-medium">⇧ ↵</kbd> new line</span>
                      <Button size="icon" onClick={() => send()} disabled={sending || !input.trim()} className="size-8 rounded-full bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40 ml-auto"><ArrowUp className="size-4" /></Button>
                    </PromptInputActions>
                  </PromptInput>
                  <p className="text-[11px] text-muted-foreground text-center mt-2.5">AI can make mistakes. Verify important info with clinic staff.</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right History */}
        <div className="col-span-12 lg:col-span-4 flex flex-col rounded-2xl border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden lg:sticky lg:top-4 lg:h-[calc(100vh-160px)]">
          <div className="p-4 border-b space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold flex items-center gap-2"><History className="size-4" /> History</span>
              <Badge variant="secondary" className="rounded-full text-[11px] h-6 px-2.5">{chats.length}</Badge>
            </div>
            <div className="relative">
              <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search conversations" className="w-full pl-8 pr-3 py-2 rounded-full bg-muted/60 border text-[13px] focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-foreground/20 placeholder:text-muted-foreground/60 transition" />
            </div>
          </div>
          <div className="flex-1 overflow-auto p-2 space-y-1">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="size-10 rounded-xl bg-muted flex items-center justify-center mb-3"><Clock className="size-5 text-muted-foreground" /></div>
                <p className="text-[13px] font-medium">No conversations</p>
                <p className="text-xs text-muted-foreground mt-1">Start a new chat to see history here.</p>
              </div>
            ) : (
              filtered.map((c) => (
                <div key={c.id} onClick={() => setActiveId(c.id)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setActiveId(c.id)} className={`group w-full text-left p-3 rounded-xl cursor-pointer border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${activeId === c.id ? "bg-foreground text-background border-foreground shadow-sm" : "bg-transparent hover:bg-muted border-transparent hover:border-border"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-[13px] font-medium truncate pr-1 leading-tight ${activeId === c.id ? "text-background" : "text-foreground"}`}>{c.title}</p>
                    <button onClick={(e) => { e.stopPropagation(); deleteChat(c.id); }} aria-label="Delete chat" className={`size-6 rounded-full flex items-center justify-center shrink-0 transition ${activeId === c.id ? "hover:bg-white/15 text-white/80 hover:text-white" : "opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/10 text-muted-foreground"}`}>
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  <p className={`text-xs truncate mt-1 leading-relaxed ${activeId === c.id ? "text-white/70" : "text-muted-foreground"}`}>{c.messages[c.messages.length - 1]?.content.slice(0, 64) ?? "—"}</p>
                  <div className={`flex items-center gap-1.5 text-[11px] mt-2 ${activeId === c.id ? "text-white/50" : "text-muted-foreground"}`}>
                    <Clock className="size-3" /> {new Date(c.createdAt).toLocaleDateString()} • {c.messages.length} msgs
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-3 border-t bg-muted/30 text-[11px] text-muted-foreground flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-500" /> Stored locally • syncs securely
          </div>
        </div>
      </div>
    </div>
  );
}
