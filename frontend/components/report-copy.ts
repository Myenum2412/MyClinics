"use client";

import type { FileCategoryValue } from "@/lib/report-folders";

export async function saveReportCopy(opts: {
  html: string;
  fileName: string;
  category: FileCategoryValue;
  patientId?: string | null;
  patientName?: string;
}) {
  const file = new File([opts.html], opts.fileName, {
    type: "text/html;charset=utf-8",
  });
  const form = new FormData();
  form.append("file", file);
  form.append("category", opts.category);
  if (opts.patientId) form.append("patientId", opts.patientId);
  if (opts.patientName) form.append("patientName", opts.patientName);
  const res = await fetch("/api/reports", { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to save copy to patient folder.");
  return data.file as { id: string; name: string };
}
