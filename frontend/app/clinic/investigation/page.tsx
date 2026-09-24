"use client";
import dynamic from "next/dynamic";

const Odontogram = dynamic(() => import("@/components/odontogram-lib/src/App"), { ssr: false });

export default function InvestigationPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Investigation</h1>
        <p className="text-sm text-muted-foreground">Dental investigation — odontogram charting.</p>
      </div>
      <div className="rounded-xl border bg-card p-2 overflow-auto">
        <Odontogram />
      </div>
    </div>
  );
}
