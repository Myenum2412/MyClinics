"use client";
import * as React from "react";
import Image from "next/image";
import { Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Msg = { role: "user" | "ai"; text: string };

const QUICK = ["Book appointment", "Clinic timings", "Fees", "Location"];

export function AiChatPopup() {
  const [open, setOpen] = React.useState(false);
  const [showNudge, setShowNudge] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [messages, setMessages] = React.useState<Msg[]>([
    { role: "ai", text: "Vanakkam! I'm AI Root — your clinic assistant. How can I help today?" },
  ]);
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Proactive nudge while visiting site
  React.useEffect(() => {
    const t = setTimeout(() => { if (!open) setShowNudge(true); }, 4000);
    return () => clearTimeout(t);
  }, [open]);
  React.useEffect(() => { if (open) setShowNudge(false); }, [open]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: msg }]);
    setLoading(true);
    try {
      const res = await fetch("/api/ai/eve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, role: "visitor" }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "ai", text: data.reply ?? "Sorry, I couldn't respond." }]);
    } catch {
      setMessages((m) => [...m, { role: "ai", text: "Network error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating button + proactive bubble */}
      <div className="fixed bottom-6 right-6 z-50 flex items-end gap-3">
        {showNudge && !open && (
          <div className="hidden sm:flex max-w-[220px] animate-in fade-in slide-in-from-bottom-2 rounded-2xl border bg-background px-3 py-2 text-xs shadow-lg">
            👋 Hi! I&apos;m AI Root — ask me anything about the clinic!
            <button onClick={() => setShowNudge(false)} className="ml-2 shrink-0 text-muted-foreground hover:text-foreground"><X className="size-3" /></button>
          </div>
        )}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="AI Chat"
          className="flex size-14 items-center justify-center overflow-hidden rounded-full bg-white shadow-lg ring-1 ring-border transition hover:scale-105"
        >
          {open ? (
            <X className="size-6 text-foreground" />
          ) : (
            <Image src="/aidps.png" alt="AI Root" width={56} height={56} className="size-14 object-cover" />
          )}
        </button>
      </div>

      {/* Popup */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[420px] w-[90vw] max-w-[360px] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
          {/* Header - AI Root */}
          <div className="flex items-center gap-2 bg-primary px-4 py-3 text-primary-foreground">
            <Image src="/aidps.png" alt="AI Root avatar" width={32} height={32} className="size-8 rounded-full object-cover bg-white" />
            <div className="flex-1">
              <p className="text-sm font-semibold">AI Root</p>
              <p className="text-xs opacity-80">Clinic-wide assistant</p>
            </div>
            <button onClick={() => setOpen(false)} className="rounded p-1 hover:bg-white/20">
              <X className="size-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={listRef} className="flex-1 overflow-y-auto space-y-3 p-4">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex items-start gap-2"}>
                {m.role === "ai" && (
                  <Image src="/aidps.png" alt="AI" width={24} height={24} className="mt-1 size-6 shrink-0 rounded-full object-cover ring-1 ring-border" />
                )}
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground"
                      : "max-w-[80%] rounded-2xl rounded-bl-sm border bg-muted px-3 py-2 text-sm"
                  }
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && <p className="text-xs text-muted-foreground">AI Root is thinking…</p>}
          </div>

          {/* Quick prompts */}
          <div className="flex flex-wrap gap-1.5 px-3 pb-2">
            {QUICK.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="rounded-full border bg-muted px-2.5 py-1 text-xs hover:bg-accent"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-2 border-t p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask AI Root…"
              className="flex-1 rounded-full border bg-background px-4 py-2 text-sm outline-none focus:border-primary"
            />
            <Button size="icon" onClick={() => send()} disabled={loading || !input.trim()} className="rounded-full">
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
