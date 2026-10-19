export const footerBrand = {
	name: "My Clinics",
	tagline:
		"Clinic management, appointments and patient records — everything your clinic needs, in one place.",
} as const;

export type FooterLinkItem = {
	label: string;
	href: string;
	badge?: string;
};

export type FooterColumn = {
	title: string;
	links: FooterLinkItem[];
};

export const footerColumns = {
	product: {
		title: "Product",
		links: [
			{ label: "Book an appointment", href: "/signup/clinic" },
			{ label: "Prescription demo", href: "/rx-demo" },
			{ label: "Clinic login", href: "/login" },
		],
	},
	account: {
		title: "Account",
		links: [
			{ label: "Log in", href: "/login" },
			{ label: "Create clinic account", href: "/signup/clinic", badge: "New" },
		],
	},
	resources: {
		title: "Resources",
		links: [
			{ label: "Sitemap", href: "/sitemap.xml" },
			{ label: "Docs for AI assistants", href: "/llms.txt" },
		],
	},
	legal: {
		title: "Legal",
		links: [
			{ label: "Privacy policy", href: "/privacy" },
			{ label: "Terms of service", href: "/terms" },
		],
	},
} satisfies Record<string, FooterColumn>;

export const footerLegalLinks: FooterLinkItem[] = [
	{ label: "Privacy policy", href: "/privacy" },
	{ label: "Terms of service", href: "/terms" },
];
