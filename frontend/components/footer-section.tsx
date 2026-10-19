import Link from "next/link";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";
import { footerBrand, footerColumns } from "@/lib/footer-data";

const columns = [
	footerColumns.product,
	footerColumns.resources,
	footerColumns.company,
	footerColumns.partner,
] as const;

export function FooterSection() {
	const year = new Date().getFullYear();

	return (
		<footer className="border-t border-blue-900/50 bg-black/60 px-4 py-8 text-white backdrop-blur-sm md:py-12">
			<div className="mx-auto w-full max-w-5xl">
				<div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
					<div className="lg:col-span-1">
						<Link className="inline-flex" href="/" aria-label={footerBrand.name}>
							<Image
								src="/logo-wordmark.png"
								alt={footerBrand.name}
								width={433}
								height={138}
								className="h-8 w-auto"
							/>
						</Link>
						<p className="mt-3 max-w-xs text-pretty text-sm leading-relaxed text-white/60">
							{footerBrand.tagline}
						</p>
					</div>
					{columns.map((column) => (
						<div key={column.title}>
							<p className="text-sm font-medium text-white">{column.title}</p>
							<ul className="mt-4 space-y-2.5">
								{column.links.map((link) => (
									<li key={link.label}>
										<Link
											className="text-sm text-white/60 transition-colors hover:text-blue-400"
											href={link.href}
										>
											{link.label}
										</Link>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>
				<Separator className="my-8 bg-blue-900/60" />
				<p className="text-sm tabular-nums text-white/60">
					© {year} {footerBrand.name}. All rights reserved.
				</p>
			</div>
		</footer>
	);
}
