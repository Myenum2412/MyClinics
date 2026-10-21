export const footerBrand = {
	name: "My Clinics",
	tagline:
		"Clinic management, appointments and patient records — everything your clinic needs, in one place.",
} as const;

export type FooterLinkItem = {
	label: string;
	href: string;
};

export type FooterColumn = {
	title: string;
	links: FooterLinkItem[];
};

export const footerColumns = {
	product: {
		title: "Product",
		links: [
			{ label: "Home", href: "/" },
			{ label: "Features", href: "/#features" },
			{ label: "Pricing", href: "/pricing" },
			{ label: "Integrations", href: "/integrations" },
			{ label: "Changelog", href: "/changelog" },
		],
	},
	resources: {
		title: "Resources",
		links: [
			{ label: "Blog", href: "/blog" },
			{ label: "Docs", href: "/docs" },
			{ label: "FAQs", href: "/faq" },
			{ label: "Support", href: "#" },
		],
	},
	company: {
		title: "Company",
		links: [
			{ label: "About", href: "#" },
			{ label: "Careers", href: "/careers" },
			{ label: "Contact", href: "/#contact" },
		],
	},
	partner: {
		title: "Partner",
		links: [
			{ label: "Partnerships", href: "/partners" },
			{ label: "Become a Partner", href: "/partners#become-a-partner" },
			{ label: "Integration Partners", href: "/partners#integrations" },
			{ label: "Partner Login", href: "/partners#partner-login" },
		],
	},
} satisfies Record<string, FooterColumn>;

export const footerLegalLinks: FooterLinkItem[] = [
	{ label: "Privacy policy", href: "/privacy" },
	{ label: "Terms of service", href: "/terms" },
];
