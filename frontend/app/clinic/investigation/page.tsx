"use client";
import dynamic from "next/dynamic";
import "@/components/Investi/src/index.css";

const OdontogramApp = dynamic(() => import("@/components/Investi/src/App"), { ssr: false });

export default function InvestigationPage() {
  return (
    <div className="odontogram-root -mx-4 -my-5 sm:-mx-6 lg:-mx-8">
      <OdontogramApp />
    </div>
  );
}
