import type { MetadataRoute } from "next";

import { now as nowDate } from "@/lib/datetime";
import { JOBS } from "@/lib/careers";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://myclinic.myenum.in";

const BACKEND_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ||
  process.env.BACKEND_URL?.replace(/\/+$/, "") ||
  (process.env.NODE_ENV === "production" ? "https://api.myclinic.myenum.in" : "http://localhost:3100");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = nowDate();

  const staticRoutes = ["", "/privacy", "/terms", "/login", "/changelog", "/careers", "/clinics"].map((path) => ({
    url: `${SITE}${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : path === "/clinics" ? 0.9 : 0.8,
  }));

  const careerRoutes = JOBS.map((job) => ({
    url: `${SITE}/careers/${job.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // Public clinics — best-effort (fails gracefully at build if backend unreachable)
  let clinicRoutes: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${BACKEND_BASE}/api/public/clinics?limit=100`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = (await res.json()) as { items: Array<{ slug: string; clinicId: string; updatedAt?: string }> };
      clinicRoutes = (data.items ?? []).map((c) => ({
        url: `${SITE}/c/${encodeURIComponent(c.slug || c.clinicId)}`,
        lastModified: c.updatedAt ? new Date(c.updatedAt) : now,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
    }
  } catch {
    // ignore — sitemap still builds without clinics
  }

  return [...staticRoutes, ...careerRoutes, ...clinicRoutes];
}
