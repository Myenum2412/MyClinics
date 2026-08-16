"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function SignupForm({
  className,
  callbackUrl = "/doctor",
  ...props
}: React.ComponentProps<"div"> & { callbackUrl?: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role: "doctor" }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      setLoading(false);
      return;
    }

    const signInRes = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (signInRes?.error) {
      router.push("/login");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
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
            <h1 className="text-xl font-bold text-black">Create an account</h1>
            <p className="text-left text-sm leading-normal font-normal text-gray-500">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-gray-700 underline underline-offset-4 hover:text-black"
              >
                Login
              </Link>
            </p>
          </div>

          <Field>
            <FieldLabel htmlFor="name" className="text-black">Name</FieldLabel>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-black placeholder:text-gray-400 bg-white!"
            />
          </Field>
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
            <FieldLabel htmlFor="password" className="text-black">Password</FieldLabel>
            <Input
              id="password"
              type="password"
              placeholder="At least 6 characters"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-black placeholder:text-gray-400 bg-white!"
            />
          </Field>

          {error && <p className="text-sm font-normal text-destructive">{error}</p>}

          <Field>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </Field>

          <FieldSeparator>Or</FieldSeparator>

          <Field>
            <Button
              variant="outline"
              type="button"
              onClick={() => signIn("google", { callbackUrl })}
              className="w-full text-black"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="size-4.5">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              Continue with Google
            </Button>
          </Field>
        </FieldGroup>
      </form>
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
