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

const featuredArticle: Article = {
  id: "featured",
  title: "How WhatsApp Automation is Transforming Patient Appointments in 2025",
  summary: "Discover how clinics using WhatsApp AI assistants have reduced no-shows by 40% and cut front-desk workload in half — without adding staff.",
  href: "#",
  category: "Technology",
  thumbnailUrl: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&q=80&auto=format&fit=crop",
  publishedAt: "28 Aug 2025",
  author: { name: "Dr. Priya Sharma", avatarUrl: "https://www.untitledui.com/images/avatars/amelie-laurent?fm=webp&q=80" },
  tags: ["WhatsApp AI", "Automation", "Patient Experience"],
};

const articles: Article[] = [
  { id: "1", title: "5 Ways to Reduce Patient No-Shows Without Extra Staff", summary: "Automated reminders, turn alerts, and smart scheduling can dramatically reduce missed appointments. Here's how top clinics do it.", href: "#", category: "Clinic Operations", thumbnailUrl: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80&auto=format&fit=crop", publishedAt: "22 Aug 2025", author: { name: "Olivia Rhye", avatarUrl: "https://www.untitledui.com/images/avatars/olivia-rhye?fm=webp&q=80" }, tags: ["Operations", "Patient Retention", "Scheduling"] },
  { id: "2", title: "EMR vs Paper Records: Why Clinics Are Going Digital", summary: "Learn how electronic medical records improve accuracy, save time, and keep patient data secure and instantly accessible.", href: "#", category: "Technology", thumbnailUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80&auto=format&fit=crop", publishedAt: "19 Aug 2025", author: { name: "Phoenix Baker", avatarUrl: "https://www.untitledui.com/images/avatars/phoenix-baker?fm=webp&q=80" }, tags: ["EMR", "Digital Health", "Clinic Software"] },
  { id: "3", title: "The Complete Guide to Clinic Billing & GST Compliance", summary: "Simplify invoicing, track payments, and stay GST-compliant with modern billing workflows built for Indian clinics.", href: "#", category: "Billing & Finance", thumbnailUrl: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80&auto=format&fit=crop", publishedAt: "15 Aug 2025", author: { name: "Lana Steiner", avatarUrl: "https://www.untitledui.com/images/avatars/lana-steiner?fm=webp&q=80" }, tags: ["Billing", "GST", "Finance"] },
  { id: "4", title: "Managing Your Clinic Queue: From Chaos to Real-Time Flow", summary: "Live queue counters and automatic turn alerts eliminate waiting-room confusion and keep patients informed on WhatsApp.", href: "#", category: "Clinic Operations", thumbnailUrl: "https://images.unsplash.com/photo-1516849841032-87cbac4d88f7?w=800&q=80&auto=format&fit=crop", publishedAt: "12 Aug 2025", author: { name: "Alec Whitten", avatarUrl: "https://www.untitledui.com/images/avatars/alec-whitten?fm=webp&q=80" }, tags: ["Queue Management", "Operations"] },
  { id: "5", title: "WhatsApp vs Phone Calls: What Patients Actually Prefer", summary: "Survey data from 500+ clinics shows why 78% of patients prefer WhatsApp booking over calling the front desk.", href: "#", category: "Patient Care", thumbnailUrl: "https://images.unsplash.com/photo-1584439375510-f1803a0d9ddb?w=800&q=80&auto=format&fit=crop", publishedAt: "08 Aug 2025", author: { name: "Demi Wilkinson", avatarUrl: "https://www.untitledui.com/images/avatars/demi-wilkinson?fm=webp&q=80" }, tags: ["WhatsApp", "Patient Experience", "Research"] },
  { id: "6", title: "How to Choose the Right Clinic Management Software", summary: "From appointment scheduling to pharmacy and reports — a checklist for selecting software that actually fits your clinic.", href: "#", category: "Technology", thumbnailUrl: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80&auto=format&fit=crop", publishedAt: "04 Aug 2025", author: { name: "Candice Wu", avatarUrl: "https://www.untitledui.com/images/avatars/candice-wu?fm=webp&q=80" }, tags: ["Software", "Buyer's Guide"] },
  { id: "7", title: "Prescription Management: Reduce Errors, Save Time", summary: "Digital prescriptions linked to your medicine database mean faster dispensing, fewer errors, and happier patients.", href: "#", category: "Patient Care", thumbnailUrl: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&q=80&auto=format&fit=crop", publishedAt: "01 Aug 2025", author: { name: "Natali Craig", avatarUrl: "https://www.untitledui.com/images/avatars/natali-craig?fm=webp&q=80" }, tags: ["Prescriptions", "Pharmacy", "Safety"] },
  { id: "8", title: "AI in Small Clinics: Practical Uses Beyond the Hype", summary: "You don't need an enterprise budget to use AI. See how small clinics use AI to answer patient queries 24/7 on WhatsApp.", href: "#", category: "Technology", thumbnailUrl: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80&auto=format&fit=crop", publishedAt: "28 Jul 2025", author: { name: "Drew Cano", avatarUrl: "https://www.untitledui.com/images/avatars/drew-cano?fm=webp&q=80" }, tags: ["AI", "Automation", "WhatsApp"] },
  { id: "9", title: "Building Patient Trust: Communication That Retains", summary: "From appointment confirmations to follow-up care — how consistent WhatsApp communication builds long-term patient loyalty.", href: "#", category: "Patient Care", thumbnailUrl: "https://images.unsplash.com/photo-1551601651-2a8555a104e2?w=800&q=80&auto=format&fit=crop", publishedAt: "24 Jul 2025", author: { name: "Orlando Diggs", avatarUrl: "https://www.untitledui.com/images/avatars/orlando-diggs?fm=webp&q=80" }, tags: ["Patient Retention", "Communication"] },
];

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

        {/* Newsletter CTA */}
        <div className="rounded-2xl bg-violet-600 px-8 py-12 text-center md:py-16">
          <h2 className="text-2xl font-semibold text-white md:text-3xl">Get clinic growth tips in your inbox</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">Join 2,000+ clinic owners receiving weekly insights on operations, patient care, and healthcare technology.</p>
          <div className="mx-auto mt-6 flex max-w-md gap-2">
            <input type="email" placeholder="Enter your email" className="flex-1 rounded-lg bg-white px-4 py-2.5 text-sm outline-none" />
            <button type="button" className="rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800">Subscribe</button>
          </div>
        </div>

        {/* Simple pagination */}
        <div className="flex items-center justify-center gap-2 border-t pt-8">
          <span className="text-sm text-muted-foreground">Page 1 of 1</span>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
