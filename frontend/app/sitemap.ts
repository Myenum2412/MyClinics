import type { MetadataRoute } from "next";

import { now as nowDate } from "@/lib/datetime";
import { JOBS } from "@/lib/careers";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://myclinic.myenum.in";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = nowDate();

  const staticRoutes = ["", "/privacy", "/terms", "/login", "/changelog", "/careers"].map((path) => ({
    url: `${SITE}${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.8,
  }));

  const careerRoutes = JOBS.map((job) => ({
    url: `${SITE}/careers/${job.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...careerRoutes];
}
