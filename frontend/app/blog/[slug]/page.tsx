import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import ArticleBlock from "@/components/blocks/article-2";
import FooterBlock from "@/components/footer-block";
import SiteHeader from "@/components/site-header";
import { findCatalogEntry } from "@/lib/blog-catalog";
import {
  relatedCatalogArticles,
  resolveCatalogArticle,
  type ResolvedArticle,
} from "@/lib/blog-content";
import { readBlogFileArticle } from "@/lib/blog-fs";
import { ARTICLES } from "@/lib/blog-posts";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3456";

function resolveArticle(slug: string): ResolvedArticle | null {
  const curated = ARTICLES.find((a) => a.slug === slug);
  if (curated) {
    return {
      slug: curated.slug,
      title: curated.title,
      category: curated.category,
      excerpt: curated.excerpt,
      author: curated.author,
      date: curated.date,
      readTime: curated.readTime,
      sections: curated.sections,
      faqs: [],
    };
  }
  return readBlogFileArticle(slug) ?? (() => {
    const entry = findCatalogEntry(slug);
    return entry ? resolveCatalogArticle(entry) : null;
  })();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = resolveArticle(slug);
  if (!article) return { title: "Not found" };

  return {
    title: `${article.title} | My Clinics`,
    description: article.excerpt,
    alternates: { canonical: `/blog/${article.slug}` },
    keywords: [
      article.title,
      article.category,
      "clinic management software",
      "My Clinics",
    ],
    openGraph: {
      title: article.title,
      description: article.excerpt,
      url: `${SITE}/blog/${article.slug}`,
      siteName: "My Clinics",
      images: [{ url: `/blog/cover/${article.slug}` }],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt,
    },
  };
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = resolveArticle(slug);
  if (!article) notFound();

  const related =
    ARTICLES.find((a) => a.slug === slug) === undefined
      ? relatedCatalogArticles(slug)
      : [];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: article.title,
      description: article.excerpt,
      datePublished: article.date,
      author: { "@type": "Person", name: article.author.name },
      publisher: {
        "@type": "Organization",
        name: "My Clinics",
        logo: { "@type": "ImageObject", url: `${SITE}/logobg.png` },
      },
      mainEntityOfPage: `${SITE}/blog/${article.slug}`,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE}/blog` },
        {
          "@type": "ListItem",
          position: 3,
          name: article.title,
          item: `${SITE}/blog/${article.slug}`,
        },
      ],
    },
    ...(article.faqs.length
      ? [
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: article.faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          },
        ]
      : []),
  ];

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <ArticleBlock article={article} />

        {related.length ? (
          <section className="border-t border-border bg-muted/30 px-6 py-12">
            <div className="mx-auto w-full max-w-4xl">
              <h2 className="font-heading text-lg font-semibold tracking-tight">
                Related reading
              </h2>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link
                      href={`/blog/${r.slug}`}
                      className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                    >
                      {r.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </main>
      <FooterBlock />
    </div>
  );
}
