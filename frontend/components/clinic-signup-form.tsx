"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { GoogleSignInButton } from "@/components/google-signin-button";
import { signupClinic, signupClinicGoogle, type SignupResponse } from "@/lib/clinic-api";

/**
 * Clinic signup — creates a brand-new clinic tenant.
 *
 * The backend generates the Clinic ID (clc_...) at signup, stamps it on the
 * clinic + admin user, and returns a JWT embedding clinicId + role. The
 * Clinic ID is shown to the admin and must be kept — it is the tenant
 * identifier used across the platform.
 *
 * Google mode: after a Google sign-in with no matching account, the OAuth
 * callback redirects back here with `email`, `name` and a one-time `gticket`
 * (minted server-side for the verified email). In that mode the form drops
 * the password fields and creates the account without a password.
 */
export function ClinicSignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gticket = searchParams.get("gticket");
  const [clinicName, setClinicName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<SignupResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const googleEmail = searchParams.get("email");
    const googleName = searchParams.get("name");
    if (googleEmail) setEmail(googleEmail);
    if (googleName) setAdminName(googleName);
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const result = gticket
        ? await signupClinicGoogle({ clinicName, adminName, gticket })
        : await signupClinic({ clinicName, adminName, email, password });
      if (gticket) {
        // Google signup — redirect immediately to clinic settings
        router.replace("/clinic/settings");
        router.refresh();
        return;
      }
      setCreated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function copyClinicId() {
    if (!created) return;
    await navigator.clipboard.writeText(created.clinicId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Start countdown once the (password) signup success screen appears
  useEffect(() => {
    if (!created) return;
    setCountdown(5);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(countdownRef.current!);
          router.replace("/clinic/settings");
          router.refresh();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [created, router]);

  if (created) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-xl font-bold text-black">Clinic created! 🎉</h1>
          <p className="text-sm text-gray-500">
            Your clinic is live. Redirecting to clinic details in {countdown}s…
          </p>
        </div>

        <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 text-center">
          <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">
            Your Clinic ID
          </p>
          <button
            type="button"
            onClick={copyClinicId}
            className="mt-1 cursor-pointer font-mono text-lg font-bold break-all text-black hover:text-primary"
            title="Click to copy"
          >
            {created.clinicId}
          </button>
          <p className="mt-2 text-xs text-gray-500">
            {copied ? "Copied to clipboard! ✓" : "Click to copy. Keep it safe — it identifies your tenant."}
          </p>
        </div>

        <dl className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between gap-4">
            <dt className="font-medium text-gray-400">Clinic</dt>
            <dd className="text-right text-black">{created.clinicName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="font-medium text-gray-400">Role</dt>
            <dd className="text-black">clinic_admin</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="font-medium text-gray-400">Login</dt>
            <dd className="text-right text-black">{email}</dd>
          </div>
        </dl>

        <FieldSeparator />

        <Button
          onClick={() => {
            if (countdownRef.current) clearInterval(countdownRef.current);
            router.replace("/clinic/settings");
            router.refresh();
          }}
          className="w-full"
        >
          Go to Clinic Details now
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-xl font-bold text-black">
              {gticket ? "Create your clinic with Google" : "Create your clinic"}
            </h1>
            <p className="text-left text-sm leading-normal font-normal text-gray-500">
              {gticket
                ? "Your Google account is verified. Pick a clinic name and you're done — no password needed."
                : "One clinic = one secure tenant. Your Clinic ID is generated automatically at signup."}
            </p>
          </div>

          <Field>
            <FieldLabel htmlFor="clinicName" className="text-black">
              Clinic name
            </FieldLabel>
            <Input
              id="clinicName"
              type="text"
              placeholder="Sunrise Family Clinic"
              required
              minLength={2}
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              className="bg-white! text-black placeholder:text-gray-400"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="adminName" className="text-black">
              Your name
            </FieldLabel>
            <Input
              id="adminName"
              type="text"
              placeholder="Dr. Jane Doe"
              required
              minLength={2}
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              className="bg-white! text-black placeholder:text-gray-400"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="email" className="text-black">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="admin@clinic.com"
              required
              readOnly={Boolean(gticket)}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white! text-black placeholder:text-gray-400"
            />
          </Field>

          {!gticket && (
            <>
              <Field>
                <FieldLabel htmlFor="password" className="text-black">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  placeholder="8+ chars, upper, lower, number"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white! text-black placeholder:text-gray-400"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="confirmPassword" className="text-black">
                  Confirm password
                </FieldLabel>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repeat your password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-white! text-black placeholder:text-gray-400"
                />
              </Field>
            </>
          )}

          {error && <p className="text-sm font-normal text-destructive">{error}</p>}

          <Field>
            <Button type="submit" disabled={loading} className="w-full">
              {loading
                ? "Creating your clinic..."
                : gticket
                  ? "Create clinic with Google"
                  : "Create clinic"}
            </Button>
          </Field>
        </FieldGroup>
      </form>

      {!gticket && <GoogleSignInButton from="signup" />}

      <p className="px-6 text-center text-xs leading-normal font-normal text-gray-400">
        Already have a clinic?{" "}
        <Link href="/login" className="text-gray-600 underline underline-offset-4 hover:text-black">
          Login
        </Link>
      </p>
    </div>
  );
}