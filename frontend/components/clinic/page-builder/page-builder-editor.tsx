"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Puck } from "@measured/puck";
import "@measured/puck/puck.css";
import { toast } from "sonner";
import { Download, ExternalLink, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOwnClinic, publishClinicWebsitePage } from "@/lib/clinic-api";
import {
  defaultPageBuilderData,
  isPageBuilderData,
  makeDefaultPageBuilderData,
  pageBuilderConfig,
  type PageBuilderData,
} from "./config";
import styles from "./page-builder.module.css";

function cloneDefaultData(): PageBuilderData {
  return structuredClone(defaultPageBuilderData);
}

export function PageBuilderEditor({ clinicId }: { clinicId: string }) {
  const draftKey = `myclinics.page-builder.${clinicId}.draft`;

  const [data, setData] = useState<PageBuilderData>(() => cloneDefaultData());
  const [ready, setReady] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const dataRef = useRef<PageBuilderData>(data);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      let fallback: PageBuilderData | null = null;
      try {
        const raw = localStorage.getItem(draftKey);
        const draft: unknown = raw ? JSON.parse(raw) : null;
        if (isPageBuilderData(draft)) fallback = draft;
      } catch {
        // Ignore malformed local drafts.
      }

      try {
        const clinic = await getOwnClinic(clinicId);
        if (!active) return;

        const published = clinic.websitePage?.data;
        const next = isPageBuilderData(published)
          ? published
          : fallback ?? makeDefaultPageBuilderData(clinic.name || "My Clinic");

        setData(next);
        dataRef.current = next;
        setPublishedAt(clinic.websitePage?.publishedAt ?? null);
      } catch {
        if (!active) return;
        if (fallback) {
          setData(fallback);
          dataRef.current = fallback;
        }
        toast.error("Could not load the website settings");
      } finally {
        if (active) setReady(true);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [clinicId, draftKey]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const handleChange = useCallback(
    (next: PageBuilderData) => {
      dataRef.current = next;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        try {
          localStorage.setItem(draftKey, JSON.stringify(next));
        } catch {
          // Storage can be unavailable (private mode/quota); publishing still works.
        }
      }, 500);
    },
    [draftKey]
  );

  const handlePublish = useCallback(
    (next: PageBuilderData) => {
      dataRef.current = next;
      setPublishing(true);
      publishClinicWebsitePage(clinicId, next)
        .then((clinic) => {
          setPublishedAt(clinic.websitePage?.publishedAt ?? new Date().toISOString());
          try {
            localStorage.removeItem(draftKey);
          } catch {
            // Ignore storage failures.
          }
          toast.success("Website published");
        })
        .catch((err) => {
          toast.error(err instanceof Error ? err.message : "Failed to publish website");
        })
        .finally(() => setPublishing(false));
    },
    [clinicId, draftKey]
  );

  const handleReset = useCallback(() => {
    const fresh = cloneDefaultData();
    dataRef.current = fresh;
    setData(fresh);
    setEditorKey((key) => key + 1);
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // Ignore storage failures; the editor still resets in memory.
    }
    toast.success("Editor reset to the default layout");
  }, [draftKey]);

  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(dataRef.current, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `clinic-website-${clinicId}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [clinicId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Website Builder</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Design and publish your public clinic website. Changes stay private until you publish.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {publishing
              ? "Publishing…"
              : publishedAt
                ? `Last published ${new Date(publishedAt).toLocaleString()}`
                : "Not published yet"}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => window.open(`/site/${clinicId}`, "_blank", "noopener,noreferrer")}
          >
            <ExternalLink className="size-4" />
            View website
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
            <Download className="size-4" />
            Export JSON
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
            <RotateCcw className="size-4" />
            Reset
          </Button>
        </div>
      </div>

      <div
        className={`${styles.editor} h-[calc(100dvh-14rem)] min-h-[620px] overflow-hidden rounded-xl border border-border bg-background shadow-sm`}
      >
        {ready ? (
          <Puck
            key={`${editorKey}-${clinicId}`}
            config={pageBuilderConfig}
            data={data}
            iframe={{ enabled: false }}
            headerTitle="Website Builder"
            headerPath="Clinic website"
            onChange={handleChange}
            onPublish={handlePublish}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-sm font-medium">Loading editor…</p>
          </div>
        )}
      </div>
    </div>
  );
}
