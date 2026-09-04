import type { MetadataRoute } from "next";

import { now as nowDate } from "@/lib/datetime";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://myclinic.myenum.in";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = nowDate();

  const staticRoutes = ["", "/privacy", "/terms", "/login", "/changelog"].map(
    (path) => ({
      url: `${SITE}${path}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.8,
    })
  );

  return staticRoutes;
}
