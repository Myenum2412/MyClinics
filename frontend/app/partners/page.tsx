import type { Metadata } from "next";
import Image from "next/image";
import { HeroHeader } from "@/components/hero-section-6-header";
import { FooterSection } from "@/components/footer-section";
import NewsletterBlock from "@/components/blocks/newsletter-2";
import PartnersJoinForm from "@/components/blocks/partners-join-form";

export const metadata: Metadata = {
	title: "Partners",
	description:
		"Partner with My Clinics — grow together and bring better clinic management to more practices.",
};

export default function PartnersPage() {
	return (
		<div className="relative isolate flex min-h-svh flex-col bg-black text-white">
			{/* Full-page partner backdrop. Fixed so it never stretches past the viewport. */}
			<div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
				<Image
					src="/partnersbg.png"
					alt=""
					fill
					priority
					sizes="100vw"
					className="object-cover object-[22%_center] lg:object-center"
				/>
				<div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.35),transparent_25%,transparent_75%,rgba(0,0,0,0.45))]" />
			</div>

			<HeroHeader />

			<main className="relative z-10 flex min-h-[60svh] flex-1 items-center justify-center px-6 pt-24 pb-16 sm:pt-28">
				<section
					id="become-a-partner"
					className="flex w-full max-w-2xl flex-col items-center justify-center text-center"
				>
					<h1 className="text-balance text-4xl font-semibold tracking-tight text-blue-950 sm:text-5xl md:text-6xl">
						Grow together with My Clinics
					</h1>
					<p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-slate-700 sm:text-lg">
						Join our partner network and bring smarter clinic management to more practices.
					</p>
					<PartnersJoinForm />
				</section>
			</main>

			<div className="relative z-10">
				<NewsletterBlock />
			</div>

			<div className="relative z-10">
				<FooterSection />
			</div>
		</div>
	);
}
