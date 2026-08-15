"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AuthBackground } from "@/components/auth-background";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    setResetUrl("");

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();

    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      return;
    }
    setMessage(data.message);
    setResetUrl(data.resetUrl ?? "");
  }

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <AuthBackground />
      <div className="auth-card relative z-10 w-full max-w-sm rounded-2xl border border-white/40 bg-white/95 p-6 shadow-2xl shadow-[#0D47A1]/30 backdrop-blur-xl sm:p-8 dark:border-white/10 dark:bg-[#0D47A1]/85">
        <div className="flex flex-col gap-6">
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
                <h1 className="text-xl font-bold">Forgot your password?</h1>
                <FieldDescription>
                  Enter your email and we&apos;ll send you a reset link. Remembered
                  it? <Link href="/login">Login</Link>
                </FieldDescription>
              </div>

              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>

              {error && <p className="text-sm font-normal text-destructive">{error}</p>}
              {message && (
                <p className="text-sm font-normal text-emerald-600 dark:text-emerald-400">
                  {message}
                </p>
              )}
              {resetUrl && (
                <div className="rounded-lg border border-border bg-muted/50 p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Demo link (in production this is emailed):
                  </p>
                  <Link
                    href={resetUrl}
                    className="break-all text-sm text-primary underline underline-offset-4"
                  >
                    {resetUrl}
                  </Link>
                </div>
              )}

              <Field>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Sending..." : "Send reset link"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </div>
      </div>
    </div>
  );
}
