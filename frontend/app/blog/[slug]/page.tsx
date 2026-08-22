import type { Metadata } from "next";

import ArticleBlock from "@/components/blocks/article-2";
import FooterBlock from "@/components/footer-block";
import SiteHeader from "@/components/site-header";

export const metadata: Metadata = {
  title: "Article",
  description: "Articles and stories from My Clinics.",
};

export default function BlogArticlePage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <ArticleBlock />
      </main>
      <FooterBlock />
    </div>
  );
}
