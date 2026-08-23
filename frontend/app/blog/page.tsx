import type { Metadata } from "next";

import BlogBlock from "@/components/blocks/blog-3";
import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Blog",
  description: "Stories, updates and articles from My Clinics.",
};

export default function BlogPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <Header />
      <main className="flex-1">
        <BlogBlock />
      </main>
      <SiteFooter />
    </div>
  );
}
