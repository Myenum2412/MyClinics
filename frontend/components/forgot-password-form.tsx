"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function ForgotPasswordForm() {
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
  );
}