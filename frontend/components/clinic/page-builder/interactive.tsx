"use client";

import { useRef, useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, MoveHorizontal, Send } from "lucide-react";
import { useWebsiteBuilderClinicId } from "./runtime";

const ASPECT: Record<string, string> = {
  "4/3": "aspect-[4/3]",
  "16/9": "aspect-[16/9]",
  "1/1": "aspect-square",
  "3/4": "aspect-[3/4]",
};

export function BeforeAfterSlider({
  beforeImage,
  afterImage,
  beforeAlt,
  afterAlt,
  beforeLabel,
  afterLabel,
  aspect = "4/3",
}: {
  beforeImage: string;
  afterImage: string;
  beforeAlt: string;
  afterAlt: string;
  beforeLabel: string;
  afterLabel: string;
  aspect?: string;
}) {
  const [position, setPosition] = useState(50);
  const frame = ASPECT[aspect] ?? ASPECT["4/3"];

  return (
    <div className={`relative w-full overflow-hidden rounded-[var(--site-radius)] bg-[var(--site-primary-soft)] ${frame}`}>
      {beforeImage ? (
        <img
          src={beforeImage}
          alt={beforeAlt || "Before"}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-[var(--site-muted)]">
          Add a before image
        </div>
      )}

      {afterImage ? (
        <img
          src={afterImage}
          alt={afterAlt || "After"}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ clipPath: `inset(0 0 0 ${position}%)` }}
          loading="lazy"
        />
      ) : null}

      <div
        className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(15,23,42,0.25)]"
        style={{ left: `${position}%` }}
      >
        <span className="absolute left-1/2 top-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-900 shadow-lg">
          <MoveHorizontal className="size-5" />
        </span>
      </div>

      <span className="absolute left-3 top-3 rounded-full bg-slate-950/70 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
        {beforeLabel || "Before"}
      </span>
      <span className="absolute right-3 top-3 rounded-full bg-[var(--site-primary)] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[var(--site-on-primary)]">
        {afterLabel || "After"}
      </span>

      <input
        type="range"
        min={0}
        max={100}
        value={position}
        aria-label="Drag to compare before and after images"
        onChange={(event) => setPosition(Number(event.target.value))}
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}

const BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-[var(--site-button-radius)] bg-[var(--site-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--site-on-primary)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";

const INPUT =
  "h-11 w-full rounded-[calc(var(--site-radius)*0.65)] border border-[var(--site-border)] bg-[var(--site-surface)] px-3 text-sm text-[var(--site-text)] outline-none transition placeholder:text-[var(--site-muted)]/70 focus:border-[var(--site-primary)] focus:ring-2 focus:ring-[var(--site-primary)]/15";

export function WebsiteContactForm({
  title,
  subtitle,
  nameLabel,
  phoneLabel,
  emailLabel,
  serviceLabel,
  messageLabel,
  buttonLabel,
  successMessage,
  privacyNote,
}: {
  title: string;
  subtitle: string;
  nameLabel: string;
  phoneLabel: string;
  emailLabel: string;
  serviceLabel: string;
  messageLabel: string;
  buttonLabel: string;
  successMessage: string;
  privacyNote: string;
}) {
  const clinicId = useWebsiteBuilderClinicId();
  const startedAt = useRef(Date.now());
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    setError("");

    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") ?? "").trim(),
      phone: String(form.get("phone") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
      service: String(form.get("service") ?? "").trim(),
      message: String(form.get("message") ?? "").trim(),
      consent: form.get("consent") === "on",
      website: String(form.get("website") ?? "").trim(),
      elapsedMs: Date.now() - startedAt.current,
    };

    if (!payload.name || (!payload.phone && !payload.email)) {
      setError("Add your name and a phone number or email so we can reply.");
      return;
    }
    if (!clinicId) {
      setError("This form is not connected to a clinic yet.");
      return;
    }

    setStatus("sending");
    try {
      const response = await fetch(
        `/api/public/clinics/${encodeURIComponent(clinicId)}/website/lead`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      let data: { error?: string } = {};
      try {
        data = (await response.json()) as { error?: string };
      } catch {
        // Ignore malformed error responses.
      }
      if (!response.ok) throw new Error(data.error || "Could not send your message");
      setStatus("sent");
    } catch (submitError) {
      setStatus("idle");
      setError(submitError instanceof Error ? submitError.message : "Could not send your message");
    }
  }

  return (
    <section
      id="contact-form"
      className="grid scroll-mt-24 gap-6 overflow-hidden rounded-[calc(var(--site-radius)*1.2)] border border-[var(--site-border)] bg-[var(--site-surface)] p-6 shadow-sm lg:grid-cols-[0.85fr_1.15fr] lg:p-8"
    >
      <div className="flex flex-col justify-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--site-primary-text)]">
          Contact
        </p>
        <h2
          className="mt-1 text-2xl font-bold tracking-tight text-[var(--site-text)] sm:text-3xl"
          style={{ fontFamily: "var(--site-font-heading)" }}
        >
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--site-muted)]">{subtitle}</p>
        {privacyNote ? (
          <p className="mt-4 text-xs leading-relaxed text-[var(--site-muted)]">{privacyNote}</p>
        ) : null}
      </div>

      {status === "sent" ? (
        <div className="flex flex-col items-start justify-center gap-3 rounded-[var(--site-radius)] border border-[var(--site-border)] bg-[var(--site-primary-soft)] p-6">
          <CheckCircle2 className="size-8 text-[var(--site-primary-text)]" />
          <p className="text-base font-semibold text-[var(--site-text)]">{successMessage}</p>
          <p className="text-sm leading-relaxed text-[var(--site-muted)]">
            Our team will contact you using the details you shared.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--site-text)]">
            {nameLabel}
            <input name="name" required maxLength={120} className={INPUT} autoComplete="name" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--site-text)]">
            {phoneLabel}
            <input name="phone" maxLength={30} className={INPUT} autoComplete="tel" inputMode="tel" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--site-text)]">
            {emailLabel}
            <input name="email" type="email" maxLength={160} className={INPUT} autoComplete="email" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--site-text)]">
            {serviceLabel}
            <input name="service" maxLength={120} className={INPUT} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--site-text)] sm:col-span-2">
            {messageLabel}
            <textarea
              name="message"
              rows={4}
              maxLength={2000}
              className={`${INPUT} h-auto py-2.5`}
            />
          </label>
          <label className="flex items-start gap-2 text-xs leading-relaxed text-[var(--site-muted)] sm:col-span-2">
            <input name="consent" type="checkbox" className="mt-0.5 size-4 accent-[var(--site-primary)]" />
            <span>{privacyNote || "I agree to be contacted about my enquiry."}</span>
          </label>
          {/* Honeypot field — hidden from people, tempting to bots. */}
          <div className="hidden" aria-hidden="true">
            <label>
              Website
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          {error ? (
            <p role="alert" className="text-sm font-medium text-red-600 sm:col-span-2">
              {error}
            </p>
          ) : null}
          <div className="sm:col-span-2">
            <button type="submit" disabled={status === "sending"} className={BUTTON}>
              {status === "sending" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {status === "sending" ? "Sending…" : buttonLabel}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
