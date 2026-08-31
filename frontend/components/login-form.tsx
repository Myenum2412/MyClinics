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
import { CommunityLinks } from "@/components/community-icons";
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
      const safeCallback =
        callbackUrl && /^\/(?!\/)/.test(callbackUrl) ? callbackUrl : null;
      router.push(safeCallback ?? destination);
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

          <div className="flex flex-col items-center gap-3 pt-2">
            <p className="text-sm font-semibold text-black">Join our community</p>
            <CommunityLinks className="flex items-center gap-3" size={20} />
          </div>
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


