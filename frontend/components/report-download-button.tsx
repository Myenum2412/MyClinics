"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ReportDownloadButton({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);

  async function handleDownload() {
    setBusy(true);
    try {
      const res = await fetch(`/api/reports/${id}/url`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        toast.error(data.error || "Could not prepare the download link.");
        return;
      }
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Could not prepare the download link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={busy}
      aria-label="Download report"
    >
      <Download className="size-3.5" aria-hidden="true" />
      {busy ? "Preparing..." : "Download"}
    </Button>
  );
}