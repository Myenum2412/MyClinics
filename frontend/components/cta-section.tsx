import Link from "next/link";

import { Button } from "@/components/ui/button";

export function CtaSection() {
	return (
		<section className="flex w-full flex-col justify-between gap-6 py-16 md:py-24">
			<h2 className="text-center font-heading font-semibold text-lg tracking-wide text-muted-foreground md:text-3xl">
				Less paperwork. More patients.
			</h2>
			<div className="flex items-center justify-center gap-2">
				<Button variant="outline" render={<Link href="/login" />} nativeButton={false}>
					Sign in
				</Button>
				<Button render={<Link href="/signup/clinic" />} nativeButton={false}>
					Get started
				</Button>
			</div>
		</section>
	);
}
