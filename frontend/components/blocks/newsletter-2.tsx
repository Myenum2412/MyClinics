"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ArrowRight, Lock, Loader2 } from "lucide-react";

export interface NewsletterBlockProps {
  badge?: string;
  title?: string;
  description?: string;
  source?: string;
  className?: string;
  cardClassName?: string;
}

export default function NewsletterBlock({
  badge = "Partner Newsletter",
  title = "Partner insights, delivered monthly",
  description = "Product updates, growth tips and practical guides from the My Clinics team, landing in your inbox every month.",
  source = "Partners Page",
  className = "flex w-full items-center justify-center bg-background px-6 py-12 text-foreground",
  cardClassName = "w-full max-w-5xl rounded-xl bg-muted px-8 py-10 sm:px-12 sm:py-12 border border-border shadow-sm",
}: NewsletterBlockProps) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      toast.error("Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/faq-subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, consent, source }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        toast.success(data.message || "Thank you for subscribing! We'll be in touch soon.");
        setEmail("");
      } else {
        toast.error(data.error || "Failed to submit subscription. Please try again.");
      }
    } catch {
      toast.error("Network error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={className}>
      <div className={cardClassName}>
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between md:gap-16">
          <div className="flex flex-col gap-3 md:max-w-sm">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              {badge}
            </p>
            <h2 className="font-heading text-2xl leading-tight font-bold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>

          <div className="flex flex-col gap-3 md:max-w-md md:min-w-0 md:flex-1">
            <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@clinic.com"
                  aria-label="Email address"
                  disabled={loading}
                  className="flex-1 border-border bg-background text-foreground placeholder:text-muted-foreground"
                />
                <Button type="submit" disabled={loading} className="shrink-0 bg-blue-600 text-white hover:bg-blue-700 shadow-sm">
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-1" />
                      Subscribing...
                    </>
                  ) : (
                    <>
                      Subscribe
                      <ArrowRight data-icon="inline-end" aria-hidden="true" className="size-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="newsletter-consent"
                  name="consent"
                  checked={consent}
                  onCheckedChange={(checked) => setConsent(Boolean(checked))}
                />
                <label
                  htmlFor="newsletter-consent"
                  className="text-sm font-normal text-muted-foreground cursor-pointer"
                >
                  I agree to receive clinic updates & workflow guides.
                </label>
              </div>
            </form>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock aria-hidden="true" className="shrink-0" size={12} />
              Your data stays private. Unsubscribe any time, no questions asked.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}