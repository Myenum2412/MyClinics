"use client";

import * as React from "react";
import { toast } from "sonner";
import { askNeo } from "@/lib/neo-api";
import { SectionCard, LoadingState } from "@/components/org/neo/neo-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const SUGGESTIONS = [
  "What is wrong right now?",
  "Show today's critical incidents",
  "What will likely fail next?",
  "Why is the organization unhealthy?",
  "Which clinic is at highest risk?",
];

export default function RgbNeoAiPage() {
  const [question, setQuestion] = React.useState("");
  const [answer, setAnswer] = React.useState<{ interpretation: string; data: unknown } | null>(null);
  const [loading, setLoading] = React.useState(false);

  const ask = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await askNeo(q);
      setAnswer(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to query AI");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">AI Incident Assistant</h1>
        <p className="text-sm text-muted-foreground">
          Ask in natural language. Answers are built from real RGB Neo telemetry — never invented.
        </p>
      </div>

      <SectionCard title="Ask RGB Neo">
        <div className="flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask(question)}
            placeholder="e.g. Why is Clinic ABC unhealthy?"
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <Button onClick={() => ask(question)} disabled={loading}>
            Ask
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => {
                setQuestion(s);
                ask(s);
              }}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:border-primary"
            >
              {s}
            </button>
          ))}
        </div>
      </SectionCard>

      {loading ? (
        <LoadingState label="Analyzing telemetry…" />
      ) : answer ? (
        <SectionCard title="Response">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{answer.interpretation}</p>
          <Card className="mt-3">
            <CardContent className="p-3">
              <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap text-xs text-foreground">
                {JSON.stringify(answer.data, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </SectionCard>
      ) : null}
    </div>
  );
}
