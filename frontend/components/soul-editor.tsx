"use client";

import { useState } from "react";
import {
  ArrowPathIcon as Loader2Icon,
  ArrowDownTrayIcon as SaveIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

const MAX_SOUL_LENGTH = 40_000;
const MAX_FALLBACK_LENGTH = 1000;

export function SoulEditor({
  initialContent,
  initialFallbackReply,
  initialVersion,
}: {
  initialContent: string;
  initialFallbackReply: string;
  initialVersion: number;
}) {
  const [content, setContent] = useState(initialContent);
  const [fallbackReply, setFallbackReply] = useState(initialFallbackReply);
  const [version, setVersion] = useState(initialVersion);
  const [saving, setSaving] = useState(false);

  const changed =
    content !== initialContent || fallbackReply !== initialFallbackReply;
  const tooLong = content.length > MAX_SOUL_LENGTH;
  const fallbackTooLong = fallbackReply.length > MAX_FALLBACK_LENGTH;

  async function handleSave() {
    if (!changed || tooLong || fallbackTooLong || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/soul", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, fallbackReply }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not save the soul.");
        return;
      }
      setVersion(data.soul.version);
      toast.success("Soul saved. The WhatsApp AI will use it from the next message.");
    } catch {
      toast.error("Could not save the soul. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          These instructions are the single source of truth for the WhatsApp AI
          assistant. Everything it says — identity, services, fees, hours,
          location, appointment rules and greeting — must come from this file.
          Changes apply to new conversations.
        </p>
        <span className="shrink-0 text-xs text-muted-foreground">
          v{version}
        </span>
      </div>

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-80 flex-1 resize-y font-mono text-xs leading-relaxed"
        spellCheck={false}
        placeholder="# AI Identity
Write your assistant&apos;s instructions here (Markdown)."
      />

      <div className="flex items-center justify-between gap-2">
        <span className={tooLong ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
          {content.length.toLocaleString()} / {MAX_SOUL_LENGTH.toLocaleString()} characters
          {tooLong ? " — too long" : ""}
        </span>
        <Button onClick={() => void handleSave()} disabled={!changed || tooLong || fallbackTooLong || saving}>
          {saving ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>

      <FieldGroup className="border-t border-border pt-4">
        <Field>
          <FieldLabel htmlFor="fallbackReply">
            Fallback reply (when information is not in the soul)
          </FieldLabel>
          <Input
            id="fallbackReply"
            type="text"
            value={fallbackReply}
            onChange={(e) => setFallbackReply(e.target.value)}
            placeholder="I'm sorry, I couldn't find that information. Please contact the clinic for more details."
          />
          <FieldDescription>
            Sent when the answer is not found in the soul. The AI never answers
            from general knowledge.
          </FieldDescription>
          <span
            className={
              fallbackTooLong ? "text-xs text-destructive" : "text-xs text-muted-foreground"
            }
          >
            {fallbackReply.length.toLocaleString()} / {MAX_FALLBACK_LENGTH.toLocaleString()}{" "}
            characters{fallbackTooLong ? " — too long" : ""}
          </span>
        </Field>
      </FieldGroup>
    </div>
  );
}
