import { NextResponse } from "next/server"

import { findCatalogEntry } from "@/lib/blog-catalog"
import { blogCoverSvg } from "@/lib/blog-cover-svg"
import { ARTICLES } from "@/lib/blog-posts"

export const runtime = "nodejs"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  let title: string | undefined
  let category: string | undefined
  if (slug === "featured") {
    title = ARTICLES[0].title
    category = ARTICLES[0].category
  } else {
    const entry = findCatalogEntry(slug)
    if (entry) {
      title = entry.title
      category = entry.cluster
    } else {
      const curated = ARTICLES.find((a) => a.slug === slug)
      if (curated) {
        title = curated.title
        category = curated.category
      }
    }
  }

  if (!title || !category) {
    return new NextResponse("Not found", { status: 404 })
  }

  const svg = blogCoverSvg(slug, title, category)
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  })
}
