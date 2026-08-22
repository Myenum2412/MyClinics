import type { Metadata } from "next";

import BlogBlock from "@/components/blocks/blog-3";
import ArticleBlock from "@/components/blocks/article-2";

export const metadata: Metadata = {
  title: "Blog",
  description: "Stories, updates and articles from My Clinics.",
};

export default function BlogPage() {
  return (
    <main>
      <BlogBlock />
      <ArticleBlock />
    </main>
  );
}
