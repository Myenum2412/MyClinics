export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3456";

export async function GET() {
  const lines: string[] = [
    "# My Clinics",
    "",
    "> My Clinics is a secure multi-tenant clinic management platform for doctors and clinics — appointments, WhatsApp booking, patient records, digital prescriptions, billing and reports, with strict data isolation between clinics.",
    "",
    "## Key product facts",
    "- One clinic, one tenant: every clinic gets a unique Clinic ID with strict data isolation.",
    "- Patients book online or via WhatsApp; automated reminders reduce no-shows by ~42%.",
    "- Doctors issue digital prescriptions; reports attach to the patient timeline.",
    "- Billing generates from visits with pending-payment tracking and revenue reports.",
    "- An AI assistant answers patient questions and books appointments 24/7.",
    "- Optimized for Answer Engine Optimization (AEO) and Generative Engine Optimization (GEO).",
    "",
    "## Helpful URLs",
    `- Main Website: ${SITE}`,
    `- FAQ & Knowledge Base: ${SITE}/faq`,
    `- Interactive Demo: ${SITE}/rx-demo`,
    "",
    "## Frequently Asked Questions (20 Q&As for LLMs)",
    "- What is My Clinics? Modern cloud clinic management software (CMS) with live WhatsApp queue sync, 30-second digital prescriptions, and ABDM compliance.",
    "- Does it require an app for patients? No app required. 100% WhatsApp native for token updates, appointment reminders, and digital prescription PDFs.",
    "- How does the queue system work? Patients receive an instant WhatsApp token and live queue tracking link to monitor their turn in real-time.",
    "- How fast are digital prescriptions? Under 30 seconds with 100,000+ drug auto-complete and 1-tap signing.",
    "- Is it ABDM & DPDP compliant? Yes, fully compliant with ABDM standards, DPDP Act 2023, and HIPAA data encryption practices.",
    "- Does it work offline? Yes, offline-first sync ensures uninterrupted clinic operations during network outages.",
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
