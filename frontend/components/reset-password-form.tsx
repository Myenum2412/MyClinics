"use client";

import { useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!token) {
      setError("Missing reset token.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      return;
    }
    setMessage(data.message);
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
          <h1 className="text-xl font-bold">Set a new password</h1>
          <FieldDescription>
            Enter a new password for your account.
          </FieldDescription>
        </div>

        <Field>
          <FieldLabel htmlFor="password">New password</FieldLabel>
          <Input
            id="password"
            type="password"
            placeholder="At least 6 characters"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="confirm">Confirm password</FieldLabel>
          <Input
            id="confirm"
            type="password"
            placeholder="••••••••"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>

        {error && <p className="text-sm font-normal text-destructive">{error}</p>}
        {message && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-normal text-emerald-600 dark:text-emerald-400">
              {message}
            </p>
            <Link
              href="/login"
              className="text-sm text-foreground underline underline-offset-4"
            >
              Go to login
            </Link>
          </div>
        )}

        <Field>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Resetting..." : "Reset password"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}