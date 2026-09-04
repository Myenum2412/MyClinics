export type Cluster =
  | "Clinic Software"
  | "Appointments"
  | "Records"
  | "Prescriptions"
  | "Billing"
  | "WhatsApp"
  | "AI"
  | "Organic Social"
  | "Specialties"
  | "Buying Guide";

export type CatalogEntry = {
  slug: string;
  title: string;
  cluster: Cluster;
  excerpt: string;
};

export function slugifyTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const TITLES: Record<Cluster, string[]> = {
  "Clinic Software": [
    "Clinic Management Software: The Complete Guide for Doctors in 2026",
    "How to Choose the Best Clinic Management Software for Your Practice",
    "15 Features Every Modern Clinic Management Software Should Have",
    "How Digital Clinic Management Can Save Doctors Hours Every Week",
    "How to Run a Clinic Without Paper Records",
    "Clinic Management Software vs Manual Record Keeping: Which Is Better?",
    "How to Digitize Your Clinic From Appointments to Billing",
    "The Complete Guide to Managing a Small Clinic Digitally",
    "How Multi-Doctor Clinics Can Manage Everything From One Platform",
    "How Cloud-Based Clinic Software Is Changing Medical Practices",
  ],
  Appointments: [
    "How to Manage Doctor Appointments Without Confusion",
    "The Best Way to Organize Daily Clinic Appointments",
    "How Online Appointment Booking Can Increase Clinic Efficiency",
    "How to Reduce Patient Waiting Time With Better Appointment Scheduling",
    "How Automated Appointment Reminders Reduce Missed Appointments",
    "Walk-In vs Online Appointments: How Should Clinics Manage Both?",
    "How to Manage Multiple Doctors' Schedules in One Clinic",
    "How Patients Can Book Doctor Appointments Online",
    "How to Create a Simple Online Appointment System for Your Clinic",
    "The Complete Guide to Digital Appointment Management for Clinics",
  ],
  Records: [
    "How to Manage Patient Records Digitally",
    "Paper Patient Records vs Digital Patient Records: Which Is Better?",
    "How to Organize Thousands of Patient Records Without Paper Files",
    "How Digital Patient History Helps Doctors Make Better Decisions",
    "How to Find Any Patient Record in Seconds",
    "How Clinics Can Prevent Duplicate Patient Records",
    "How to Keep Patient Information Organized and Secure",
    "How to Create a Paperless Patient Record System",
    "How Digital Records Improve the Patient Experience",
    "The Complete Guide to Digital Patient Management for Clinics",
  ],
  Prescriptions: [
    "What Is Digital Prescription Software and How Does It Work?",
    "How Doctors Can Create and Manage Digital Prescriptions",
    "Digital Prescription vs Handwritten Prescription: What Changes?",
    "How to Store Patient Prescriptions Safely in the Cloud",
    "How Digital Medical Records Make Patient Follow-Ups Easier",
    "How Doctors Can Access Previous Patient Reports Instantly",
    "How to Organize Medical Reports in a Digital Clinic",
    "How to Manage Prescriptions, Reports and Patient History Together",
    "How Clinics Can Create a Complete Digital Medical Record",
    "The Complete Guide to Digital Prescriptions and Medical Records",
  ],
  Billing: [
    "How to Manage Clinic Billing Without Manual Work",
    "Best Clinic Billing Software Features Doctors Should Look For",
    "Manual Clinic Billing vs Digital Billing: Which Is Better?",
    "How to Track Every Clinic Payment Automatically",
    "How to Create Professional Digital Bills for Patients",
    "How to Track Pending Payments in Your Clinic",
    "How Digital Billing Helps Clinics Reduce Errors",
    "How to Track Daily Clinic Revenue and Expenses",
    "How to Generate Clinic Billing and Revenue Reports Easily",
    "The Complete Guide to Digital Billing for Medical Clinics",
  ],
  WhatsApp: [
    "How Clinics Can Use WhatsApp for Patient Appointments",
    "How to Automate Appointment Reminders on WhatsApp",
    "How WhatsApp Can Reduce Missed Clinic Appointments",
    "How to Send Patient Follow-Up Messages Automatically",
    "How Clinics Can Manage Patient Communication Through WhatsApp",
    "WhatsApp vs SMS Appointment Reminders: Which Works Better?",
    "How to Send Appointment Confirmations Through WhatsApp",
    "How to Automate Routine Patient Messages",
    "How WhatsApp Follow-Ups Can Improve Patient Retention",
    "The Complete Guide to WhatsApp Automation for Clinics",
  ],
  AI: [
    "How AI Can Help Doctors Manage Their Clinics",
    "How AI Appointment Assistants Can Work 24/7",
    "How AI Can Automate Patient Appointment Booking",
    "How AI Can Answer Common Patient Questions Automatically",
    "AI Receptionist vs Human Receptionist: What Should Clinics Choose?",
    "How AI Can Reduce Administrative Work in Clinics",
    "How AI Can Improve Patient Follow-Up and Communication",
    "How AI Can Help Clinics Handle More Patients Efficiently",
    "10 Practical Ways AI Can Improve Clinic Operations",
    "The Future of AI-Powered Clinic Management",
  ],
  "Organic Social": [
    "How Clinics Can Grow With Organic Social Media",
    "How to Plan a Month of Clinic Social Posts Without Paid Ads",
    "How Doctors Can Build Trust on Instagram Organically",
    "Organic Social vs Paid Ads for Clinics: Which Should You Choose?",
    "How to Turn Patient Questions Into Endless Social Content",
    "How Often Should Your Clinic Post on Social Media?",
    "Best Reel Ideas for Clinics That Need No Budget",
    "How to Handle Patient Comments on Social Media the Right Way",
    "How to Build a Content Calendar for Your Clinic's Social Media",
    "The Complete Guide to Organic Social Media for Clinics",
  ],
  Specialties: [
    "Best Clinic Management Software for Dental Clinics",
    "Best Clinic Management Software for Dermatology Clinics",
    "Best Clinic Management Software for Eye Clinics",
    "Best Clinic Management Software for Physiotherapy Clinics",
    "Best Clinic Management Software for Pediatric Clinics",
    "Best Clinic Management Software for Gynecology Clinics",
    "Best Clinic Management Software for Orthopedic Clinics",
    "Best Clinic Management Software for ENT Clinics",
    "Best Clinic Management Software for Multi-Specialty Clinics",
    "Best Clinic Management Software for Diagnostic Clinics",
  ],
  "Buying Guide": [
    "How Much Does Clinic Management Software Cost in India?",
    "Best Affordable Clinic Management Software for Small Clinics",
    "Free vs Paid Clinic Management Software: Which Should You Choose?",
    "What Is the Best Clinic Management Software for a New Doctor?",
    "Top Clinic Management Software Features to Compare Before Buying",
    "How to Compare Clinic Management Software Before You Buy",
    "Clinic Management Software Buying Guide for Doctors",
    "How to Digitize Your Clinic on a Small Budget",
    "The Complete Checklist for Setting Up a Digital Clinic",
    "The Complete Guide to Running a Modern Digital Clinic",
  ],
}

function excerptFor(cluster: Cluster, title: string) {
  const short = title.replace(/^(How to|How|The Complete Guide to|What Is|Best)\s+/i, "").replace(/\?$/, "")
  const frames: Record<Cluster, string[]> = {
    "Clinic Software": [
      `A practical, doctor-friendly walkthrough of ${short}  what it involves, what it costs you in time today, and how a platform like My Clinics makes it effortless.`,
      `Everything doctors should know about ${short}: benefits, common pitfalls, and the exact workflow clinics follow with My Clinics.`,
    ],
    Appointments: [
      `Cut confusion at the front desk. Learn how ${short} works day to day, and how My Clinics keeps every slot, doctor and patient in sync.`,
      `A step-by-step look at ${short}  plus scheduling habits and My Clinics features that keep waiting rooms calm.`,
    ],
    Records: [
      `Patient files without paper chases. This guide breaks down ${short} and shows how My Clinics organises records so nothing gets lost.`,
      `From folders to instant search: understand ${short} and the record-keeping structure successful clinics run on My Clinics.`,
    ],
    Prescriptions: [
      `Cleaner prescriptions, faster follow-ups. Explore ${short} with practical examples and the digital workflow My Clinics provides out of the box.`,
      `What changes when prescribing goes digital? A close look at ${short} using My Clinics' prescription and records tools.`,
    ],
    Billing: [
      `Fewer errors, faster payments. Understand ${short} and how clinics automate it end to end with My Clinics billing.`,
      `A clear explanation of ${short}  with the billing reports, invoices and payment tracking My Clinics generates automatically.`,
    ],
    WhatsApp: [
      `Meet patients where they already are. Learn ${short} and how the My Clinics WhatsApp assistant does the heavy lifting.`,
      `Reminders, confirmations, follow-ups: see exactly how ${short} works when your clinic runs on My Clinics.`,
    ],
    AI: [
      `Your front desk, always on. This guide explains ${short} and where an AI assistant like the one built into My Clinics fits best.`,
      `Practical, non-hyped answers on ${short}  with concrete ways My Clinics puts AI to work on bookings and patient queries.`,
    ],
    "Organic Social": [
      `Grow without an ad budget. A doctor-focused playbook covering ${short}  organic social only, on foundations My Clinics already gives you.`,
      `Simple, repeatable organic-social tactics for ${short}, powered by the booking and follow-up systems inside My Clinics.`,
    ],
    Specialties: [
      `Not all clinics work the same way. See what matters most in ${short.toLowerCase()}, and how My Clinics adapts to the specialty.`,
      `Feature checklists and real workflows for ${short.toLowerCase()}  evaluated through the lens of running your practice on My Clinics.`,
    ],
    "Buying Guide": [
      `Budgets, features, contracts: make a confident decision about ${short.toLowerCase()}. Includes a comparison framework and where My Clinics stands.`,
      `Before you sign anything, read this breakdown of ${short.toLowerCase()}  pricing models, must-have features, and how My Clinics compares.`,
    ],
  }
  const options = frames[cluster]
  const hash = [...title].reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0)
  return options[Math.abs(hash) % options.length]
}

export const CATALOG: CatalogEntry[] = (
  Object.entries(TITLES) as [Cluster, string[]][]
).flatMap(([cluster, titles]) =>
  titles.map((title) => ({
    title,
    cluster,
    slug: slugifyTitle(title),
    excerpt: excerptFor(cluster, title),
  }))
)

export const CLUSTERS: Cluster[] = Object.keys(TITLES) as Cluster[]

export function findCatalogEntry(slug: string) {
  return (
    CATALOG.find((c) => c.slug === slug) ??
    CATALOG.find((c) => slug.endsWith(`/${c.slug}`))
  )
}
