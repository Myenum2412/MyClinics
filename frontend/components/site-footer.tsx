import Link from "next/link";
import { CommunityLinks } from "@/components/community-icons";
import { now } from "@/lib/datetime";

const productLinks = [
	{ label: "Home", href: "/" },
	{ label: "Features", href: "/#features" },
	{ label: "FAQs", href: "/#faqs" },
	{ label: "Blog", href: "/blog" },
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
					<div className="mt-2">
						<h4 className="mb-3 text-muted-foreground text-xs tracking-wide">
							Join our community
						</h4>
						<CommunityLinks className="flex items-center gap-3" size={18} />
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
