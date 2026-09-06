"use client";
import * as React from "react";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Msg = { role: "user" | "ai"; text: string };

const QUICK = ["Book appointment", "Clinic timings", "Fees", "Location"];

export function AiChatPopup() {
  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [messages, setMessages] = React.useState<Msg[]>([
    { role: "ai", text: "Vanakkam! I'm AI Root — your clinic assistant. How can I help today?" },
  ]);
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

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
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="AI Chat"
        className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:scale-105 hover:bg-primary/90"
      >
        {open ? <X className="size-6" /> : <Bot className="size-7" />}
      </button>

      {/* Popup */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[420px] w-[90vw] max-w-[360px] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
          {/* Header - AI Root */}
          <div className="flex items-center gap-2 bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex size-8 items-center justify-center rounded-full bg-white/20">
              <Sparkles className="size-4" />
            </div>
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
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
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
