"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Puck, usePuck } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import { toast } from "sonner";
import {
  Download,
  ExternalLink,
  Loader2,
  Monitor,
  Palette,
  Redo2,
  RotateCcw,
  Smartphone,
  Tablet,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOwnClinic, publishClinicWebsitePage } from "@/lib/clinic-api";
import {
  isPageBuilderData,
  pageBuilderConfig,
  type PageBuilderData,
} from "./config";
import { makeThemeTemplate, PAGE_THEME_OPTIONS } from "./templates";
import type { ThemePreset } from "./theme";
import { WebsiteBuilderProvider } from "./runtime";
import styles from "./page-builder.module.css";

function initialData(): PageBuilderData {
  return makeThemeTemplate("medical", "My Clinic");
}

function HistoryActions() {
  const { history } = usePuck();
  const canUndo = history.hasPast;
  const canRedo = history.hasFuture;

  return (
    <div className="flex items-center gap-1 pr-1">
      <button
        type="button"
        title="Undo (Ctrl/Cmd+Z)"
        aria-label="Undo"
        disabled={!canUndo}
        onClick={() => history.back()}
        className="flex size-8 items-center justify-center rounded-md border border-border bg-background text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Undo2 className="size-4" />
      </button>
      <button
        type="button"
        title="Redo (Ctrl/Cmd+Shift+Z)"
        aria-label="Redo"
        disabled={!canRedo}
        onClick={() => history.forward()}
        className="flex size-8 items-center justify-center rounded-md border border-border bg-background text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Redo2 className="size-4" />
      </button>
    </div>
  );
}

export function PageBuilderEditor({ clinicId }: { clinicId: string }) {
  const draftKey = `myclinics.page-builder.${clinicId}.draft`;

  const [data, setData] = useState<PageBuilderData>(() => initialData());
  const [ready, setReady] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [activeTheme, setActiveTheme] = useState<ThemePreset>("medical");
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const dataRef = useRef<PageBuilderData>(data);
  const activeThemeRef = useRef<ThemePreset>("medical");
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
        const publishedPuckPage = isPageBuilderData(published) ? published : null;
        const next =
          publishedPuckPage ??
          fallback ??
          makeThemeTemplate("medical", clinic.name || "My Clinic");

        setData(next);
        dataRef.current = next;
        const nextTheme = next.root.props?.theme ?? "medical";
        setActiveTheme(nextTheme);
        activeThemeRef.current = nextTheme;
        // Legacy HTML pages are still live, but they are not editable here.
        setPublishedAt(publishedPuckPage ? clinic.websitePage?.publishedAt ?? null : null);
      } catch {
        if (!active) return;
        if (fallback) {
          setData(fallback);
          dataRef.current = fallback;
          const nextTheme = fallback.root.props?.theme ?? "medical";
          setActiveTheme(nextTheme);
          activeThemeRef.current = nextTheme;
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
      const nextTheme = next.root.props?.theme ?? "medical";
      if (activeThemeRef.current !== nextTheme) {
        activeThemeRef.current = nextTheme;
        setActiveTheme(nextTheme);
        // Keep Puck's controlled data in sync only when the root theme
        // changes, so normal typing does not re-render the whole editor.
        setData(next);
      }
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
    if (
      !window.confirm(
        "Reset the page to the current theme's starter layout? Your unpublished edits will be lost."
      )
    ) {
      return;
    }
    const current = dataRef.current;
    const theme = current.root.props?.theme ?? "medical";
    const clinicName = current.root.props?.clinicName || "My Clinic";
    const fresh = makeThemeTemplate(theme, clinicName);
    dataRef.current = fresh;
    setData(fresh);
    setActiveTheme(theme);
    activeThemeRef.current = theme;
    setEditorKey((key) => key + 1);
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // Ignore storage failures; the editor still resets in memory.
    }
    toast.success("Layout reset to the current theme");
  }, [draftKey]);

  const applyTheme = useCallback(
    (theme: ThemePreset) => {
      const option = PAGE_THEME_OPTIONS.find((item) => item.value === theme);
      if (
        !window.confirm(
          `Apply the ${option?.label ?? theme} theme? This replaces the current page content with a ready-made layout for that theme.`
        )
      ) {
        return;
      }

      const clinicName = dataRef.current.root.props?.clinicName || "My Clinic";
      const fresh = makeThemeTemplate(theme, clinicName);
      dataRef.current = fresh;
      setData(fresh);
      setActiveTheme(theme);
      activeThemeRef.current = theme;
      setEditorKey((key) => key + 1);
      try {
        localStorage.setItem(draftKey, JSON.stringify(fresh));
      } catch {
        // Publishing still works without draft storage.
      }
      toast.success(`${option?.label ?? theme} theme applied`);
    },
    [draftKey]
  );

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
    <div className="w-full max-w-none space-y-4">
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
            Reset layout
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
            <Palette className="size-4 text-primary" />
            Starter themes
          </span>
          {PAGE_THEME_OPTIONS.map((option) => {
            const isActive = activeTheme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => applyTheme(option.value)}
                title={option.description}
                className={`group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? "border-primary bg-primary/10 text-primary shadow-sm"
                    : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/60"
                }`}
              >
                <span className="flex -space-x-1">
                  <span
                    className="size-4 rounded-full border-2 border-background shadow-sm"
                    style={{ backgroundColor: option.primary }}
                  />
                  <span
                    className="size-4 rounded-full border-2 border-background shadow-sm"
                    style={{ backgroundColor: option.accent }}
                  />
                </span>
                {option.label}
                {isActive ? <span className="text-[10px] uppercase">Active</span> : null}
              </button>
            );
          })}
          <span className="ml-auto text-xs text-muted-foreground">
            Applying a theme replaces the layout. Fine-tune colours, fonts and radius in the Page tab →
          </span>
        </div>
      </div>

      <div
        className={`${styles.editor} h-[calc(100dvh-17rem)] min-h-[620px] w-full max-w-none min-w-0 overflow-hidden rounded-xl border border-border bg-background shadow-sm`}
      >
        {ready ? (
          <WebsiteBuilderProvider clinicId={clinicId}>
            <Puck
              key={`${editorKey}-${clinicId}`}
              config={pageBuilderConfig}
              data={data}
              iframe={{ enabled: false }}
              headerTitle="Website Builder"
              headerPath="Clinic website"
              viewports={[
                {
                  width: 1280,
                  height: "auto",
                  label: "Desktop",
                  icon: <Monitor className="size-4" />,
                },
                {
                  width: 768,
                  height: "auto",
                  label: "Tablet",
                  icon: <Tablet className="size-4" />,
                },
                {
                  width: 390,
                  height: "auto",
                  label: "Mobile",
                  icon: <Smartphone className="size-4" />,
                },
              ]}
              overrides={{
                headerActions: ({ children }) => (
                  <div className="flex items-center gap-1">
                    <HistoryActions />
                    {children}
                  </div>
                ),
              }}
              onChange={handleChange}
              onPublish={handlePublish}
            />
          </WebsiteBuilderProvider>
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
