"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Search, HelpCircle, MessageSquare, Play, Sparkles } from "lucide-react";
import { FAQ_DATA, FAQ_CATEGORIES, FAQItem } from "@/lib/faq-data";

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
    <section className="relative w-full py-12 md:py-20 bg-background text-foreground overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center opacity-25">
        <div className="h-[450px] w-[650px] rounded-full bg-blue-600/20 blur-[130px]" />
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-950/40 px-3.5 py-1 text-xs font-medium text-blue-300 backdrop-blur-md">
            <Sparkles className="size-3.5 text-blue-400" />
            <span>Search & Knowledge Hub</span>
          </div>

          <h1 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            Frequently Asked Questions
          </h1>

          <p className="mx-auto max-w-2xl text-base text-white/70 sm:text-lg">
            Everything doctors, practice owners, and clinic administrators ask about live WhatsApp queues, 30-second digital prescriptions, ABDM compliance, and clinic automation.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mt-8 mx-auto max-w-2xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 20 questions (e.g. WhatsApp, prescription, ABDM, offline, pricing)..."
              className="w-full rounded-xl border border-blue-900/60 bg-blue-950/20 py-3.5 pl-12 pr-4 text-sm text-white placeholder-white/40 backdrop-blur-md transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400"
                    : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* FAQs Accordion */}
        <div className="mt-10 rounded-2xl border border-blue-900/50 bg-black/40 p-4 sm:p-6 backdrop-blur-md shadow-xl">
          {filteredFaqs.length === 0 ? (
            <div className="py-12 text-center">
              <HelpCircle className="mx-auto size-10 text-white/40" />
              <p className="mt-3 text-base text-white/70 font-medium">
                No matching questions found for &ldquo;{searchQuery}&rdquo;
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                }}
                className="mt-3 text-sm text-blue-400 hover:underline"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <Accordion
              defaultValue={[filteredFaqs[0]?.q]}
              className="w-full divide-y divide-blue-900/30"
            >
              {filteredFaqs.map((faq) => (
                <AccordionItem
                  key={faq.id}
                  value={faq.q}
                  className="border-none py-2"
                >
                  <AccordionTrigger className="flex w-full items-center justify-between text-left py-3.5 px-3 rounded-lg text-base font-medium text-white transition-colors hover:text-blue-300 hover:bg-white/5 hover:no-underline">
                    <span className="flex items-center gap-3 pr-4">
                      {faq.popular && (
                        <span className="inline-flex shrink-0 items-center rounded-md bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-blue-400 uppercase">
                          Popular
                        </span>
                      )}
                      <span>{faq.q}</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-4 pt-1 text-sm sm:text-base leading-relaxed text-white/70">
                    <p>{faq.a}</p>
                    {faq.id === "pricing-and-demo" && (
                      <div className="mt-3 flex items-center gap-3">
                        <Link
                          href="/rx-demo"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300"
                        >
                          <Play className="size-3.5 fill-blue-400" />
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

        {/* Bottom CTA Box */}
        <div className="mt-12 rounded-2xl border border-blue-900/50 bg-gradient-to-r from-blue-950/40 via-blue-900/20 to-blue-950/40 p-6 sm:p-8 text-center backdrop-blur-md">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">
            Have a question about your clinic workflow?
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm sm:text-base text-white/70">
            Our clinic specialists are available to answer queries, demonstrate live prescription writing, and assist with free data migration.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/#contact"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500"
            >
              <MessageSquare className="size-4" />
              <span>Contact Clinic Support</span>
            </Link>
            <Link
              href="/rx-demo"
              className="inline-flex items-center gap-2 rounded-lg border border-blue-800/80 bg-blue-950/50 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-900/60"
            >
              <Play className="size-4 fill-white" />
              <span>Test Live Demo</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}