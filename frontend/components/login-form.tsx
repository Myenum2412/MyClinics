"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSession, login, storeSessionToken } from "@/lib/clinic-api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
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
        session?.role === "platform_admin" ? "/admin" : "/clinic";
      router.replace(destination);
      router.refresh();
      return;
    }
    if (googleError && GOOGLE_ERRORS[googleError]) {
      setError(GOOGLE_ERRORS[googleError]);
    }
  }, [searchParams, router]);

  function startGoogle() {
    window.location.href = "/api/clinics/auth/google";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await login({ email, password });
      const destination =
        result.role === "platform_admin" ? "/admin" : "/clinic";
      router.push(callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : destination);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <Link href="/" className="flex flex-col items-center gap-2 font-medium">
              <div className="flex size-12 items-center justify-center overflow-hidden rounded-md bg-primary/5">
                <Image
                  src="/logo.png"
                  alt="My Clinic"
                  width={500}
                  height={500}
                  className="size-full object-contain"
                />
              </div>
              <span className="sr-only">My Clinic</span>
            </Link>
            <h1 className="text-xl font-bold text-black">
              Welcome to {clinicName}
            </h1>
            <p className="text-left text-sm leading-normal font-normal text-gray-500">
              Don&apos;t have a clinic yet?{" "}
              <Link
                href="/signup/clinic"
                className="font-medium text-gray-700 underline underline-offset-4 hover:text-black"
              >
                Create your clinic
              </Link>
            </p>
          </div>

          <Field>
            <FieldLabel htmlFor="email" className="text-black">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="Enter email id"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-black placeholder:text-gray-400 bg-white!"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="password" className="text-black">
              Password
            </FieldLabel>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-black placeholder:text-gray-400 bg-white!"
            />
          </Field>

          {error && <p className="text-sm font-normal text-destructive">{error}</p>}

          <Field>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Signing in..." : "Login"}
            </Button>
          </Field>
        </FieldGroup>
      </form>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-gray-400">or continue with</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full bg-white! text-black"
        onClick={startGoogle}
      >
        <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Continue with Google
      </Button>
      <p className="px-6 text-center text-xs leading-normal font-normal text-gray-400">
        By clicking continue, you agree to our{" "}
        <a href="/terms" className="text-gray-600 underline underline-offset-4 hover:text-black">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="/privacy" className="text-gray-600 underline underline-offset-4 hover:text-black">
          Privacy Policy
        </a>.
      </p>
    </div>
  );
}