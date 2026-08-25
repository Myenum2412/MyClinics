import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Organization Menu Login",
  description:
    "Organization admin sign-in to view all clinic information across the platform.",
};

export default async function OrgLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 overflow-hidden p-6 md:p-10 bg-slate-50">
      <div
        className="absolute top-0 inset-x-0 h-[20%] pointer-events-none"
        style={{ backgroundColor: "#90CAF9" }}
      />
      <div
        className="absolute bottom-0 inset-x-0 h-[30%] pointer-events-none"
        style={{ backgroundColor: "#E3F2FD" }}
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-full h-16 bg-[#90CAF9]/80 rounded-full"
          style={{ filter: "blur(100px)" }}
        />
      </div>
      <div className="absolute inset-0 backdrop-blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm">
        <Suspense>
          <LoginForm
            callbackUrl={callbackUrl ?? "/orgmenu"}
            clinicName="My Clinics"
          />
        </Suspense>
      </div>
    </div>
  );
}
