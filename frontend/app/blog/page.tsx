import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Clinic Management Insights & Healthcare Tips | My Clinics Blog",
  description: "Expert insights on clinic management, patient care, healthcare technology, WhatsApp automation, and running a successful modern clinic with My Clinics.",
};

type Article = {
  id: string;
  title: string;
  summary: string;
  href: string;
  category: string;
  thumbnailUrl: string;
  publishedAt: string;
  author: { name: string; avatarUrl: string };
  tags: string[];
};

export const allArticles: Article[] = [
  {
    id: "featured",
    title: "How WhatsApp Automation is Transforming Patient Appointments in 2025",
    summary: "Discover how clinics using WhatsApp AI assistants have reduced no-shows by 40% and cut front-desk workload in half — without adding staff.",
    href: "/blog/featured",
    category: "Technology",
    thumbnailUrl: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&q=80&auto=format&fit=crop",
    publishedAt: "28 Aug 2025",
    author: { name: "Dr. Priya Sharma", avatarUrl: "https://www.untitledui.com/images/avatars/amelie-laurent?fm=webp&q=80" },
    tags: ["WhatsApp AI", "Automation", "Patient Experience"],
  },
  { id: "1", title: "5 Ways to Reduce Patient No-Shows Without Extra Staff", summary: "Automated reminders, turn alerts, and smart scheduling can dramatically reduce missed appointments. Here's how top clinics do it.", href: "/blog/1", category: "Clinic Operations", thumbnailUrl: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80&auto=format&fit=crop", publishedAt: "22 Aug 2025", author: { name: "Olivia Rhye", avatarUrl: "https://www.untitledui.com/images/avatars/olivia-rhye?fm=webp&q=80" }, tags: ["Operations", "Patient Retention", "Scheduling"] },
  { id: "2", title: "EMR vs Paper Records: Why Clinics Are Going Digital", summary: "Learn how electronic medical records improve accuracy, save time, and keep patient data secure and instantly accessible.", href: "/blog/2", category: "Technology", thumbnailUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80&auto=format&fit=crop", publishedAt: "19 Aug 2025", author: { name: "Phoenix Baker", avatarUrl: "https://www.untitledui.com/images/avatars/phoenix-baker?fm=webp&q=80" }, tags: ["EMR", "Digital Health", "Clinic Software"] },
  { id: "3", title: "The Complete Guide to Clinic Billing & GST Compliance", summary: "Simplify invoicing, track payments, and stay GST-compliant with modern billing workflows built for Indian clinics.", href: "/blog/3", category: "Billing & Finance", thumbnailUrl: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80&auto=format&fit=crop", publishedAt: "15 Aug 2025", author: { name: "Lana Steiner", avatarUrl: "https://www.untitledui.com/images/avatars/lana-steiner?fm=webp&q=80" }, tags: ["Billing", "GST", "Finance"] },
  { id: "4", title: "Managing Your Clinic Queue: From Chaos to Real-Time Flow", summary: "Live queue counters and automatic turn alerts eliminate waiting-room confusion and keep patients informed on WhatsApp.", href: "/blog/4", category: "Clinic Operations", thumbnailUrl: "https://images.unsplash.com/photo-1516849841032-87cbac4d88f7?w=800&q=80&auto=format&fit=crop", publishedAt: "12 Aug 2025", author: { name: "Alec Whitten", avatarUrl: "https://www.untitledui.com/images/avatars/alec-whitten?fm=webp&q=80" }, tags: ["Queue Management", "Operations"] },
  { id: "5", title: "WhatsApp vs Phone Calls: What Patients Actually Prefer", summary: "Survey data from 500+ clinics shows why 78% of patients prefer WhatsApp booking over calling the front desk.", href: "/blog/5", category: "Patient Care", thumbnailUrl: "https://images.unsplash.com/photo-1584439375510-f1803a0d9ddb?w=800&q=80&auto=format&fit=crop", publishedAt: "08 Aug 2025", author: { name: "Demi Wilkinson", avatarUrl: "https://www.untitledui.com/images/avatars/demi-wilkinson?fm=webp&q=80" }, tags: ["WhatsApp", "Patient Experience", "Research"] },
  { id: "6", title: "How to Choose the Right Clinic Management Software", summary: "From appointment scheduling to pharmacy and reports — a checklist for selecting software that actually fits your clinic.", href: "/blog/6", category: "Technology", thumbnailUrl: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80&auto=format&fit=crop", publishedAt: "04 Aug 2025", author: { name: "Candice Wu", avatarUrl: "https://www.untitledui.com/images/avatars/candice-wu?fm=webp&q=80" }, tags: ["Software", "Buyer's Guide"] },
  { id: "7", title: "Prescription Management: Reduce Errors, Save Time", summary: "Digital prescriptions linked to your medicine database mean faster dispensing, fewer errors, and happier patients.", href: "/blog/7", category: "Patient Care", thumbnailUrl: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&q=80&auto=format&fit=crop", publishedAt: "01 Aug 2025", author: { name: "Natali Craig", avatarUrl: "https://www.untitledui.com/images/avatars/natali-craig?fm=webp&q=80" }, tags: ["Prescriptions", "Pharmacy", "Safety"] },
  { id: "8", title: "AI in Small Clinics: Practical Uses Beyond the Hype", summary: "You don't need an enterprise budget to use AI. See how small clinics use AI to answer patient queries 24/7 on WhatsApp.", href: "/blog/8", category: "Technology", thumbnailUrl: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80&auto=format&fit=crop", publishedAt: "28 Jul 2025", author: { name: "Drew Cano", avatarUrl: "https://www.untitledui.com/images/avatars/drew-cano?fm=webp&q=80" }, tags: ["AI", "Automation", "WhatsApp"] },
  { id: "9", title: "Building Patient Trust: Communication That Retains", summary: "From appointment confirmations to follow-up care — how consistent WhatsApp communication builds long-term patient loyalty.", href: "/blog/9", category: "Patient Care", thumbnailUrl: "https://images.unsplash.com/photo-1551601651-2a8555a104e2?w=800&q=80&auto=format&fit=crop", publishedAt: "24 Jul 2025", author: { name: "Orlando Diggs", avatarUrl: "https://www.untitledui.com/images/avatars/orlando-diggs?fm=webp&q=80" }, tags: ["Patient Retention", "Communication"] },
  { id: "10", title: "Dashboard Deep Dive: Real-Time Clinic Overview", summary: "Master your clinic dashboard — appointments, patients, doctors, and revenue at a glance. How to act on live insights.", href: "/blog/10", category: "Clinic Operations", thumbnailUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80&auto=format&fit=crop", publishedAt: "20 Jul 2025", author: { name: "Olivia Rhye", avatarUrl: "https://www.untitledui.com/images/avatars/olivia-rhye?fm=webp&q=80" }, tags: ["Dashboard", "Analytics"] },
  { id: "11", title: "Appointments Done Right: Scheduling, Rescheduling & No-Shows", summary: "From booking to queue — the complete appointment lifecycle and how clinics keep calendars full.", href: "/blog/11", category: "Clinic Operations", thumbnailUrl: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80&auto=format&fit=crop", publishedAt: "18 Jul 2025", author: { name: "Phoenix Baker", avatarUrl: "https://www.untitledui.com/images/avatars/phoenix-baker?fm=webp&q=80" }, tags: ["Appointments", "Scheduling"] },
  { id: "12", title: "Patient Records That Work: EMR, History & Privacy", summary: "Keep patient histories complete, searchable, and secure — from vitals to allergies to visit notes.", href: "/blog/12", category: "Patient Care", thumbnailUrl: "https://images.unsplash.com/photo-1516849841032-87cbac4d88f7?w=800&q=80&auto=format&fit=crop", publishedAt: "16 Jul 2025", author: { name: "Lana Steiner", avatarUrl: "https://www.untitledui.com/images/avatars/lana-steiner?fm=webp&q=80" }, tags: ["EMR", "Records"] },
  { id: "13", title: "Doctors & Staff: Manage Your Clinic Team Efficiently", summary: "Add doctors, assign staff, track performance — build a team that delivers consistent care.", href: "/blog/13", category: "Clinic Operations", thumbnailUrl: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80&auto=format&fit=crop", publishedAt: "14 Jul 2025", author: { name: "Alec Whitten", avatarUrl: "https://www.untitledui.com/images/avatars/alec-whitten?fm=webp&q=80" }, tags: ["Doctors", "Staff", "Team"] },
  { id: "14", title: "Pharmacy & Inventory: Never Run Out of Stock", summary: "Medicines, purchases, sales, and stock history — keep your pharmacy accurate and profitable.", href: "/blog/14", category: "Billing & Finance", thumbnailUrl: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&q=80&auto=format&fit=crop", publishedAt: "12 Jul 2025", author: { name: "Demi Wilkinson", avatarUrl: "https://www.untitledui.com/images/avatars/demi-wilkinson?fm=webp&q=80" }, tags: ["Pharmacy", "Inventory"] },
  { id: "15", title: "Queue & Tokens: The Smart Waiting Room", summary: "Token system, call-next, and WhatsApp turn alerts — eliminate waiting-room chaos.", href: "/blog/15", category: "Clinic Operations", thumbnailUrl: "https://images.unsplash.com/photo-1551601651-2a8555a104e2?w=800&q=80&auto=format&fit=crop", publishedAt: "10 Jul 2025", author: { name: "Candice Wu", avatarUrl: "https://www.untitledui.com/images/avatars/candice-wu?fm=webp&q=80" }, tags: ["Queue", "Tokens"] },
  { id: "16", title: "Reports That Drive Decisions: Clinic Analytics", summary: "Revenue, appointments, patients — turn clinic reports into growth actions.", href: "/blog/16", category: "Technology", thumbnailUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80&auto=format&fit=crop", publishedAt: "08 Jul 2025", author: { name: "Natali Craig", avatarUrl: "https://www.untitledui.com/images/avatars/natali-craig?fm=webp&q=80" }, tags: ["Reports", "Analytics"] },
  { id: "17", title: "Leads & Follow-ups: Never Lose a Patient Inquiry", summary: "Track leads, follow up via WhatsApp, and convert inquiries into appointments.", href: "/blog/17", category: "Patient Care", thumbnailUrl: "https://images.unsplash.com/photo-1499951360447-b19be2c0e1a8?w=800&q=80&auto=format&fit=crop", publishedAt: "06 Jul 2025", author: { name: "Drew Cano", avatarUrl: "https://www.untitledui.com/images/avatars/drew-cano?fm=webp&q=80" }, tags: ["Leads", "CRM"] },
  { id: "18", title: "Settings & Audit Logs: Control and Compliance", summary: "Clinic settings, WhatsApp, Meta integrations, and audit logs — stay in control and compliant.", href: "/blog/18", category: "Technology", thumbnailUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80&auto=format&fit=crop", publishedAt: "04 Jul 2025", author: { name: "Orlando Diggs", avatarUrl: "https://www.untitledui.com/images/avatars/orlando-diggs?fm=webp&q=80" }, tags: ["Settings", "Compliance"] },
  { id: "19", title: "Pricing Made Simple: Choose the Right Plan", summary: "Compare plans, know what's included, and pick the right fit for your clinic size.", href: "/blog/19", category: "Billing & Finance", thumbnailUrl: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80&auto=format&fit=crop", publishedAt: "02 Jul 2025", author: { name: "Dr. Priya Sharma", avatarUrl: "https://www.untitledui.com/images/avatars/amelie-laurent?fm=webp&q=80" }, tags: ["Pricing", "Plans"] },
  { id: "20", title: "Patient Portal: Book, Pay, and View Records", summary: "How patients use the portal to book appointments, see prescriptions, and track billing.", href: "/blog/20", category: "Patient Care", thumbnailUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80&auto=format&fit=crop", publishedAt: "30 Jun 2025", author: { name: "Olivia Rhye", avatarUrl: "https://www.untitledui.com/images/avatars/olivia-rhye?fm=webp&q=80" }, tags: ["Patient Portal", "Experience"] },
  { id: "21", title: "Doctors, Patients, Notifications: Stay Connected", summary: "Push notifications, audit logs, and doctor workflows that keep everyone aligned.", href: "/blog/21", category: "Technology", thumbnailUrl: "https://images.unsplash.com/photo-1516849841032-87cbac4d88f7?w=800&q=80&auto=format&fit=crop", publishedAt: "28 Jun 2025", author: { name: "Phoenix Baker", avatarUrl: "https://www.untitledui.com/images/avatars/phoenix-baker?fm=webp&q=80" }, tags: ["Notifications", "Workflow"] },
];

const featuredArticle = allArticles[0] as Article;

const articles = allArticles.slice(1);



const tabs = ["View all", "Clinic Operations", "Technology", "Patient Care", "Billing & Finance"];

function BlogCard({ article }: { article: Article }) {
  return (
    <a href={article.href} className="group flex flex-col gap-4">
      <div className="overflow-hidden rounded-xl aspect-[1.6/1]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={article.thumbnailUrl} alt={article.title} className="size-full object-cover transition duration-300 group-hover:scale-105" />
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-violet-600">{article.category} · {article.publishedAt}</p>
        <h3 className="text-lg font-semibold leading-7 text-foreground group-hover:text-violet-600 flex gap-2">{article.title}<span className="shrink-0">↗</span></h3>
        <p className="text-sm text-muted-foreground line-clamp-2">{article.summary}</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {article.tags.map(t => (
            <span key={t} className="rounded-full border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">{t}</span>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={article.author.avatarUrl} alt={article.author.name} className="size-8 rounded-full object-cover" />
          <span className="text-sm font-medium">{article.author.name}</span>
        </div>
      </div>
    </a>
  );
}

export default function BlogPage() {
  return (
    <div className="flex min-h-svh flex-col bg-white">
      <SiteHeader />
      {/* Hero */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="max-w-3xl">
            <span className="text-sm font-semibold text-violet-600 md:text-base">My Clinics Blog</span>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Insights for modern clinics</h1>
            <p className="mt-4 text-lg text-muted-foreground md:text-xl">Expert articles on clinic management, patient care, healthcare technology, and growing your practice.</p>
          </div>
        </div>
      </section>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-4 pb-16 md:gap-16 md:px-8 md:pb-24">
        {/* Featured */}
        <Link href={featuredArticle.href} className="relative hidden w-full overflow-hidden rounded-2xl md:block md:h-[580px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={featuredArticle.thumbnailUrl} alt={featuredArticle.title} className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent pt-24">
            <div className="flex flex-col gap-6 p-8">
              <div className="flex gap-4">
                <p className="flex-1 text-2xl font-semibold text-white">{featuredArticle.title}</p>
                <span className="text-white text-xl">↗</span>
              </div>
              <p className="text-white/90 line-clamp-2">{featuredArticle.summary}</p>
              <div className="flex gap-6 text-white">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold">Written by</p>
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={featuredArticle.author.avatarUrl} alt="" className="size-8 rounded-full" />
                    <p className="text-sm font-semibold">{featuredArticle.author.name}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold">Published on</p>
                  <p className="text-sm font-semibold h-8 flex items-center">{featuredArticle.publishedAt}</p>
                </div>
                <div className="ml-auto flex flex-col gap-1">
                  <p className="text-sm font-semibold">File under</p>
                  <div className="flex gap-2">
                    {featuredArticle.tags.map(t => (
                      <span key={t} className="rounded-full px-2 py-0.5 text-xs font-medium text-white ring-1 ring-white">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Link>
        <div className="md:hidden"><BlogCard article={featuredArticle} /></div>

        {/* Tabs + sort */}
        <div className="flex flex-col gap-4 border-b pb-0 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-6 overflow-auto scrollbar-none">
            {tabs.map((t, i) => (
              <button key={t} className={`whitespace-nowrap border-b-2 pb-3 text-sm font-medium ${i === 0 ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t}</button>
            ))}
          </div>
          <select aria-label="Sort by" defaultValue="recent" className="mb-3 rounded-lg border px-3 py-2 text-sm md:mb-0">
            <option value="recent">Most recent</option>
            <option value="popular">Most popular</option>
            <option value="viewed">Most viewed</option>
          </select>
        </div>

        <ul className="grid grid-cols-1 gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
          {articles.map(a => (
            <li key={a.id}><BlogCard article={a} /></li>
          ))}
        </ul>

        {/* Simple pagination */}
        <div className="flex items-center justify-center gap-2 border-t pt-8">
          <span className="text-sm text-muted-foreground">Page 1 of 1</span>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
