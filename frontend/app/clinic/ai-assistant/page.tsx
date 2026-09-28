"use client";

import { useClinicSession } from "@/hooks/use-clinic-session";
import { Skeleton } from "@/components/ui/skeleton";
import { AssistantRuntimeProvider, useLocalRuntime } from "@assistant-ui/react";
import type { ChatModelAdapter } from "@assistant-ui/react";
import { Thread } from "@/components/thread.aui";
import { ThreadList } from "@/components/thread-list.aui";
import Image from "next/image";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Command, History } from "lucide-react";
import { useEffect, useState } from "react";

function ClinicAssistantLayout({ role, clinicId, clinicName }: { role?: string; clinicId?: string; clinicName?: string }) {
  // History panel is collapsible on mobile (room for the chat), always visible on lg+.
  const [showHistory, setShowHistory] = useState(false);
  const adapter: ChatModelAdapter = {
    async run({ messages, abortSignal }) {
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      let prompt = "";
      if (lastUser) {
        const parts = (lastUser.content ?? []) as unknown as { type: string; text?: string }[];
        prompt = parts
          .filter((p) => p.type === "text" && typeof p.text === "string")
          .map((p) => p.text as string)
          .join("\n")
          .trim();
        if (!prompt && typeof (lastUser as unknown as { content: unknown }).content === "string") {
          prompt = String((lastUser as unknown as { content: string }).content);
        }
      }
      if (!prompt) prompt = "Hi";
      // Normalize history to {role, content: string}
      const convHistory = messages.slice(-6).map((m) => {
        const c = m.content as unknown;
        let text = "";
        if (Array.isArray(c)) text = (c as { text?: string }[]).map((p) => p.text ?? "").join("\n");
        else if (typeof c === "string") text = c;
        return { role: m.role as string, content: text };
      }).filter((x) => x.content);
      const res = await fetch("/api/ai/eve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, clinicName: clinicName ?? "Meenu Care", role, clinicId, conversationHistory: convHistory }),
        signal: abortSignal,
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => res.statusText);
        throw new Error(txt || "Assistant request failed");
      }
      const data = (await res.json()) as { reply?: string; toolCalls?: { function: { name: string; arguments: string } }[] };
      // Execute AI-requested form fills / creates
      if (data.toolCalls?.length) {
        for (const tc of data.toolCalls) {
          try {
            const args = JSON.parse(tc.function.arguments || "{}");
            if (tc.function.name === "fill_appointment_form" || tc.function.name === "create_appointment") {
              if (tc.function.name === "create_appointment" && clinicId && args.patientId) {
                await fetch(`/api/clinics/${clinicId}/appointments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(args), credentials: "include" }).catch(()=>{});
                window.dispatchEvent(new CustomEvent("ai:appointment-created"));
              } else {
                localStorage.setItem("ai:fill-appointment", JSON.stringify(args));
                window.dispatchEvent(new CustomEvent("ai:fill-appointment", { detail: args }));
              }
            }
            if (tc.function.name === "fill_patient_form") {
              localStorage.setItem("ai:fill-patient", JSON.stringify(args));
              window.dispatchEvent(new CustomEvent("ai:fill-patient", { detail: args }));
            }
          } catch {}
        }
      }
      const reply = (data.reply as string) ?? (data.toolCalls?.length ? "Done — I've filled the form for you. Check the appointments/patients page; the new entry will appear in the table." : "No reply");
      return {
        content: [{ type: "text", text: reply }],
      };
    },
  };

  const runtime = useLocalRuntime(adapter, {
    adapters: {
      suggestion: {
        async generate() {
          return [
            { prompt: "Hi" },
            { prompt: "Fees evalavu bro?" },
            { prompt: "Clinic timing enna?" },
            { prompt: "Enakku appointment venum" },
          ];
        },
      },
    },
  });

function BackendHistory({ clinicId }: { clinicId?: string }) {
  const [items, setItems] = useState<{ threadId: string; title: string; updatedAt: string }[]>([]);
  useEffect(() => {
    if (!clinicId) return;
    fetch(`/api/ai/chats?clinicId=${encodeURIComponent(clinicId)}`, { cache: "no-store" })
      .then((r) => r.json()).then((d) => setItems(d.items ?? [])).catch(() => {});
  }, [clinicId]);
  if (!items.length) return <p className="px-2 text-xs text-muted-foreground">No saved history yet — chats are saved after your first message.</p>;
  return (
    <div className="space-y-1">
      <p className="px-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Saved chats (backend memory)</p>
      {items.slice(0, 20).map((it) => (
        <div key={it.threadId} className="px-2 py-1.5 rounded-lg border bg-muted/20 text-xs">
          <p className="font-medium truncate">{it.title}</p>
          <p className="text-[11px] text-muted-foreground">{new Date(it.updatedAt).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}

  const ClinicWelcome = () => (
    <div className="aui-thread-welcome-root mb-6 flex flex-col items-center px-4 text-center">
      <div className="size-14 rounded-2xl overflow-hidden shadow-sm mb-4 border bg-muted">
        <Image src="/aidps.png" alt="Ai Root" width={56} height={56} className="size-14 object-cover" />
      </div>
      <h1 className="aui-thread-welcome-message-inner text-base font-semibold tracking-tight">
        Ai Root — your clinic assistant
      </h1>
      <p className="text-sm text-muted-foreground max-w-[420px] mt-1.5 leading-relaxed">
        Chat about appointments, doctor availability, fees or clinic timings. Try Tanglish — “Fees evalavu bro?”
      </p>
    </div>
  );

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex flex-1 min-h-0 overflow-hidden flex-col lg:flex-row">
        {/* Left history — assistant-ui ThreadList + backend persisted history.
            Hidden behind a toggle on mobile, always visible on lg+. */}
        <aside className={`${showHistory ? "flex" : "hidden"} w-full shrink-0 flex-col border-b bg-card overflow-hidden max-h-[38vh] lg:flex lg:w-[300px] lg:border-b-0 lg:border-r lg:max-h-none lg:h-full xl:w-[340px]`}>
          <div className="px-3 py-3 border-b shrink-0 bg-card">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <History className="size-4 text-muted-foreground" />
              History
              <span className="ml-auto text-xs font-normal text-muted-foreground hidden lg:inline">assistant-ui threads</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 hidden lg:block">Search, rename, archive — persisted to backend memory</p>
          </div>
          <div className="flex-1 overflow-auto p-2 space-y-3">
            <ThreadList />
            <BackendHistory clinicId={clinicId} />
          </div>
          <div className="p-3 border-t bg-muted/30 text-[11px] text-muted-foreground flex items-center gap-1.5 shrink-0">
            <span className="size-1.5 rounded-full bg-emerald-500" /> Persisted to backend • memory storage enabled
          </div>
        </aside>

        {/* Right chat — assistant-ui Thread */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-background">
          {/* Mobile history toggle */}
          <div className="flex shrink-0 items-center gap-2 border-b border-border/60 bg-card px-3 py-2 lg:hidden">
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              aria-expanded={showHistory}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground"
            >
              <History className="size-3.5 text-muted-foreground" />
              {showHistory ? "Hide history" : "Show history"}
            </button>
            <span className="truncate text-[11px] text-muted-foreground">Chats are saved automatically</span>
          </div>
          <Thread components={{ Welcome: ClinicWelcome }} />
        </div>
      </div>
    </AssistantRuntimeProvider>
  );
}

export default function ClinicAiAssistantPage() {
  const { session, loading } = useClinicSession();

  if (loading || !session)
    return (
      <div className="space-y-4">
        <Skeleton className="h-[64px] w-full rounded-2xl" />
        <Skeleton className="h-[420px] w-full rounded-2xl sm:h-[560px]" />
      </div>
    );

  return (
    <TooltipProvider>
      <div className="-m-4 sm:-m-6 lg:-mx-8 lg:-my-5 flex flex-col h-[calc(100vh-56px)] overflow-hidden bg-card">
        <div className="h-[52px] shrink-0 flex items-center justify-between px-4 sm:px-5 border-b bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-8 rounded-lg overflow-hidden shrink-0 border bg-muted">
              <Image src="/aidps.png" alt="Ai Root" width={32} height={32} className="size-8 object-cover" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium leading-none truncate">Ai Root Clinic Assistant</p>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Meenu Care • {session.role} • omni • assistant-ui
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-muted-foreground border rounded-full px-2.5 py-1">
              <Command className="size-3" /> + K
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-muted-foreground border rounded-full px-2.5 py-1">
              powered by assistant-ui
            </span>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <ClinicAssistantLayout role={session.role} clinicId={session.clinicId ?? undefined} clinicName="Meenu Care" />
        </div>

        <div className="shrink-0 border-t bg-muted/20 px-4 py-2 text-center">
          <p className="text-[11px] text-muted-foreground">AI can make mistakes. Verify important info with clinic staff. • Meenu Care</p>
        </div>
      </div>
    </TooltipProvider>
  );
}
