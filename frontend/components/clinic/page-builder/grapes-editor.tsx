"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor, ProjectData } from "grapesjs";
import "grapesjs/dist/css/grapes.min.css";
import { toast } from "sonner";
import {
  Code2,
  Download,
  ExternalLink,
  Eye,
  FileArchive,
  Images,
  Loader2,
  Monitor,
  Redo2,
  RotateCcw,
  Save,
  Smartphone,
  Tablet,
  Undo2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOwnClinic, publishClinicWebsitePage } from "@/lib/clinic-api";
import { isGrapesWebsiteData } from "@/lib/website";
import { STARTER_CSS, STARTER_HTML } from "./template";
import styles from "./grapes-editor.module.css";

type GjsPlugin = (editor: Editor, opts?: Record<string, unknown>) => void;

function asPlugin(mod: unknown): GjsPlugin {
  const value = mod as { default?: unknown };
  return (value.default ?? mod) as GjsPlugin;
}

function withOptions(plugin: GjsPlugin, opts: Record<string, unknown>): GjsPlugin {
  return (editor) => plugin(editor, opts);
}

type Device = "Desktop" | "Tablet" | "Mobile";

export function GrapesEditor({ clinicId }: { clinicId: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [ready, setReady] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [device, setDevice] = useState<Device>("Desktop");
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const draftKey = `myclinics.website-builder.${clinicId}.draft`;

  const syncHistory = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const undo = editor.UndoManager;
    setCanUndo(undo.hasUndo());
    setCanRedo(undo.hasRedo());
  }, []);

  useEffect(() => {
    let active = true;
    let editor: Editor | null = null;

    async function boot() {
      let fallback: unknown = null;
      try {
        const raw = localStorage.getItem(draftKey);
        fallback = raw ? JSON.parse(raw) : null;
      } catch {
        fallback = null;
      }

      const clinicPromise = getOwnClinic(clinicId).catch(() => null);
      const modules = await Promise.all([
        import("grapesjs"),
        import("grapesjs-preset-webpage"),
        import("grapesjs-blocks-basic"),
        import("grapesjs-blocks-flexbox"),
        import("grapesjs-plugin-forms"),
        import("grapesjs-tabs"),
        import("grapesjs-custom-code"),
        import("grapesjs-style-bg"),
        import("grapesjs-component-code-editor"),
        import("grapesjs-parser-postcss"),
        import("grapesjs-plugin-export"),
      ]);

      if (!active || !containerRef.current) return;

      const grapesjs = modules[0].default;
      const [
        presetWebpage,
        blocksBasic,
        blocksFlexbox,
        pluginForms,
        pluginTabs,
        customCode,
        styleBg,
        componentCodeEditor,
        parserPostcss,
        pluginExport,
      ] = modules.slice(1).map(asPlugin);

      const instance = grapesjs.init({
        container: containerRef.current,
        height: "100%",
        width: "auto",
        fromElement: false,
        storageManager: false,
        cssIcons: "",
        undoManager: { trackSelection: true },
        plugins: [
          withOptions(presetWebpage, {
            modalImportTitle: "Import page",
            modalImportLabel: "Paste HTML to import it into the canvas",
            textCleanCanvas: "Clear all content and styles from the page?",
            showStylesOnChange: true,
          }),
          withOptions(blocksBasic, { flexGrid: true }),
          withOptions(blocksFlexbox, {}),
          withOptions(pluginForms, { category: "Forms" }),
          withOptions(pluginTabs, {}),
          withOptions(customCode, {}),
          withOptions(styleBg, {}),
          withOptions(componentCodeEditor, {}),
          withOptions(parserPostcss, {}),
          withOptions(pluginExport, { filenamePfx: "clinic-website" }),
        ],
        deviceManager: {
          devices: [
            { id: "Desktop", name: "Desktop", width: "" },
            { id: "Tablet", name: "Tablet", width: "768px" },
            { id: "Mobile", name: "Mobile", width: "375px" },
          ],
        },
        canvas: {
          styles: [
            "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
          ],
        },
        // The starter layout used to cap the page at 1120px. Keep projects
        // saved before that change full width in the editor preview too.
        protectedCss:
          '* { box-sizing: border-box; } body { margin: 0; } .mc-shell { max-width: none; }',
        assetManager: {
          upload: false,
        },
        selectorManager: { componentFirst: true },
      });

      editor = instance;
      editorRef.current = instance;

      const scheduleDraft = () => {
        if (draftTimer.current) clearTimeout(draftTimer.current);
        draftTimer.current = setTimeout(() => {
          try {
            localStorage.setItem(
              draftKey,
              JSON.stringify({
                html: instance.getHtml(),
                css: instance.getCss(),
                project: instance.getProjectData(),
              })
            );
          } catch {
            // Storage can be unavailable (private mode/quota).
          }
        }, 1200);
      };

      editor.on("update", scheduleDraft);
      editor.on("undo", syncHistory);
      editor.on("redo", syncHistory);
      editor.on("command:run:preview", () => setPreviewing(true));
      editor.on("command:stop:preview", () => setPreviewing(false));
      editor.on("device:select", (next) => {
        const name = next?.get("name");
        if (name === "Desktop" || name === "Tablet" || name === "Mobile") {
          setDevice(name);
        }
      });

      const clinic = await clinicPromise;
      if (!active) return;

      const published = clinic?.websitePage?.data;
      if (isGrapesWebsiteData(published)) {
        if (published.project && typeof published.project === "object") {
          try {
            editor.loadProjectData(published.project as ProjectData);
          } catch {
            editor.setComponents(published.html);
            editor.setStyle(published.css);
          }
        } else {
          editor.setComponents(published.html);
          editor.setStyle(published.css);
        }
        setPublishedAt(clinic?.websitePage?.publishedAt ?? null);
      } else if (isGrapesWebsiteData(fallback)) {
        if (fallback.project && typeof fallback.project === "object") {
          try {
            editor.loadProjectData(fallback.project as ProjectData);
          } catch {
            editor.setComponents(fallback.html);
            editor.setStyle(fallback.css);
          }
        } else {
          editor.setComponents(fallback.html);
          editor.setStyle(fallback.css);
        }
      } else {
        editor.setComponents(STARTER_HTML);
        editor.setStyle(STARTER_CSS);
        editor.UndoManager.clear();
      }

      editor.setDevice("Desktop");
      syncHistory();
      setReady(true);
    }

    void boot().catch((err) => {
      console.error(err);
      toast.error("Could not start the website editor");
    });

    return () => {
      active = false;
      if (draftTimer.current) clearTimeout(draftTimer.current);
      editorRef.current = null;
      editor?.destroy();
    };
  }, [clinicId, draftKey, syncHistory]);

  const handleUndo = useCallback(() => {
    editorRef.current?.UndoManager.undo();
    syncHistory();
  }, [syncHistory]);

  const handleRedo = useCallback(() => {
    editorRef.current?.UndoManager.redo();
    syncHistory();
  }, [syncHistory]);

  const handleDevice = useCallback((next: Device) => {
    editorRef.current?.setDevice(next);
    setDevice(next);
  }, []);

  const handlePreview = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (previewing) editor.stopCommand("preview");
    else editor.runCommand("preview");
  }, [previewing]);

  const handleCode = useCallback(() => {
    editorRef.current?.runCommand("export-template");
  }, []);

  const handleImport = useCallback(() => {
    editorRef.current?.runCommand("gjs-open-import-webpage");
  }, []);

  const handleAssets = useCallback(() => {
    editorRef.current?.runCommand("open-assets");
  }, []);

  const handleExportZip = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (editor.Commands.has("gjs-export-zip")) {
      editor.runCommand("gjs-export-zip");
    } else {
      toast.error("ZIP export is not available");
    }
  }, []);

  const handleReset = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (!window.confirm("Reset the page to the starter layout? Published changes stay live until you publish again.")) {
      return;
    }
    editor.setComponents(STARTER_HTML);
    editor.setStyle(STARTER_CSS);
    editor.UndoManager.clear();
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // Ignore storage failures.
    }
    syncHistory();
    toast.success("Editor reset to the starter layout");
  }, [draftKey, syncHistory]);

  const handlePublish = useCallback(() => {
    const editor = editorRef.current;
    if (!editor || publishing) return;
    setPublishing(true);
    const data = {
      html: editor.getHtml(),
      css: editor.getCss(),
      project: editor.getProjectData(),
    };
    publishClinicWebsitePage(clinicId, data)
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
  }, [clinicId, draftKey, publishing]);

  return (
    <div className="w-full max-w-none space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Website Builder</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Full GrapesJS editor — drag blocks, edit content, style elements, manage layers and
            publish straight to your public clinic website.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {publishedAt
              ? `Last published ${new Date(publishedAt).toLocaleString()}`
              : "Not published yet"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => window.open(`/site/${clinicId}`, "_blank", "noopener,noreferrer")}
          >
            <ExternalLink className="size-4" />
            View website
          </Button>
          <Button size="sm" className="gap-1.5" onClick={handlePublish} disabled={!ready || publishing}>
            {publishing ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {publishing ? "Publishing…" : "Publish"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-muted/40 p-1.5">
        <Button variant="ghost" size="icon-sm" onClick={handleUndo} disabled={!canUndo} title="Undo">
          <Undo2 className="size-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={handleRedo} disabled={!canRedo} title="Redo">
          <Redo2 className="size-4" />
        </Button>
        <span className="mx-1 h-5 w-px bg-border" />
        <Button
          variant={device === "Desktop" ? "secondary" : "ghost"}
          size="icon-sm"
          onClick={() => handleDevice("Desktop")}
          title="Desktop preview"
        >
          <Monitor className="size-4" />
        </Button>
        <Button
          variant={device === "Tablet" ? "secondary" : "ghost"}
          size="icon-sm"
          onClick={() => handleDevice("Tablet")}
          title="Tablet preview"
        >
          <Tablet className="size-4" />
        </Button>
        <Button
          variant={device === "Mobile" ? "secondary" : "ghost"}
          size="icon-sm"
          onClick={() => handleDevice("Mobile")}
          title="Mobile preview"
        >
          <Smartphone className="size-4" />
        </Button>
        <span className="mx-1 h-5 w-px bg-border" />
        <Button
          variant={previewing ? "secondary" : "ghost"}
          size="icon-sm"
          onClick={handlePreview}
          title="Preview"
        >
          <Eye className="size-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={handleCode} title="View HTML & CSS">
          <Code2 className="size-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={handleImport} title="Import HTML">
          <Upload className="size-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={handleAssets} title="Open assets">
          <Images className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleExportZip}
          title="Export website as ZIP"
        >
          <FileArchive className="size-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={handleReset} title="Reset to starter layout">
          <RotateCcw className="size-4" />
        </Button>
        <span className="ml-auto hidden items-center gap-1 pr-1 text-[11px] text-muted-foreground sm:flex">
          <Download className="size-3" />
          Draft autosaves locally
        </span>
      </div>

      <div className={`${styles.editor} relative h-[calc(100dvh-17rem)] min-h-[640px] w-full max-w-none min-w-0 overflow-hidden rounded-xl border border-border bg-background shadow-sm`}>
        {!ready ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-sm font-medium">Loading GrapesJS editor…</p>
          </div>
        ) : null}
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </div>
  );
}
