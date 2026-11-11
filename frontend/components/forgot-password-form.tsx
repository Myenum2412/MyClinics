"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { requestPasswordReset, resetPassword } from "@/lib/clinic-api";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type Step = "request" | "sent" | "done";

const inputClass =
  "bg-white! text-black placeholder:text-gray-400 border-gray-300 focus-visible:ring-[#2196F3]";

export function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [step, setStep] = useState<Step>("request");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isReset = Boolean(token);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await requestPasswordReset(identifier);
      setStep("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the reset email.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await resetPassword({ token, password });
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset your password.");
    } finally {
      setLoading(false);
    }
  }

  const heading = isReset
    ? "Set a new password"
    : step === "sent"
      ? "Check your inbox"
      : "Forgot your password?";
  const description = isReset
    ? "Choose a new password for your MyClinics account."
    : step === "sent"
      ? "If an account matches those details, we've emailed a reset link to the address on file. The link expires in 30 minutes."
      : "Enter the email or mobile number linked to your account — clinic, doctor, staff or patient.";

  return (
    <div className="flex flex-col gap-6 text-black">
      <div className="flex flex-col items-center gap-2 text-center">
        <Link href="/" className="flex flex-col items-center gap-2 font-medium">
          <div className="flex h-32 w-auto items-center justify-center overflow-hidden rounded-lg">
            <Image
              src="/logobg.png"
              alt="My Clinic"
              width={2000}
              height={2000}
              className="h-32 w-auto object-contain"
            />
          </div>
          <span className="sr-only text-black">My Clinic</span>
        </Link>
        <h1 className="text-xl font-bold text-black">{heading}</h1>
        <FieldDescription className="text-black">{description}</FieldDescription>
      </div>

      {step === "done" ? (
        <div className="flex flex-col items-center gap-4 text-center">
          <CheckCircle2 className="size-12 text-green-600" />
          <p className="text-sm text-black">
            Your password has been updated. You can now sign in with your new password.
          </p>
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center rounded-lg bg-[#2196F3] px-3 py-2 text-sm font-medium text-white shadow-md transition-colors hover:bg-[#1E88E5]"
          >
            Back to login
          </Link>
        </div>
      ) : isReset ? (
        <form onSubmit={handleReset}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="password" className="text-black font-medium">
                New password
              </FieldLabel>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className={`pr-10 ${inputClass}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-0 top-0 flex h-full items-center justify-center px-3 text-black hover:text-black/70 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>

            <Field>
              <FieldLabel htmlFor="confirm" className="text-black font-medium">
                Confirm new password
              </FieldLabel>
              <Input
                id="confirm"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                className={inputClass}
              />
            </Field>

            {error && <p className="text-sm font-normal text-destructive">{error}</p>}

            <Field>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2196F3] text-white hover:bg-[#1E88E5] border-none shadow-md font-medium"
              >
                {loading ? "Updating..." : "Update password"}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      ) : step === "sent" ? (
        <div className="flex flex-col items-center gap-4 text-center">
          <CheckCircle2 className="size-12 text-green-600" />
          <p className="text-sm text-black">
            Request received for <strong>{identifier}</strong>. If an account matches, a reset
            link is on its way to the email on file. Check your spam folder if it doesn&apos;t
            arrive within a few minutes.
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              setStep("request");
              setError("");
            }}
          >
            Use a different email or number
          </Button>
        </div>
      ) : (
        <form onSubmit={handleRequest}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="identifier" className="text-black font-medium">
                Email or phone / WhatsApp number
              </FieldLabel>
              <Input
                id="identifier"
                type="text"
                placeholder="m@example.com or 98765 43210"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                className={inputClass}
              />
            </Field>

            {error && <p className="text-sm font-normal text-destructive">{error}</p>}

            <Field>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2196F3] text-white hover:bg-[#1E88E5] border-none shadow-md font-medium"
              >
                {loading ? "Sending..." : "Send reset link"}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      )}

      {step !== "done" && (
        <Link
          href="/login"
          className="flex items-center justify-center gap-1.5 text-sm font-medium text-black underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-4" />
          Back to login
        </Link>
      )}
    </div>
  );
}
