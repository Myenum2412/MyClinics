import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { AuthBackground } from "@/components/auth-background";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot Password",
  description:
    "Forgot your password? Enter your email and we'll send you a secure link to reset it and get back into My Clinics.",
};

export default function ForgotPasswordPage() {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <AuthBackground />
      <div className="auth-card relative z-10 w-full max-w-sm rounded-2xl border border-white/40 bg-white/95 p-6 shadow-2xl shadow-[#0D47A1]/30 backdrop-blur-xl sm:p-8 dark:border-white/10 dark:bg-[#0D47A1]/85">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}