import crypto from "crypto"
import fs from "fs"
import path from "path"

const PALETTES = [
  { sky1: "#312E81", sky2: "#4F46E5", blob1: "#A5B4FC", blob2: "#818CF8", card: "#FFFFFF", text: "#1E1B4B", chipBg: "#EEF2FF", chipText: "#4338CA" },
  { sky1: "#0F766E", sky2: "#14B8A6", blob1: "#99F6E4", blob2: "#5EEAD4", card: "#FFFFFF", text: "#134E4A", chipBg: "#F0FDFA", chipText: "#0F766E" },
  { sky1: "#9D174D", sky2: "#EC4899", blob1: "#FBCFE8", blob2: "#F9A8D4", card: "#FFFFFF", text: "#500724", chipBg: "#FDF2F8", chipText: "#BE185D" },
]

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function wrapTitle(title: string, max = 26, maxLines = 4): string[] {
  const words = title.split(/\s+/)
  const lines: string[] = []
  let cur = ""
  for (const w of words) {
    if ((cur + " " + w).trim().length > max && cur) {
      lines.push(cur.trim())
      cur = w
      if (lines.length === maxLines - 1) break
    } else cur = `${cur} ${w}`.trim()
  }
  if (lines.length < maxLines && cur) lines.push(cur.trim())
  if (lines.length === maxLines) {
    const consumed = lines.join(" ").split(/\s+/).length
    if (consumed < words.length) {
      const last = lines[maxLines - 1]
      lines[maxLines - 1] = last.length > max - 1 ? last.slice(0, max - 2) + "…" : last + "…"
    }
  }
  return lines.slice(0, maxLines)
}

let logoDataUri: string | null | undefined
function getLogoDataUri() {
  if (logoDataUri !== undefined) return logoDataUri
  try {
    const p = path.join(process.cwd(), "public", "logobg.png")
    const b = fs.readFileSync(p)
    logoDataUri = `data:image/png;base64,${b.toString("base64")}`
  } catch {
    logoDataUri = null
  }
  return logoDataUri
}

export function blogCoverSvg(slug: string, title: string, category: string): string {
  const h = parseInt(crypto.createHash("md5").update(slug).digest("hex").slice(0, 8), 16)
  const pal = PALETTES[h % PALETTES.length]
  const variant = Math.floor(h / PALETTES.length) % 4

  const decor: string[] = []
  // dotted grid
  for (let x = 0; x < 12; x++)
    for (let y = 0; y < 5; y++)
      decor.push(`<circle cx="${60 + x * 42}" cy="${480 + y * 30}" r="2.5" fill="${pal.blob1}" opacity="0.35"/>`)
  // big soft blobs (2D flat art)
  decor.push(`<circle cx="${1040 + (variant % 2) * 40}" cy="110" r="150" fill="${pal.blob2}" opacity="0.55"/>`)
  decor.push(`<circle cx="180" cy="${520 - (variant % 3) * 40}" r="110" fill="${pal.blob1}" opacity="0.5"/>`)
  // rings
  decor.push(`<circle cx="${980 - (variant % 2) * 60}" cy="470" r="80" fill="none" stroke="${pal.blob1}" stroke-width="14" opacity="0.7"/>`)
  // clinic crosses motif
  const cross = (cx: number, cy: number, s: number, o: number) =>
    `<g transform="translate(${cx},${cy})" opacity="${o}"><rect x="${-s / 6}" y="${-s / 2}" width="${s / 3}" height="${s}" rx="${s / 10}" fill="${pal.card}"/><rect x="${-s / 2}" y="${-s / 6}" width="${s}" height="${s / 3}" rx="${s / 10}" fill="${pal.card}"/></g>`
  decor.push(cross(90, 120, 56, 0.9))
  decor.push(cross(1130, 300, 44, 0.75))
  if (variant >= 2) decor.push(cross(620, 70, 36, 0.5))
  // diagonal ribbon
  decor.push(
    `<rect x="-100" y="${variant % 2 ? 360 : 400}" width="1400" height="26" rx="13" fill="${pal.blob2}" opacity="0.45" transform="rotate(-6 600 400)"/>`
  )

  const lines = wrapTitle(title)
  const lineHeight = 52
  const blockH = lines.length * lineHeight
  const startY = 250 - blockH / 2 + 38

  const logo = getLogoDataUri()
  const logoSvg = logo
    ? `<clipPath id="lc"><circle cx="1080" cy="520" r="46"/></clipPath><image href="${logo}" x="1034" y="474" width="92" height="92" preserveAspectRatio="xMidYMid slice" clip-path="url(#lc)"/><circle cx="1080" cy="520" r="46" fill="none" stroke="${pal.card}" stroke-width="4"/>`
    : ""

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${pal.sky1}"/>
    <stop offset="100%" stop-color="${pal.sky2}"/>
  </linearGradient>
</defs>
<rect width="1200" height="630" fill="url(#bg)"/>
${decor.join("\n")}
<rect x="70" y="180" width="760" height="270" rx="28" fill="${pal.card}" opacity="0.97"/>
<g>
  <rect x="102" y="212" width="${Math.min(340, 22 + category.length * 11)}" height="34" rx="17" fill="${pal.chipBg}"/>
  <text x="122" y="235" font-family="Segoe UI,Arial,sans-serif" font-size="18" font-weight="600" fill="${pal.chipText}">${esc(category)}</text>
</g>
${lines
  .map(
    (l, i) =>
      `<text x="102" y="${startY + i * lineHeight}" font-family="Segoe UI,Arial,sans-serif" font-size="38" font-weight="700" fill="${pal.text}">${esc(l)}</text>`
  )
  .join("\n")}
${logoSvg}
<text x="70" y="594" font-family="Segoe UI,Arial,sans-serif" font-size="22" fill="${pal.card}" opacity="0.85">My Clinics — Healthcare above the clouds</text>
</svg>`
}
