"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Search, HelpCircle, Play } from "lucide-react";
import { FAQ_DATA, FAQ_CATEGORIES } from "@/lib/faq-data";
import NewsletterBlock from "@/components/blocks/newsletter-2";

export default function FaqsBlock() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const filteredFaqs = useMemo(() => {
    return FAQ_DATA.filter((item) => {
      const matchesCategory =
        selectedCategory === "All" || item.category === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === "" ||
        item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.a.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <section className="relative w-full py-12 md:py-20 bg-background text-zinc-950 overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center opacity-30">
        <div className="h-[400px] w-[600px] rounded-full bg-blue-400/20 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-4xl md:text-5xl">
            Frequently Asked Questions
          </h1>

          <p className="mx-auto max-w-xl text-base text-zinc-600 sm:text-lg leading-relaxed">
            Common questions about My Clinics, WhatsApp queues, and prescriptions.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mt-8 mx-auto max-w-2xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 26+ questions (e.g. WhatsApp, prescription, ABHA, offline, pricing)..."
              className="w-full rounded-xl border border-zinc-200 bg-white py-3.5 pl-12 pr-4 text-sm text-zinc-950 placeholder-zinc-400 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {FAQ_CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm ring-1 ring-blue-600 font-semibold"
                    : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 shadow-xs"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* FAQs Accordion Container */}
        <div className="mt-10 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-8 shadow-sm">
          {filteredFaqs.length === 0 ? (
            <div className="py-12 text-center">
              <HelpCircle className="mx-auto size-10 text-zinc-400" />
              <p className="mt-3 text-base text-zinc-800 font-semibold">
                No matching questions found for &ldquo;{searchQuery}&rdquo;
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                }}
                className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <Accordion
              defaultValue={[filteredFaqs[0]?.q]}
              className="w-full divide-y divide-zinc-100"
            >
              {filteredFaqs.map((faq) => (
                <AccordionItem
                  key={faq.id}
                  value={faq.q}
                  className="border-none py-2"
                >
                  <AccordionTrigger className="flex w-full items-center justify-between text-left py-3.5 px-3 rounded-lg text-base sm:text-lg font-semibold text-zinc-900 transition-colors hover:text-blue-600 hover:bg-zinc-50 hover:no-underline">
                    <span className="flex items-center gap-3 pr-4">
                      {faq.popular && (
                        <span className="inline-flex shrink-0 items-center rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-bold tracking-wide text-blue-700 uppercase">
                          Popular
                        </span>
                      )}
                      <span className="text-zinc-950 font-semibold">{faq.q}</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-4 pt-1 text-sm sm:text-base leading-relaxed text-zinc-700">
                    <p className="text-zinc-700">{faq.a}</p>
                    {faq.id === "pricing-and-demo" && (
                      <div className="mt-3 flex items-center gap-3">
                        <Link
                          href="/rx-demo"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          <Play className="size-3.5 fill-blue-600" />
                          <span>Open Interactive Demo</span>
                        </Link>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>

        {/* Newsletter Section (@7ovr/newsletter-2) */}
        <div className="mt-14">
          <NewsletterBlock
            badge="Clinic Newsletter"
            title="Clinic growth & workflow insights, delivered monthly"
            description="Product updates, live queue best practices, and digital prescription playbooks from the My Clinics team, landing in your inbox every month."
            source="FAQ Page"
            className="flex w-full items-center justify-center p-0"
            cardClassName="w-full rounded-2xl border border-zinc-200 bg-white px-6 py-8 sm:px-10 sm:py-10 shadow-sm text-zinc-950"
          />
        </div>
      </div>
    </section>
  );
}