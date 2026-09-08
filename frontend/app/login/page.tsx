import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
  description:
    "Sign in to My Clinics to manage appointments, view prescriptions, track billing and access your medical reports.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  // Don't block render on backend fetch - use instant fallback, LoginForm hydrates real name client-side
  const clinicName = process.env.ORG_NAME?.trim() || "My Clinic";

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
          <LoginForm
            callbackUrl={callbackUrl ?? "/clinic"}
            clinicName={clinicName}
          />
        </Suspense>
      </div>
    </div>
  );
}




