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
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function LoginForm({
  className,
  callbackUrl = "/doctor",
  ...props
}: React.ComponentProps<"div"> & { callbackUrl?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password.");
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
            <h1 className="text-xl font-bold">Welcome to My Clinic</h1>
            <FieldDescription>
              Don&apos;t have an account?{" "}
              <Link href="/signup">Sign up</Link>
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
          <Field>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          {error && <p className="text-sm font-normal text-destructive">{error}</p>}

          <Field>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Signing in..." : "Login"}
            </Button>
          </Field>

          <Field className="flex flex-row items-center justify-between">
            <Link
              href="/forgot-password"
              className="text-sm text-muted-foreground underline underline-offset-4 hover:text-primary"
            >
              Forgot password?
            </Link>
          </Field>

          <FieldSeparator>Or</FieldSeparator>

          <Field>
            <Button
              variant="outline"
              type="button"
              onClick={() => signIn("google", { callbackUrl })}
              className="w-full"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path
                  d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                  fill="currentColor"
                />
              </svg>
              Continue with Google
            </Button>
          </Field>
        </FieldGroup>
      </form>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our{" "}
        <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  );
}
