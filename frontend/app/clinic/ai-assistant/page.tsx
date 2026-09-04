"use client";

import { useClinicSession } from "@/hooks/use-clinic-session";
import { Skeleton } from "@/components/ui/skeleton";
import { AssistantRuntimeProvider, useLocalRuntime } from "@assistant-ui/react";
import type { ChatModelAdapter } from "@assistant-ui/react";
import { Thread } from "@/components/thread.aui";
import Image from "next/image";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Command } from "lucide-react";

function AIAssistantRuntime({ role }: { role?: string }) {
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
      const res = await fetch("/api/ai/eve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, clinicName: "Meenu Care", role }),
        signal: abortSignal,
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => res.statusText);
        throw new Error(txt || "Assistant request failed");
      }
      const data = (await res.json()) as { reply?: string };
      const reply = (data.reply as string) ?? "No reply";
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

  const ClinicWelcome = () => (
    <div className="aui-thread-welcome-root mb-6 flex flex-col items-center px-4 text-center">
      <div className="size-14 rounded-2xl overflow-hidden shadow-sm mb-4 border bg-muted">
        <Image src="/aidps.png" alt="AIDP" width={56} height={56} className="size-14 object-cover" />
      </div>
      <h1 className="aui-thread-welcome-message-inner text-base font-semibold tracking-tight">
        AIDP — your clinic assistant
      </h1>
      <p className="text-sm text-muted-foreground max-w-[420px] mt-1.5 leading-relaxed">
        Chat about appointments, doctor availability, fees or clinic timings. Try Tanglish — “Fees evalavu bro?”
      </p>
    </div>
  );

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread components={{ Welcome: ClinicWelcome }} />
    </AssistantRuntimeProvider>
  );
}

export default function ClinicAiAssistantPage() {
  const { session, loading } = useClinicSession();

  if (loading || !session)
    return (
      <div className="space-y-4">
        <Skeleton className="h-[64px] w-full rounded-2xl" />
        <div className="grid grid-cols-12 gap-4 h-[560px]">
          <Skeleton className="col-span-12 rounded-2xl" />
        </div>
      </div>
    );

  return (
    <TooltipProvider>
      <div className="-m-4 sm:-m-6 lg:-mx-8 lg:-my-5 flex flex-col h-[calc(100vh-56px)] overflow-hidden bg-card">
        <div className="h-[52px] shrink-0 flex items-center justify-between px-4 sm:px-5 border-b bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-8 rounded-lg overflow-hidden shrink-0 border bg-muted">
              <Image src="/aidps.png" alt="AIDP" width={32} height={32} className="size-8 object-cover" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium leading-none truncate">AIDP Clinic Assistant</p>
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

        <div className="flex-1 min-h-0 overflow-hidden">
          <AIAssistantRuntime role={session.role} />
        </div>

        <div className="shrink-0 border-t bg-muted/20 px-4 py-2 text-center">
          <p className="text-[11px] text-muted-foreground">AI can make mistakes. Verify important info with clinic staff. • Meenu Care</p>
        </div>
      </div>
    </TooltipProvider>
  );
}
