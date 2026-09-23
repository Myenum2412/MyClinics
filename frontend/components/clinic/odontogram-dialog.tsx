"use client";
import dynamic from "next/dynamic";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import "react-advanced-odontogram/style.css";

const OdontogramShell = dynamic(() => import("react-advanced-odontogram").then((m: any) => m.OdontogramShell), { ssr: false }) as any;

export function OdontogramDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>🦷 Odontogram — click a tooth to see details</DialogTitle>
          <DialogDescription>Select any tooth; the built-in side panel shows caries, restorations, periodontal data etc. Export via JSON/FHIR from the odontogram toolbar.</DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border bg-white p-2 min-h-[520px]">
          {open && <OdontogramShell language="en" numberingSystem="FDI" darkMode={false} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
