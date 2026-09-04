import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
	{
		value: "faq-account",
		question: "Do I need an account to book an appointment?",
		answer:
			"Yes  a patient account keeps your appointments and records in one place. You can sign in with Google in a single click.",
	},
	{
		value: "faq-whatsapp",
		question: "Can I book through WhatsApp?",
		answer:
			"Absolutely. Message the clinic on WhatsApp at any hour  the assistant checks availability and confirms your slot instantly, even when the front desk is closed.",
	},
	{
		value: "faq-safety",
		question: "Is my health data safe?",
		answer:
			"Your records are encrypted in transit and at rest. Only your clinic's care team can access them  never other clinics, never third parties.",
	},
	{
		value: "faq-cancel",
		question: "What if I need to cancel or reschedule?",
		answer:
			"Cancellations and rescheduling take a couple of taps in your patient account or a quick WhatsApp message. The slot is released automatically for other patients.",
	},
	{
		value: "faq-history",
		question: "Can I see my past prescriptions and reports?",
		answer:
			"Yes. Every prescription and every report your clinic uploads stays in your record  searchable and available whenever you need them.",
	},
	{
		value: "faq-setup",
		question: "Does the clinic need technical staff to set this up?",
		answer:
			"No. Clinics get started in minutes: add doctors, set schedules and share your WhatsApp number. No servers, no IT team, no training workshops.",
	},
];

export function FaqSection() {
	return (
		<section
			className="mx-auto grid w-full grid-cols-1 gap-px bg-border md:min-h-120 md:grid-cols-2"
			id="faqs"
		>
			<div className="bg-background p-8 md:p-12 lg:p-18">
				<div className="space-y-4 md:sticky md:top-24">
					<h2 className="font-heading font-medium text-4xl text-foreground md:text-5xl">
						Frequently asked questions
					</h2>
					<p className="text-muted-foreground text-sm md:text-base">
						<span className="text-foreground">
							Can&apos;t find what you&apos;re looking for?
						</span>{" "}
						Our team is one message away.
					</p>
				</div>
			</div>

			<div className="bg-background py-2 md:py-6">
				<Accordion className="w-full" defaultValue={["faq-account"]}>
					{faqs.map((faq) => (
						<AccordionItem key={faq.value} value={faq.value}>
							<AccordionTrigger className="px-4 py-4 text-sm leading-6 md:px-8">
								{faq.question}
							</AccordionTrigger>
							<AccordionContent className="px-4 pb-4 leading-relaxed text-muted-foreground md:px-8">
								{faq.answer}
							</AccordionContent>
						</AccordionItem>
					))}
				</Accordion>
			</div>
		</section>
	);
}
