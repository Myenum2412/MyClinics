import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import ArticleBlock from "@/components/blocks/article-1";
import { allArticles } from "../page";

// Reuse blog data but render via article-1 block with dynamic content
export function generateStaticParams() {
  return allArticles.map((a) => ({ slug: a.id }));
}

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = allArticles.find((a) => a.id === slug);
  if (!article) notFound();
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SiteHeader />
      <ArticleBlock />
      <SiteFooter />
    </div>
  );
}
