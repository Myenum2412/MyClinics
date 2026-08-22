import type { Metadata } from "next";

import ArticleBlock from "@/components/blocks/article-2";
import BlogBlock from "@/components/blocks/blog-3";
import FooterBlock from "@/components/footer-block";
import SiteHeader from "@/components/site-header";

export const metadata: Metadata = {
  title: "Blog",
  description: "Stories, updates and articles from My Clinics.",
};

export default function BlogPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <BlogBlock />
        <ArticleBlock />
      </main>
      <FooterBlock />
    </div>
  );
}
