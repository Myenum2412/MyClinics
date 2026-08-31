"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { getSession, login, storeSessionToken } from "@/lib/clinic-api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GoogleSignInButton } from "@/components/google-signin-button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const GOOGLE_ERRORS: Record<string, string> = {
  google_unavailable: "Google sign-in is not configured. Please log in with your email and password.",
  google_denied: "Google sign-in was cancelled.",
  google_callback: "Google sign-in failed. Please try again.",
  google_state: "Google sign-in expired. Please try again.",
  google_email_unverified: "Your Google email is not verified. Please verify it and try again.",
  google_exchange: "Could not reach Google. Please try again.",
  google_no_account:
    "No clinic account matches this Google email. Sign in with your email and password, or create a clinic.",
};

export function LoginForm({
  className,
  callbackUrl,
  clinicName = "My Clinic",
  ...props
}: React.ComponentProps<"div"> & {
  callbackUrl?: string;
  clinicName?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const googleToken = searchParams.get("google_token");
    const googleError = searchParams.get("error");
    if (googleToken) {
      const expires = Number(searchParams.get("google_expires") ?? 0);
      storeSessionToken(googleToken, expires);
      const session = getSession();
      const destination =
        session?.role === "platform_admin" ? "/orgmenu" : session?.role === "patient" ? "/clinic/patient" : "/clinic";
      router.replace(destination);
      router.refresh();
      return;
    }
    if (googleError && GOOGLE_ERRORS[googleError]) {
      setError(GOOGLE_ERRORS[googleError]);
    }
  }, [searchParams, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await login({ email, password });
      const destination =
        result.role === "platform_admin" ? "/orgmenu" : result.role === "patient" ? "/clinic/patient" : "/clinic";
      router.push(callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : destination);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6 text-black", className)} {...props}>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <Link href="/" className="flex flex-col items-center gap-2 font-medium">
              <div className="flex h-36 w-auto items-center justify-center overflow-hidden rounded-lg">
                <Image
                  src="/logobg.png"
                  alt="My Clinic"
                  width={2000}
                  height={2000}
                  className="h-36 w-auto object-contain"
                />
              </div>
              <span className="sr-only text-black">My Clinic</span>
            </Link>
            <h1 className="text-xl font-bold text-black">
              Welcome to {clinicName}
            </h1>
            <FieldDescription className="text-black">
              Don&apos;t have a clinic yet?{" "}
              <Link
                href="/signup/clinic"
                className="font-medium text-black underline underline-offset-4 hover:text-black/80"
              >
                Create your clinic
              </Link>
            </FieldDescription>
          </div>

          <Field>
            <FieldLabel htmlFor="email" className="text-black font-medium">
              Email
            </FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white! text-black placeholder:text-gray-400 border-gray-300 focus-visible:ring-[#2196F3]"
            />
          </Field>

          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="password" className="text-black font-medium">
                Password
              </FieldLabel>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-black underline-offset-4 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10 bg-white! text-black placeholder:text-gray-400 border-gray-300 focus-visible:ring-[#2196F3]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-0 top-0 flex h-full items-center justify-center px-3 text-black hover:text-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-r-md transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="size-4 text-black" />
                ) : (
                  <Eye className="size-4 text-black" />
                )}
              </button>
            </div>
          </Field>

          {error && <p className="text-sm font-normal text-destructive">{error}</p>}

          <Field>
            <Button type="submit" disabled={loading} className="w-full bg-[#2196F3] text-white hover:bg-[#1E88E5] border-none shadow-md font-medium">
              {loading ? "Signing in..." : "Login"}
            </Button>
          </Field>

          <FieldSeparator className="text-black">
            <span className="text-black font-medium">Or</span>
          </FieldSeparator>

          <GoogleSignInButton />
          <Button
            type="button"
            variant="outline"
            className="w-full bg-white! text-black border-[#2196F3] hover:bg-[#2196F3]/10 font-medium"
            onClick={() => {
              window.open("https://wa.me/", "_blank");
            }}
          >
            <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#25D366"
                d="M19.05 4.94A9.82 9.82 0 0 0 12.04 2C6.58 2 2.14 6.45 2.14 11.9c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.64-1.03-5.13-2.9-7zM12.04 20.04h-.01a8.13 8.13 0 0 1-4.14-1.13l-.3-.18-3.12.82.83-3.04-.2-.31a8.1 8.1 0 0 1-1.25-4.3c0-4.5 3.66-8.16 8.17-8.16 2.18 0 4.23.85 5.77 2.4a8.11 8.11 0 0 1 2.39 5.76c0 4.5-3.66 8.14-8.14 8.14zm6.91-11.2a6.7 6.7 0 0 0-1.98-1.42 6.8 6.8 0 0 0-2.93-.66c-3.74 0-6.79 3.04-6.79 6.79 0 1.19.31 2.35.9 3.37l.15.25-.53 1.94 1.99-.52.24.14a6.75 6.75 0 0 0 3.24.83h.01c3.74 0 6.79-3.04 6.79-6.79 0-1.81-.71-3.52-1.99-4.8l-.1-.13zm-3.32 5.73c-.18-.09-1.06-.52-1.22-.58-.16-.06-.28-.09-.4.09-.12.18-.46.58-.57.7-.1.12-.2.13-.38.04-.18-.09-.75-.28-1.43-.89-.53-.47-.89-1.05-.99-1.23-.1-.18-.01-.28.08-.37.08-.08.18-.2.27-.31.09-.1.12-.18.18-.31.06-.12.03-.22-.01-.31-.04-.09-.4-.96-.55-1.31-.14-.34-.29-.29-.4-.3h-.34c-.12 0-.31.04-.47.22-.16.18-.62.61-.62 1.48s.63 1.72.72 1.84c.09.12 1.24 1.9 3.01 2.66.42.18.75.29 1 .37.42.13.8.11 1.1.07.34-.05 1.06-.43 1.21-.85.15-.42.15-.78.1-.85-.04-.08-.16-.12-.34-.21z"
              />
            </svg>
            Continue with WhatsApp
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full bg-white! text-black border-[#2196F3] hover:bg-[#2196F3]/10 font-medium"
            onClick={() => {
              window.open("https://discord.com/", "_blank");
            }}
          >
            <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#5865F2"
                d="M20.32 4.37A19.8 19.8 0 0 0 15.34 2c-.18.32-.38.74-.52 1.07a18.2 18.2 0 0 0-5.64 0A13.7 13.7 0 0 0 8.66 2 19.73 19.73 0 0 0 3.68 4.37a19.8 19.8 0 0 0-2.5 12.43 19.9 19.9 0 0 0 6.06 3.06c.49-.67.93-1.37 1.3-2.11-.71-.27-1.39-.6-2.03-.99l.43-.34a13.6 13.6 0 0 0 10.12 0l.43.34a14.1 14.1 0 0 1-2.03.99c.37.74.81 1.44 1.3 2.11a19.9 19.9 0 0 0 6.06-3.06A19.8 19.8 0 0 0 20.32 4.37zm-11.85 9.92c-.96 0-1.75-.88-1.75-1.96s.77-1.96 1.75-1.96 1.76.88 1.76 1.96-.79 1.96-1.76 1.96zm6.06 0c-.96 0-1.75-.88-1.75-1.96s.77-1.96 1.75-1.96 1.76.88 1.76 1.96-.79 1.96-1.76 1.96z"
              />
            </svg>
            Continue with Discord
          </Button>
        </FieldGroup>
      </form>
      <FieldDescription className="px-6 text-center text-black">
        By clicking continue, you agree to our{" "}
        <Link href="/terms" className="text-black underline underline-offset-4 hover:text-black/80">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-black underline underline-offset-4 hover:text-black/80">
          Privacy Policy
        </Link>.
      </FieldDescription>
    </div>
  );
}


