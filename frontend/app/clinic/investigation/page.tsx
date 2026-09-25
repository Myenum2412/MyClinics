"use client";

import { OdontogramShell } from "react-advanced-odontogram";
import "./odontogram.css";

export default function InvestigationPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Investigation</h1>
        <p className="text-sm text-muted-foreground">Dental odontogram — chart conditions, findings and treatments.</p>
      </div>
      <OdontogramShell />
    </div>
  );
}
