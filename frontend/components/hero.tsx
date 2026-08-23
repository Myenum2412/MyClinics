import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function HeroSection() {
	return (
		<section className="relative mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-6xl flex-col justify-center overflow-hidden">
			{/* Blueprint vertical rules */}
			<div
				aria-hidden="true"
				className="absolute inset-y-0 left-8 hidden w-px bg-linear-to-b from-transparent via-border to-transparent md:block"
			/>
			<div
				aria-hidden="true"
				className="absolute inset-y-0 right-8 hidden w-px bg-linear-to-b from-transparent via-border to-transparent md:block"
			/>

			{/* Radial glow */}
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-x-0 top-1/4 rounded-full bg-[radial-gradient(ellipse_at_center,--theme(--color-foreground/.08),transparent)] blur-[25px]"
			/>

			<div className="relative z-10 mx-auto flex w-full max-w-xl flex-col items-center gap-5 px-4 py-20 md:py-28">
				<a
					className="group flex h-7 shrink-0 items-center gap-2 rounded-full border bg-card px-2.5 text-xs shadow-xs dark:bg-card/50"
					href="#features"
				>
					<span className="border-r pr-2 font-medium">New</span>
					<span className="text-primary group-hover:underline">
						WhatsApp booking is live
					</span>
					<ArrowUpRightIcon className="size-3 transition-transform ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
				</a>

				<h1 className="relative bg-linear-to-br from-foreground via-foreground/60 to-foreground bg-clip-text text-center font-heading text-transparent">
					<span className="block font-medium text-xl md:text-3xl lg:text-4xl">
						Run your clinic without
					</span>
					<span className="block font-bold text-3xl md:text-4xl lg:text-5xl">
						paper, phones or chaos.
					</span>
				</h1>

				<p className="text-balance text-center text-foreground/80 text-xs md:text-base">
					My Clinics bundles appointments, health records, prescriptions,
					billing and reports into one secure dashboard — while a WhatsApp
					assistant books your patients around the clock.
				</p>

				<div className="flex items-center gap-2 pt-1">
					<Button variant="outline" render={<Link href="/login" />} nativeButton={false}>
						Sign in
					</Button>
					<Button render={<Link href="/signup/clinic" />} nativeButton={false}>
						Get started
						<ArrowUpRightIcon data-icon="inline-end" />
					</Button>
				</div>
			</div>
		</section>
	);
}
