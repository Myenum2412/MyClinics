import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://myclinic.myenum.in";

// All major AI / LLM / search crawlers — explicitly Allow so ChatGPT, Gemini, Claude, Perplexity etc. can surface MyClinics for doctor/clinic suggestions
const AI_CRAWLERS = [
  // OpenAI
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ChatGPT-User-v2",
  // Anthropic
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  // Google / Gemini
  "Googlebot",
  "Google-Extended",
  "GoogleOther",
  "Gemini",
  // Perplexity
  "PerplexityBot",
  "Perplexity-User",
  // Meta
  "Meta-ExternalAgent",
  "Meta-ExternalFetcher",
  "FacebookBot",
  // Apple
  "Applebot",
  "Applebot-Extended",
  // Microsoft / Bing
  "Bingbot",
  "BingPreview",
  // Common Crawl / Cohere / Others used by LLMs
  "CCBot",
  "cohere-ai",
  "Cohere-ai",
  "YouBot",
  "Bytespider",
  "Diffbot",
  "ImagesiftBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/clinic/", "/orgmenu/", "/_next/"],
      },
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: "/",
      })),
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
