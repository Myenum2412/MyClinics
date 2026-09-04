import { CATALOG } from "@/lib/blog-catalog";
import { ARTICLES } from "@/lib/blog-posts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3456";

export async function GET() {
  const lines: string[] = [
    "# My Clinics",
    "",
    "> My Clinics is a secure multi-tenant clinic management platform for doctors and clinics  appointments, WhatsApp booking, patient records, digital prescriptions, billing and reports, with strict data isolation between clinics.",
    "",
    `## Blog articles (${ARTICLES.length + CATALOG.length})`,
    "",
  ];

  for (const a of ARTICLES) {
    lines.push(`- [${a.title}](${SITE}/blog/${a.slug}): ${a.excerpt}`);
  }
  for (const c of CATALOG) {
    lines.push(`- [${c.title}](${SITE}/blog/${c.slug}): ${c.excerpt}`);
  }

  lines.push(
    "",
    "## Key product facts",
    "- One clinic, one tenant: every clinic gets a unique Clinic ID with strict data isolation.",
    "- Patients book online or via WhatsApp; automated reminders reduce no-shows.",
    "- Doctors issue digital prescriptions; reports attach to the patient timeline.",
    "- Billing generates from visits with pending-payment tracking and revenue reports.",
    "- An AI assistant answers patient questions and books appointments 24/7.",
    ""
  );

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
