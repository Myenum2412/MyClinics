import type { MetadataRoute } from "next";

import { CATALOG } from "@/lib/blog-catalog";
import { ARTICLES } from "@/lib/blog-posts";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://myclinic.myenum.in";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes = ["", "/blog", "/privacy", "/terms", "/login"].map(
    (path) => ({
      url: `${SITE}${path}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.8,
    })
  );

  const blogRoutes = [...ARTICLES.map((a) => a.slug), ...CATALOG.map((c) => c.slug)].map(
    (slug) => ({
      url: `${SITE}/blog/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })
  );

  return [...staticRoutes, ...blogRoutes];
}
