import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Blog — Resources and Insights | My Clinics",
  description: "The latest industry news, interviews, technologies, and resources from My Clinics.",
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
  title: 'Improve your design skills: Develop an "eye" for design',
  summary: 'Tools and trends change, but good design is timeless. Learn how to quickly develop an "eye" for design.',
  href: "#",
  category: "Design",
  thumbnailUrl: "https://www.untitledui.com/marketing/blog-featured-post-01.webp",
  publishedAt: "10 April 2025",
  author: { name: "Amélie Laurent", avatarUrl: "https://www.untitledui.com/images/avatars/amelie-laurent?fm=webp&q=80" },
  tags: ["Design", "Research", "Presentation"],
};

const articles: Article[] = [
  { id: "1", title: "UX review presentations", summary: "How do you create compelling presentations that wow your colleagues and impress your managers?", href: "#", category: "Design", thumbnailUrl: "https://www.untitledui.com/marketing/spirals.webp", publishedAt: "20 Jan 2025", author: { name: "Olivia Rhye", avatarUrl: "https://www.untitledui.com/images/avatars/olivia-rhye?fm=webp&q=80" }, tags: ["Design","Research","Presentation"] },
  { id: "2", title: "Migrating to Linear 101", summary: "Linear helps streamline software projects, sprints, tasks, and bug tracking. Here's how to get started.", href: "#", category: "Product", thumbnailUrl: "https://www.untitledui.com/marketing/conversation.webp", publishedAt: "19 Jan 2025", author: { name: "Phoenix Baker", avatarUrl: "https://www.untitledui.com/images/avatars/phoenix-baker?fm=webp&q=80" }, tags: ["Product","Tools","SaaS"] },
  { id: "3", title: "Building your API stack", summary: "The rise of RESTful APIs has been met by a rise in tools for creating, testing, and managing them.", href: "#", category: "Software Engineering", thumbnailUrl: "https://www.untitledui.com/blog/two-mobile-shapes-pattern.webp", publishedAt: "18 Jan 2025", author: { name: "Lana Steiner", avatarUrl: "https://www.untitledui.com/images/avatars/lana-steiner?fm=webp&q=80" }, tags: ["Software Development","Tools"] },
  { id: "3.5", title: "Bill Walsh leadership lessons", summary: "Like to know the secrets of transforming a 2-14 team into a 3x Super Bowl winning Dynasty?", href: "#", category: "Product", thumbnailUrl: "https://www.untitledui.com/blog/two-people.webp", publishedAt: "17 Jan 2025", author: { name: "Alec Whitten", avatarUrl: "https://www.untitledui.com/images/avatars/alec-whitten?fm=webp&q=80" }, tags: ["Leadership","Management"] },
  { id: "4", title: "PM mental models", summary: "Mental models are simple expressions of complex processes or relationships.", href: "#", category: "Product", thumbnailUrl: "https://www.untitledui.com/marketing/smiling-girl-6.webp", publishedAt: "16 Jan 2025", author: { name: "Demi Wilkinson", avatarUrl: "https://www.untitledui.com/images/avatars/demi-wilkinson?fm=webp&q=80" }, tags: ["Product","Research","Frameworks"] },
  { id: "5", title: "What is wireframing?", summary: "Introduction to Wireframing and its Principles. Learn from the best in the industry.", href: "#", category: "Design", thumbnailUrl: "https://www.untitledui.com/marketing/wireframing-layout.webp", publishedAt: "15 Jan 2025", author: { name: "Candice Wu", avatarUrl: "https://www.untitledui.com/images/avatars/candice-wu?fm=webp&q=80" }, tags: ["Design","Research"] },
  { id: "6", title: "How collaboration makes us better designers", summary: "Collaboration can make our teams stronger, and our individual designs better.", href: "#", category: "Design", thumbnailUrl: "https://www.untitledui.com/marketing/two-people.webp", publishedAt: "14 Jan 2025", author: { name: "Natali Craig", avatarUrl: "https://www.untitledui.com/images/avatars/natali-craig?fm=webp&q=80" }, tags: ["Design","Research"] },
  { id: "7", title: "Our top 10 Javascript frameworks to use", summary: "JavaScript frameworks make development easy with extensive features and functionalities.", href: "#", category: "Product", thumbnailUrl: "https://www.untitledui.com/marketing/workspace-5.webp", publishedAt: "13 Jan 2025", author: { name: "Drew Cano", avatarUrl: "https://www.untitledui.com/images/avatars/drew-cano?fm=webp&q=80" }, tags: ["Software Development","Tools","SaaS"] },
  { id: "8", title: "Podcast: Creating a better CX Community", summary: "Starting a community doesn't need to be complicated, but how do you get started?", href: "#", category: "Customer Success", thumbnailUrl: "https://www.untitledui.com/marketing/sythesize.webp", publishedAt: "12 Jan 2025", author: { name: "Orlando Diggs", avatarUrl: "https://www.untitledui.com/images/avatars/orlando-diggs?fm=webp&q=80" }, tags: ["Podcasts","Customer Success"] },
];

const tabs = ["View all", "Design", "Product", "Software Engineering", "Customer Success"];

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
            <span className="text-sm font-semibold text-violet-600 md:text-base">Our blog</span>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Resources and insights</h1>
            <p className="mt-4 text-lg text-muted-foreground md:text-xl">The latest industry news, interviews, technologies, and resources.</p>
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
