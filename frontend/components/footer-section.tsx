import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { footerBrand, footerColumns } from "@/lib/footer-data";

const columns = [
	footerColumns.product,
	footerColumns.account,
	footerColumns.resources,
	footerColumns.legal,
] as const;

export function FooterSection() {
	const year = new Date().getFullYear();

	return (
		<footer className="border-t border-blue-100 bg-white px-4 py-8 text-black md:py-12">
			<div className="mx-auto w-full max-w-5xl">
				<div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
					<div className="lg:col-span-1">
						<Link className="text-sm font-bold tracking-[-0.04em] text-black" href="/">
							{footerBrand.name}
						</Link>
						<p className="mt-3 max-w-xs text-pretty text-sm leading-relaxed text-black/60">
							{footerBrand.tagline}
						</p>
					</div>
					{columns.map((column) => (
						<div key={column.title}>
							<p className="text-sm font-medium text-black">{column.title}</p>
							<ul className="mt-4 space-y-2.5">
								{column.links.map((link) => (
									<li key={link.label}>
										<Link
											className="text-sm text-black/60 transition-colors hover:text-blue-700"
											href={link.href}
										>
											{link.label}
											{"badge" in link && link.badge ? (
												<span className="ml-1.5 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
													{link.badge}
												</span>
											) : null}
										</Link>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>
				<Separator className="my-8 bg-blue-100" />
				<p className="text-sm tabular-nums text-black/60">
					© {year} {footerBrand.name}. All rights reserved.
				</p>
			</div>
		</footer>
	);
}
