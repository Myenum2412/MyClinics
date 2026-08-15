import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { AuthBackground } from "@/components/auth-background";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <AuthBackground />
      <div className="auth-card relative z-10 w-full max-w-sm rounded-2xl border border-white/40 bg-white/95 p-6 shadow-2xl shadow-[#0D47A1]/30 backdrop-blur-xl sm:p-8 dark:border-white/10 dark:bg-[#0D47A1]/85">
        <Suspense>
          <LoginForm callbackUrl={callbackUrl ?? "/doctor"} />
        </Suspense>
      </div>
    </div>
  );
}
