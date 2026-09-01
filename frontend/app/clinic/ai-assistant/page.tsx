"use client";

import { useClinicSession } from "@/hooks/use-clinic-session";
import { EveAssistant } from "@/components/ai/eve-assistant";
import { Thread } from "@/components/assistant-ui/thread";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// assistant-ui init — thread runtime would be here (useAssistantRuntime)
// For prod, Eve browser-agent + omni (Tanglish) powers answers; assistant-ui Thread renders it

export default function ClinicAiAssistantPage() {
  const { session, loading } = useClinicSession();
  if (loading || !session) return <div className="p-8"><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">AI Assistant</h1>
        <p className="text-sm text-muted-foreground">Clinic & Doctor — assistant-ui Thread + Eve browser-agent (`npx assistant-ui init` / `npx shadcn add @agentcn/eve/browser-agent`) + WhatsApp omni. Speaks Tanglish.</p>
      </div>
      <Tabs defaultValue="eve">
        <TabsList><TabsTrigger value="eve">Eve Browser Agent</TabsTrigger><TabsTrigger value="thread">assistant-ui Thread</TabsTrigger></TabsList>
        <TabsContent value="eve"><EveAssistant clinicName="Meenu Care" role={session.role} /></TabsContent>
        <TabsContent value="thread">
          <div className="rounded-xl border p-4 h-[560px] flex flex-col">
            <Thread />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
