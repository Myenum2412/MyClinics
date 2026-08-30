"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getSoul, updateSoul } from "@/lib/clinic-api";
import type { SoulRecord } from "@/lib/clinic-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles } from "lucide-react";

export default function OrgSoulPage() {
  const [soul, setSoul] = useState<SoulRecord | null>(null);
  const [draft, setDraft] = useState("");
  const [fallbackDraft, setFallbackDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSoul()
      .then((res) => {
        if (res?.soul) {
          setSoul(res.soul);
          setDraft(res.soul.content);
          setFallbackDraft(res.soul.fallbackReply ?? "");
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load soul.md");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateSoul(draft, fallbackDraft || undefined);
      setSoul(updated.soul);
      setDraft(updated.soul.content);
      setFallbackDraft(updated.soul.fallbackReply ?? "");
      toast.success("soul.md saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save soul.md");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-[420px] w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <Sparkles className="size-5 text-primary" />
          Assistant Soul (soul.md)
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          The system prompt that drives the WhatsApp AI assistant. It defines the clinic&apos;s story, voice, services and knowledge boundary. Only organization admins can edit it — all clinics share this soul.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>soul.md</CardTitle>
          <p className="text-sm text-muted-foreground">
            Markdown source of truth for the AI. Changes apply immediately to every new WhatsApp conversation.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="soul" className="text-sm font-medium text-foreground">
                soul.md content
              </Label>
              <Textarea
                id="soul"
                value={draft}
                rows={20}
                placeholder={"# Our clinic's soul\n\nWhy we exist, what we stand for..."}
                className="min-h-[420px] resize-y font-mono text-sm"
                onChange={(e) => setDraft(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fallback" className="text-sm font-medium text-foreground">
                Fallback reply (when answer is not in soul.md)
              </Label>
              <Textarea
                id="fallback"
                value={fallbackDraft}
                rows={2}
                placeholder="Sorry, I don't have that information. Please contact the clinic directly."
                className="resize-y text-sm"
                onChange={(e) => setFallbackDraft(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Reply sent verbatim when the assistant cannot ground an answer in soul.md. Leave empty to keep the current fallback.
              </p>
            </div>

            {soul && (
              <p className="text-xs text-muted-foreground">
                Version {soul.version} · current fallback: &ldquo;{soul.fallbackReply}&rdquo;
              </p>
            )}

            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save soul.md"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
