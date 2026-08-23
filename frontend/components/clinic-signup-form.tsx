"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { GoogleSignInButton } from "@/components/google-signin-button";
import { signupClinic, signupClinicGoogle, type SignupResponse } from "@/lib/clinic-api";

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      <div className={cn("flex flex-col gap-6 text-black", className)} {...props}>
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-xl font-bold text-black">Clinic created! 🎉</h1>
          <p className="text-sm text-black">
            Your clinic is live. Redirecting to clinic details in {countdown}s…
          </p>
        </div>

        <div className="rounded-xl border border-dashed border-[#2196F3] bg-white p-4 text-center">
          <p className="text-xs font-medium tracking-wide text-black uppercase">
            Your Clinic ID
          </p>
          <button
            type="button"
            onClick={copyClinicId}
            className="mt-1 cursor-pointer font-mono text-lg font-bold break-all text-black hover:text-[#2196F3]"
            title="Click to copy"
          >
            {created.clinicId}
          </button>
          <p className="mt-2 text-xs text-black">
            {copied ? "Copied to clipboard! ✓" : "Click to copy. Keep it safe — it identifies your tenant."}
          </p>
        </div>

        <dl className="space-y-2 text-sm text-black">
          <div className="flex justify-between gap-4">
            <dt className="font-medium text-black">Clinic</dt>
            <dd className="text-right text-black">{created.clinicName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="font-medium text-black">Role</dt>
            <dd className="text-black">clinic_admin</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="font-medium text-black">Login</dt>
            <dd className="text-right text-black">{email}</dd>
          </div>
        </dl>

        <FieldSeparator className="text-black" />

        <Button
          onClick={() => {
            if (countdownRef.current) clearInterval(countdownRef.current);
            router.replace("/clinic/settings");
            router.refresh();
          }}
          className="w-full bg-[#2196F3] text-white hover:bg-[#1E88E5] border-none shadow-md font-medium"
        >
          Go to Clinic Details now
        </Button>
      </div>
    );
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
              {gticket ? "Create your clinic with Google" : "Create your clinic"}
            </h1>
            <FieldDescription className="text-black">
              {gticket
                ? "Your Google account is verified. Pick a clinic name and you're done — no password needed."
                : "One clinic = one secure tenant. Your Clinic ID is generated automatically at signup."}
            </FieldDescription>
          </div>

          <Field>
            <FieldLabel htmlFor="clinicName" className="text-black font-medium">
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
              className="bg-white! text-black placeholder:text-gray-400 border-gray-300 focus-visible:ring-[#2196F3]"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="adminName" className="text-black font-medium">
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
              className="bg-white! text-black placeholder:text-gray-400 border-gray-300 focus-visible:ring-[#2196F3]"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="email" className="text-black font-medium">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="admin@clinic.com"
              required
              readOnly={Boolean(gticket)}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white! text-black placeholder:text-gray-400 border-gray-300 focus-visible:ring-[#2196F3]"
            />
          </Field>

          {!gticket && (
            <>
              <Field>
                <FieldLabel htmlFor="password" className="text-black font-medium">Password</FieldLabel>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="8+ chars, upper, lower, number"
                    required
                    minLength={8}
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
              <Field>
                <FieldLabel htmlFor="confirmPassword" className="text-black font-medium">
                  Confirm password
                </FieldLabel>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Repeat your password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10 bg-white! text-black placeholder:text-gray-400 border-gray-300 focus-visible:ring-[#2196F3]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-0 top-0 flex h-full items-center justify-center px-3 text-black hover:text-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-r-md transition-colors"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="size-4 text-black" />
                    ) : (
                      <Eye className="size-4 text-black" />
                    )}
                  </button>
                </div>
              </Field>
            </>
          )}

          {error && <p className="text-sm font-normal text-destructive">{error}</p>}

          <Field>
            <Button type="submit" disabled={loading} className="w-full bg-[#2196F3] text-white hover:bg-[#1E88E5] border-none shadow-md font-medium">
              {loading
                ? "Creating your clinic..."
                : gticket
                  ? "Create clinic with Google"
                  : "Create clinic"}
            </Button>
          </Field>

          {!gticket && (
            <>
              <FieldSeparator className="text-black">
                <span className="text-black font-medium">Or</span>
              </FieldSeparator>
              <GoogleSignInButton from="signup" />
            </>
          )}
        </FieldGroup>
      </form>

      <FieldDescription className="px-6 text-center text-black">
        Already have a clinic?{" "}
        <Link href="/login" className="text-black font-medium underline underline-offset-4 hover:text-black/80">
          Login
        </Link>
      </FieldDescription>
    </div>
  );
}