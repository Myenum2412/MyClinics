import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { HeroHeader } from "@/components/hero-section-6-header";
import { FooterSection } from "@/components/footer-section";
import { Button } from "@/components/ui/button";

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
					className="flex w-full flex-col items-center justify-center text-center"
				>
					<Button
						nativeButton={false}
						className="h-14 rounded-full bg-blue-600 px-12 text-base font-semibold text-white shadow-[0_18px_60px_-12px_rgba(29,78,216,0.9)] ring-1 ring-white/30 transition-transform hover:scale-105 hover:bg-blue-500 focus-visible:border-blue-500 focus-visible:ring-blue-500/60"
						render={<Link href="/signup/clinic">Join Now</Link>}
					/>
				</section>
			</main>

			<div className="relative z-10">
				<FooterSection />
			</div>
		</div>
	);
}
