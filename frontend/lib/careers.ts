export type Job = {
  slug: string;
  title: string;
  department: string;
  location: string;
  type: string;
  summary: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  niceToHave?: string[];
};

export const RESUME_EMAIL = "developer@myenum.in";

export const JOBS: Job[] = [
  {
    slug: "senior-full-stack-engineer",
    title: "Senior Full Stack Engineer",
    department: "Engineering",
    location: "Remote • India",
    type: "Full-time",
    summary: "Own the clinic platform end-to-end — Next.js 16 frontend and Fastify API with multi-tenant isolation.",
    description:
      "My Clinics is a multi-tenant clinic management platform with WhatsApp AI. As Senior Full Stack, you will ship features across the patient portal, doctor dashboards, pharmacy, billing and the AI worker, keeping strict clinicId isolation and performance at scale.",
    responsibilities: [
      "Build features in Next.js 16 / React 19 and Fastify 5 with Zod DTOs",
      "Implement tenant-scoped repositories and role-aware APIs",
      "Optimize MongoDB queries, indexes and server-side pagination",
      "Collaborate with AI and WhatsApp teams on end-to-end flows",
    ],
    requirements: [
      "5+ years with React/Next.js and Node.js",
      "Strong TypeScript, Tailwind CSS, and MongoDB experience",
      "Understanding of multi-tenant SaaS and auth (JWT/JWE)",
      "Bias to ship, measure, and iterate",
    ],
    niceToHave: ["Fastify, jose, whatsapp-web.js, R2/S3"],
  },
  {
    slug: "backend-engineer-platform",
    title: "Backend Engineer, Platform",
    department: "Engineering",
    location: "Pune • Hybrid",
    type: "Full-time",
    summary: "Scale the Fastify API that powers appointments, records, billing and reminders for 500+ clinics.",
    description:
      "You will own backend domains under src/clinic — appointments, patients, billing, audit-logs — ensuring every query is clinicId-scoped and every route is Zod-validated.",
    responsibilities: [
      "Design clinic/core scoped services and repositories",
      "Add Zod-validated routes, controllers and services per domain",
      "Harden indexes, connection pooling and rate limiting",
      "Write vitest suites with in-memory Mongo fakes",
    ],
    requirements: [
      "3+ years Node.js / TypeScript backend",
      "MongoDB aggregation, indexing and transactions",
      "REST API design, error handling (AppError) and pagination",
      "Comfortable with Fastify or Express",
    ],
  },
  {
    slug: "ai-engineer-whatsapp-assistant",
    title: "AI Engineer — WhatsApp Assistant",
    department: "AI",
    location: "Remote",
    type: "Full-time",
    summary: "Build the grounded clinic assistant that books appointments and answers only from soul + KB.",
    description:
      "Work on nvidia.service, agent.service, grounding and memory. The bot must never invent prices or facts — every reply is grounded in soul.md and retrieved knowledge-base docs.",
    responsibilities: [
      "Improve intent detection, grounding and memory for long chats",
      "Integrate NVIDIA NIM with fallbacks and timeouts",
      "Build appointment-service that collects doctor → date → time",
      "Enforce knowledge boundary and price validation",
    ],
    requirements: [
      "Experience with LLM orchestration, RAG and embeddings",
      "TypeScript and vector search fundamentals",
      "Prompt engineering with safety and grounding",
      "WhatsApp or messaging platform exposure is a plus",
    ],
  },
  {
    slug: "product-designer-healthcare-ux",
    title: "Product Designer, Healthcare UX",
    department: "Design",
    location: "Remote • EU",
    type: "Full-time",
    summary: "Design calm, clinical UX for patients and doctors — from booking to prescriptions.",
    description:
      "Own UX for the patient portal, doctor dashboards and pharmacy flows. Make complex clinic workflows feel effortless, accessible and trustworthy.",
    responsibilities: [
      "Design flows for appointments, records, prescriptions and billing",
      "Create shadcn-style components with Motion polish",
      "Run usability tests with clinic staff and iterate",
      "Maintain design tokens and accessibility",
    ],
    requirements: [
      "Strong portfolio in SaaS or healthcare UX",
      "Figma, Tailwind CSS and Motion/React",
      "Accessibility (WCAG) and responsive design",
      "Ability to code prototypes in React",
    ],
  },
  {
    slug: "customer-success-manager",
    title: "Customer Success Manager",
    department: "Operations",
    location: "Mumbai • On-site",
    type: "Full-time",
    summary: "Onboard clinics, train staff and turn WhatsApp into their front desk.",
    description:
      "Be the first human after signup. You will onboard clinics, configure souls, import patients and ensure the AI books correctly — then keep clinics retained and referring.",
    responsibilities: [
      "Onboard clinics: Clinic ID, doctors, patients, WhatsApp QR",
      "Train staff on appointments, billing and reports",
      "Monitor reminders, queues and turn alerts",
      "Collect feedback and loop to product",
    ],
    requirements: [
      "2+ years in SaaS CS or clinic operations",
      "Excellent communication in English/Hindi",
      "Comfortable with WhatsApp Business and dashboards",
      "Empathy for doctors and front-desk staff",
    ],
  },
  {
    slug: "qa-engineer-healthcare-compliance",
    title: "QA Engineer, Healthcare Compliance",
    department: "Engineering",
    location: "Bengaluru • Hybrid",
    type: "Full-time",
    summary: "Guard patient data correctness, isolation and audit trails.",
    description:
      "Own QA for multi-tenant isolation, audit logs and prescription flows. Automate Playwright + vitest suites and ensure no cross-clinic leakage.",
    responsibilities: [
      "Test tenant isolation, RBAC and patient-own-data rules",
      "Automate API and UI tests (Playwright, vitest)",
      "Validate audit logs, R2 uploads and signed URLs",
      "Drive release checklists and compliance",
    ],
    requirements: [
      "3+ years QA / SDET with TypeScript",
      "API testing, MongoDB and auth flows",
      "Experience in healthcare or fintech compliance a plus",
      "Detail obsession and clear bug reports",
    ],
  },
];

export function getJobBySlug(slug: string) {
  return JOBS.find((j) => j.slug === slug);
}
