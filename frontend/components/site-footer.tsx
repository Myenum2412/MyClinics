import Link from "next/link";
import { now } from "@/lib/datetime";

const productLinks = [
	{ label: "Home", href: "/" },
	{ label: "Features", href: "/#features" },
	{ label: "FAQs", href: "/#faqs" },
	{ label: "Blog", href: "/blog" },
	{ label: "Changelog", href: "/changelog" },
];

const accountLinks = [
	{ label: "Sign in", href: "/login" },
	{ label: "Get started", href: "/signup/clinic" },
];

const legalLinks = [
	{ label: "Privacy", href: "/privacy" },
	{ label: "Terms", href: "/terms" },
];

function LinkColumn({
	title,
	links,
}: {
	title: string;
	links: { label: string; href: string }[];
}) {
	return (
		<div>
			<h4 className="mb-2 text-muted-foreground text-xs tracking-wide">
				{title}
			</h4>
			<ul className="space-y-2 text-sm">
				{links.map((link) => (
					<li key={link.href}>
						<Link
							className="text-muted-foreground/80 transition hover:text-foreground hover:underline"
							href={link.href}
						>
							{link.label}
						</Link>
					</li>
				))}
			</ul>
		</div>
	);
}

const WHATSAPP_CHANNEL_URL = "https://whatsapp.com/channel/0029Vb9076JJ93wXGP5ILx0b";
const DISCORD_INVITE_URL = "https://discord.gg/F9h2CHpnh";

function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
			<path d="M19.11 4.94A9.91 9.91 0 0 0 12.04 2a9.91 9.91 0 0 0-8.6 14.93L2 22l5.2-1.36a9.91 9.91 0 0 0 4.84 1.24h.01a9.91 9.91 0 0 0 7.06-16.94ZM12.04 20.4a8.13 8.13 0 0 1-4.15-1.13l-.3-.18-3.09.81.82-3-.19-.31a8.13 8.13 0 0 1 6.91-12.79 8.13 8.13 0 0 1 5.76 13.88 8.13 8.13 0 0 1-5.76 2.72Zm4.46-6.08c-.25-.12-1.47-.73-1.7-.81s-.39-.12-.56.12-.64.81-.79.97-.29.19-.54.06a6.86 6.86 0 0 1-2-1.23 7.7 7.7 0 0 1-1.42-1.77c-.15-.25 0-.39.11-.51s.25-.29.37-.43a1.7 1.7 0 0 0 .25-.43.48.48 0 0 0-.02-.44c-.06-.12-.56-1.35-.77-1.85s-.4-.43-.56-.44h-.48a.92.92 0 0 0-.66.31 2.78 2.78 0 0 0-.87 2.06 4.83 4.83 0 0 0 1 2.6 11 11 0 0 0 4.24 3.74c.59.26 1.05.41 1.41.53a3.4 3.4 0 0 0 1.56.1c.48-.07 1.47-.6 1.68-1.18a1 1 0 0 0 .07-.68c-.06-.11-.23-.17-.47-.29Z" />
		</svg>
	);
}

function DiscordIcon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
			<path d="M20.317 4.369A19.79 19.79 0 0 0 15.2 2.88a13.5 13.5 0 0 0-.57 1.17 18.1 18.1 0 0 0-5.26 0 13.5 13.5 0 0 0-.58-1.17 19.74 19.74 0 0 0-5.12 1.49 19.94 19.94 0 0 0-3.39 13.49 19.83 19.83 0 0 0 6 3.03 14.1 14.1 0 0 0 1.2-1.96 12.96 12.96 0 0 1-1.9-.93l.4-.31a13.9 13.9 0 0 0 10.54 0l.4.31a12.96 12.96 0 0 1-1.9.93 14.1 14.1 0 0 0 1.2 1.96 19.82 19.82 0 0 0 6-3.03 19.94 19.94 0 0 0-3.39-13.49ZM9.545 15.57c-1.06 0-1.94-.98-1.94-2.18s.86-2.18 1.94-2.18c1.07 0 1.95.98 1.94 2.18s-.87 2.18-1.94 2.18Zm4.91 0c-1.06 0-1.94-.98-1.94-2.18s.86-2.18 1.94-2.18c1.07 0 1.95.98 1.94 2.18s-.87 2.18-1.94 2.18Z" />
		</svg>
	);
}

export function SiteFooter() {
	return (
		<footer className="border-t text-xs md:text-sm">
			<div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10 md:grid-cols-3">
				<div className="flex flex-col pt-1 md:col-span-2">
					<Link className="w-fit rounded-md p-1 hover:bg-muted dark:hover:bg-muted/50" href="/">
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img
							src="/logobg.png"
							alt="My Clinics logo"
							className="size-9 object-contain"
						/>
					</Link>
					<p className="mt-3 mb-6 max-w-[220px] text-muted-foreground">
						Less paperwork. More patients.
					</p>
					<div className="flex items-center gap-3">
						<a
							href={WHATSAPP_CHANNEL_URL}
							target="_blank"
							rel="noopener noreferrer"
							aria-label="Join our WhatsApp Channel"
							title="WhatsApp Channel"
							className="inline-flex size-9 items-center justify-center rounded-full border bg-background text-muted-foreground transition hover:bg-[#25D366] hover:text-white hover:border-[#25D366] hover:shadow-sm"
						>
							<WhatsAppIcon className="size-5" />
						</a>
						<a
							href={DISCORD_INVITE_URL}
							target="_blank"
							rel="noopener noreferrer"
							aria-label="Join our Discord"
							title="Discord"
							className="inline-flex size-9 items-center justify-center rounded-full border bg-background text-muted-foreground transition hover:bg-[#5865F2] hover:text-white hover:border-[#5865F2] hover:shadow-sm"
						>
							<DiscordIcon className="size-5" />
						</a>
					</div>
				</div>

				<div className="grid grid-cols-2 gap-10 md:pr-10">
					<LinkColumn links={productLinks} title="Product" />
					<div className="space-y-10">
						<LinkColumn links={accountLinks} title="Account" />
						<LinkColumn links={legalLinks} title="Legal" />
					</div>
				</div>
			</div>

			<div className="border-t py-4">
				<p className="text-center text-muted-foreground">
					© {now().getFullYear()} My Clinics. All rights reserved.
				</p>
			</div>
		</footer>
	);
}
