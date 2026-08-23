import { Suspense } from "react";
import { ClinicSignupForm } from "@/components/clinic-signup-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Your Clinic",
  description:
    "Create your clinic — one secure multi-tenant workspace with strict data isolation. Your Clinic ID is generated at signup.",
};

export default function ClinicSignupPage() {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 overflow-hidden p-6 md:p-10 bg-slate-50">
      {/* Top 20% background color */}
      <div
        className="absolute top-0 inset-x-0 h-[20%] pointer-events-none"
        style={{ backgroundColor: "#90CAF9" }}
      />

      {/* Bottom 30% background color */}
      <div
        className="absolute bottom-0 inset-x-0 h-[30%] pointer-events-none"
        style={{ backgroundColor: "#E3F2FD" }}
      />

      {/* Center line with 100% blur */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-full h-16 bg-[#90CAF9]/80 rounded-full"
          style={{ filter: "blur(100px)" }}
        />
      </div>

      {/* 100% backdrop blur overlay across the center line blend */}
      <div className="absolute inset-0 backdrop-blur-[100px] pointer-events-none" />

      {/* Form Container without card border/shadow/bg */}
      <div className="relative z-10 w-full max-w-sm">
        <Suspense>
          <ClinicSignupForm />
        </Suspense>
      </div>
    </div>
  );
}