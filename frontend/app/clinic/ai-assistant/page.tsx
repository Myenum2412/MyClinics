"use client";

import { useEffect, useState } from "react";
import { useClinicSession } from "@/hooks/use-clinic-session";
import { EveAssistant } from "@/components/ai/eve-assistant";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClinicAiAssistantPage() {
  const { session, loading } = useClinicSession();
  const [clinicName] = useState("Meenu Care");

  if (loading || !session) return <div className="p-8"><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">AI Assistant</h1>
        <p className="text-sm text-muted-foreground">Clinic & Doctor — Eve browser-agent (`@agentcn/eve/browser-agent`) + WhatsApp omni. Speaks Tanglish.</p>
      </div>
      <EveAssistant clinicName={clinicName} role={session.role} />
    </div>
  );
}
