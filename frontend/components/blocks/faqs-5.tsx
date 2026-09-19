"use client";

import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Cpu,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Search,
  X,
  HelpCircle,
} from "lucide-react";
import {
  AEO_GEO_FAQ_CATEGORIES,
  FaqCategoryData,
  FaqItem,
} from "@/lib/aeo-geo-faqs";

const ICON_MAP = {
  Sparkles,
  Cpu,
  MapPin,
  MessageSquare,
  ShieldCheck,
};

interface FaqsBlockProps {
  categories?: FaqCategoryData[];
  title?: string;
  subtitle?: string;
  badge?: string;
  className?: string;
}

export default function FaqsBlock({
  categories = AEO_GEO_FAQ_CATEGORIES,
  title = "Frequently Asked Questions",
  subtitle = "Learn how AEO (Answer Engine Optimization) & GEO (Generative Engine Optimization) power modern clinic discovery and patient acquisition.",
  badge = "AEO & GEO Knowledge Base",
  className,
}: FaqsBlockProps) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();

  const filterItems = (items: FaqItem[]) =>
    normalized.length === 0
      ? items
      : items.filter(
          ({ q, a }) =>
            q.toLowerCase().includes(normalized) ||
            a.toLowerCase().includes(normalized)
        );

  const defaultCategory = categories[0]?.id ?? "aeo";

  return (
    <section
      className={cn(
        "flex w-full items-start justify-center bg-muted/20 px-4 py-16 text-foreground sm:px-6 lg:px-8",
        className
      )}
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wider text-primary uppercase">
            <Sparkles className="size-3.5" />
            {badge}
          </span>
          <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {title}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {subtitle}
          </p>
        </div>

        {/* Live Search Input */}
        <div className="relative w-full max-w-lg">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions about AEO, GEO, AI booking, schemas..."
            aria-label="Search frequently asked questions"
            className="h-11 rounded-xl bg-background pl-10 pr-10 text-sm shadow-xs transition-all focus-visible:ring-2 focus-visible:ring-primary/20 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-2.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <Tabs defaultValue={defaultCategory} className="w-full">
          <TabsList className="mx-auto flex h-auto w-full flex-wrap justify-center gap-1.5 rounded-2xl bg-muted/60 p-1.5">
            {categories.map(({ id, label, iconName, items }) => {
              const Icon = ICON_MAP[iconName] || HelpCircle;
              const count = filterItems(items).length;
              return (
                <TabsTrigger
                  key={id}
                  value={id}
                  className="gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all sm:text-sm"
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground group-data-[state=active]:text-primary" />
                  <span>{label}</span>
                  <span
                    className={cn(
                      "ml-1 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                      count === 0
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary/10 text-primary"
                    )}
                  >
                    {count}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Tab Panes */}
          {categories.map(({ id, items }) => {
            const filtered = filterItems(items);
            return (
              <TabsContent key={id} value={id} className="mt-6 focus-visible:outline-hidden">
                {filtered.length > 0 ? (
                  <Accordion
                    key={filtered[0].q}
                    defaultValue={[filtered[0].q]}
                    className="rounded-2xl border border-border/80 bg-card px-5 shadow-xs transition-shadow hover:shadow-md"
                  >
                    {filtered.map(({ q, a }) => (
                      <AccordionItem key={q} value={q} className="border-border/60 py-1">
                        <AccordionTrigger className="text-left text-sm font-semibold tracking-tight text-foreground transition-colors hover:text-primary sm:text-base">
                          {q}
                        </AccordionTrigger>
                        <AccordionContent className="pb-4 text-sm leading-relaxed text-muted-foreground sm:text-base/relaxed">
                          {a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <Empty className="rounded-2xl border border-dashed border-border bg-card/60 py-16">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Search className="size-5 text-muted-foreground" />
                      </EmptyMedia>
                      <EmptyTitle>No matching questions</EmptyTitle>
                      <EmptyDescription>
                        Nothing in this category matches &ldquo;{query}&rdquo;.
                        Try searching with another keyword like &ldquo;schema&rdquo;, &ldquo;llms.txt&rdquo;, or &ldquo;booking&rdquo;.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </section>
  );
}
export { FaqsBlock };
