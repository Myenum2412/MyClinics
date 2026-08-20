"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSession, login, storeSessionToken } from "@/lib/clinic-api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GoogleSignInButton } from "@/components/google-signin-button";
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
        session?.role === "platform_admin" ? "/admin" : session?.role === "patient" ? "/clinic/patient" : "/clinic";
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
        result.role === "platform_admin" ? "/admin" : result.role === "patient" ? "/clinic/patient" : "/clinic";
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

      <GoogleSignInButton />
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