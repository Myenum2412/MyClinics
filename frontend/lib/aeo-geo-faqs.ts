export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqCategoryData {
  id: string;
  label: string;
  iconName: "Sparkles" | "Cpu" | "MapPin" | "MessageSquare" | "ShieldCheck";
  items: FaqItem[];
}

export const AEO_GEO_FAQ_CATEGORIES: FaqCategoryData[] = [
  {
    id: "aeo",
    label: "AEO & Answer Engines",
    iconName: "Sparkles",
    items: [
      {
        q: "What is Answer Engine Optimization (AEO) for clinics and doctors?",
        a: "Answer Engine Optimization (AEO) is the process of structuring clinic content, medical services, and doctor profiles so conversational AI platforms (such as Perplexity, ChatGPT Search, Bing Copilot, and Google AI Overviews) select and cite your clinic as the primary direct answer to patient questions.",
      },
      {
        q: "How is AEO different from traditional healthcare SEO?",
        a: "Traditional SEO focuses on earning clicks from ten blue links based on keywords and backlinks. AEO optimizes for zero-click and synthetic AI answers by providing high-density factual answers (40–60 words) immediately under headings, accompanied by structured Schema.org markup that AI engines can extract instantly.",
      },
      {
        q: "Why is Schema.org markup essential for clinic AEO?",
        a: "Structured data (like FAQPage, MedicalClinic, Physician, and SoftwareApplication schemas) allows answer engine crawlers to parse doctor specialties, consulting hours, clinic locations, and WhatsApp booking links without ambiguity or AI hallucination.",
      },
      {
        q: "How do voice search and natural language queries impact clinic appointments?",
        a: "Over 60% of mobile and voice searches now use conversational questions such as 'Which clinic near me has WhatsApp booking?' or 'How do I book an appointment with Dr. Sharma?'. AEO formats your clinic pages to directly match and resolve these intent-driven queries.",
      },
    ],
  },
  {
    id: "geo",
    label: "GEO (Generative AI)",
    iconName: "Cpu",
    items: [
      {
        q: "What is Generative Engine Optimization (GEO)?",
        a: "Generative Engine Optimization (GEO) is the strategy of establishing brand authority, verifiable statistics, and machine-readable data across the web so large language models (LLMs like ChatGPT, Claude, Gemini, and DeepSeek) recommend your clinic or healthcare software in conversational recommendations.",
      },
      {
        q: "How does MyClinics optimize for LLMs like ChatGPT and Claude?",
        a: "MyClinics implements standardized machine-readable files such as llms.txt, verifiable clinic and doctor entities, open AI crawler permissions (GPTBot, ClaudeBot, PerplexityBot), and citation-ready metrics that LLMs easily digest during both real-time retrieval and model synthesis.",
      },
      {
        q: "What is llms.txt and why does MyClinics use it?",
        a: "llms.txt is an emerging web standard that provides AI crawlers with a curated, markdown-formatted summary of services, features, doctor workflows, and pricing. It ensures AI search models understand your capabilities accurately without scraping noisy scripts or markup.",
      },
      {
        q: "Why are concrete statistics vital for Generative Engine Optimization?",
        a: "Generative AI models prefer citing authoritative, data-backed claims. Documenting specific outcomes—such as 'cutting patient no-shows by 42%' or 'saving front-desk staff 15+ hours weekly'—makes MyClinics significantly more likely to be cited by AI models over generic software platforms.",
      },
    ],
  },
  {
    id: "local-geo",
    label: "Local Geo-Targeting",
    iconName: "MapPin",
    items: [
      {
        q: "How does programmatic geo-targeting work for clinics?",
        a: "Geo-targeting connects local patient demand with nearby clinics through dedicated pincode directories, municipal radius indexing, and localized Google Maps schema, ensuring your clinic appears when patients search for doctors in their specific pincode or neighborhood.",
      },
      {
        q: "Can multi-location practices manage their local presence in MyClinics?",
        a: "Yes. MyClinics is built as a multi-tenant platform where clinics and branch locations each maintain distinct geographical metadata (latitude, longitude, city, and pincode) while clinic admins retain unified dashboard management.",
      },
      {
        q: "How do AI engines resolve 'clinics near me' queries?",
        a: "AI search engines cross-reference the user's geolocation with localized schema entities and real-time operational details—such as whether the clinic offers live WhatsApp queue updates and instant digital token appointments.",
      },
    ],
  },
  {
    id: "automation",
    label: "WhatsApp & Operations",
    iconName: "MessageSquare",
    items: [
      {
        q: "How does WhatsApp AI booking connect to AEO and GEO marketing?",
        a: "WhatsApp AI acts as the ultimate conversion engine. When an AI search engine recommends your clinic, patients are directed to a zero-friction WhatsApp link where an AI assistant books, reschedules, and answers questions 24/7 without human delay.",
      },
      {
        q: "How do 30-minute turn alerts reduce waiting room overcrowding?",
        a: "MyClinics automatically notifies patients ~30 minutes prior to their consultation and sends a real-time turn alert when the previous patient is finished. This eliminates waiting room chaos and minimizes clinic no-shows.",
      },
      {
        q: "Can the WhatsApp assistant answer clinic-specific medical queries?",
        a: "The WhatsApp bot is strictly grounded in each clinic's custom knowledge base (soul.md and uploaded documents). It accurately answers timings, doctor schedules, consultation fees, and clinic policies while never fabricating medical advice.",
      },
    ],
  },
  {
    id: "security",
    label: "Security & Compliance",
    iconName: "ShieldCheck",
    items: [
      {
        q: "How is patient data isolated and secured in MyClinics?",
        a: "MyClinics enforces strict tenant isolation at the database level. Every clinic has an independent namespace, role-based access control (Admin, Doctor, Staff, Patient), encrypted document storage in Cloudflare R2, and TLS 1.3 encryption in transit.",
      },
      {
        q: "Does MyClinics support digital prescriptions and GST-compliant billing?",
        a: "Yes. Doctors can issue digital prescriptions linked directly to patient timelines, and clinics can generate GST-ready invoices with pending-payment tracking and real-time revenue analytics.",
      },
    ],
  },
];

/**
 * Builds standard Schema.org FAQPage JSON-LD object for Answer Engine Optimization.
 */
export function buildFaqPageSchema(categories = AEO_GEO_FAQ_CATEGORIES) {
  const mainEntity = categories.flatMap((category) =>
    category.items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    }))
  );

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity,
  };
}
