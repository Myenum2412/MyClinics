"use client";

import { useParams } from "next/navigation";

import ArticleBlock from "@/components/blocks/article-2";
import FooterBlock from "@/components/footer-block";
import SiteHeader from "@/components/site-header";

export default function BlogArticlePage() {
  const { slug } = useParams<{ slug: string }>();

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <ArticleBlock slug={slug} />
      </main>
      <FooterBlock />
    </div>
  );
}
