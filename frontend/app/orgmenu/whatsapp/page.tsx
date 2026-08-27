"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type Recipient = "Patient" | "Doctor" | "Staff" | "Patient & Doctor";

interface Template {
  key: string;
  category: string;
  title: string;
  recipient: Recipient;
  description: string;
  sample: string;
}

const RECIPIENT_VARIANT: Record<Recipient, "default" | "secondary" | "outline" | "ghost"> = {
  Patient: "default",
  Doctor: "secondary",
  Staff: "outline",
  "Patient & Doctor": "ghost",
};

export default function WhatsAppMessagesPage() {
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/organization/whatsapp-notifications", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setTemplates(data?.templates ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, Template[]>();
    for (const t of templates ?? []) {
      const list = map.get(t.category) ?? [];
      list.push(t);
      map.set(t.category, list);
    }
    return Array.from(map.entries());
  }, [templates]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">WhatsApp Messages</h1>
        <p className="text-sm text-muted-foreground">
          Every WhatsApp text message the platform sends to patients and staff.{" "}
          {"{Placeholders}"} are replaced with live data at send time.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">
          Failed to load WhatsApp message templates.
        </p>
      ) : !grouped.length ? (
        <p className="text-sm text-muted-foreground">No message templates found.</p>
      ) : (
        grouped.map(([category, items]) => (
          <section key={category} className="flex flex-col gap-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {category}
            </h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {items.map((t) => (
                <Card key={t.key}>
                  <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                    <CardTitle className="text-base">{t.title}</CardTitle>
                    <Badge variant={RECIPIENT_VARIANT[t.recipient]}>{t.recipient}</Badge>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <p className="text-sm text-muted-foreground">{t.description}</p>
                    <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs leading-relaxed">
                      {t.sample}
                    </pre>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
