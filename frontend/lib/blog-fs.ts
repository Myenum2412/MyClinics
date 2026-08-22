import fs from "fs"
import path from "path"

import type { ArticleSection, Faq, ResolvedArticle } from "./blog-content"

const idify = (t: string) =>
  t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

function parseArticle(raw: string): ResolvedArticle | null {
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n/)
  if (!fmMatch) return null
  const meta: Record<string, string> = {}
  for (const line of fmMatch[1].split("\n")) {
    const idx = line.indexOf(":")
    if (idx > 0) meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
  }
  if (!meta.Title || !meta.Category) return null

  const body = raw.slice(fmMatch[0].length)
  const chunks = body.split(/\n(?=## )/g)
  const sections: ArticleSection[] = []
  const faqs: Faq[] = []
  let charCount = 0

  for (const chunk of chunks) {
    const lines = chunk.split("\n").filter((l) => l.trim() !== "")
    if (!lines.length) continue
    if (!lines[0].startsWith("## ")) continue
    const title = lines[0].slice(3).trim()
    if (/^frequently asked questions$/i.test(title)) {
      let q: string | null = null
      for (const line of lines.slice(1)) {
        if (line.startsWith("Q: ")) q = line.slice(3).trim()
        else if (line.startsWith("A: ") && q) {
          faqs.push({ q, a: line.slice(3).trim() })
          q = null
        }
        charCount += line.length
      }
      continue
    }
    const bodyParts: string[] = []
    let buffer: string[] = []
    const flush = () => {
      if (buffer.length) {
        bodyParts.push(buffer.join(" "))
        buffer = []
      }
    }
    for (const line of lines.slice(1)) {
      charCount += line.length
      if (line.startsWith("- [ ] ")) { flush(); bodyParts.push(`☐ ${line.slice(6).trim()}`) }
      else if (line.startsWith("- ")) { flush(); bodyParts.push(`• ${line.slice(2).trim()}`) }
      else buffer.push(line.replace(/\*\*/g, "").replace(/\s*Q:\s*/, "").trim())
    }
    flush()
    sections.push({ id: idify(title), title, body: bodyParts })
  }

  charCount += (meta.Excerpt ?? "").length
  const words = Math.round(charCount / 6)
  const readTime = `${Math.max(5, Math.min(12, Math.round(words / 200)))} Min Read`

  return {
    slug: idify(meta.Title),
    title: meta.Title,
    category: meta.Category,
    excerpt: meta.Excerpt ?? "",
    author: {
      name: meta.AuthorName ?? "My Clinics Team",
      initials: meta.AuthorInitials ?? "MC",
      img: Number(meta.AuthorImg ?? 26),
    },
    date: meta.Date ?? "",
    readTime: meta.ReadTime ?? readTime,
    sections,
    faqs,
  }
}

export function readBlogFileArticle(slug: string): ResolvedArticle | null {
  try {
    const p = path.join(process.cwd(), "content", "blog", slug, "article.md")
    if (!fs.existsSync(p)) return null
    return parseArticle(fs.readFileSync(p, "utf8"))
  } catch {
    return null
  }
}
