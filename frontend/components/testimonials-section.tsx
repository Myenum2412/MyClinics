import type React from "react";

type TestimonialType = {
	name: string;
	role: string;
	quote: string;
};

function Avatar({ name }: { name: string }) {
	const initials = name
		.replace(/^Dr\.\s*/, "")
		.split(" ")
		.map((w) => w[0])
		.slice(0, 2)
		.join("");
	return (
		<span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground text-xs">
			{initials}
		</span>
	);
}

function TestimonialCard({
	testimonial,
}: {
	testimonial: TestimonialType;
}): React.ReactElement {
	return (
		<figure className="relative flex flex-col overflow-hidden border-b bg-background p-4 last:border-b-0 md:px-5">
			<div className="flex items-center gap-2">
				<Avatar name={testimonial.name} />
				<div className="min-w-0">
					<cite className="block truncate text-sm not-italic">
						{testimonial.name}
					</cite>
					<span className="block truncate text-[11px] tracking-tight text-muted-foreground">
						{testimonial.role}
					</span>
				</div>
			</div>
			<blockquote className="mt-2 flex-1 ps-10 text-foreground/80 text-sm leading-relaxed tracking-wide">
				{testimonial.quote}
			</blockquote>
		</figure>
	);
}

const testimonials: TestimonialType[] = [
	{
		name: "Dr. Anita Sharma",
		role: "Cardiologist",
		quote:
			"My diary, prescriptions and bills finally live in one place. I see ten more patients a day without staying late.",
	},
	{
		name: "Dr. Rahul Verma",
		role: "Orthopaedic surgeon",
		quote:
			"The WhatsApp assistant books patients while we sleep. Front-desk calls dropped by half in the first week.",
	},
	{
		name: "Dr. Meera Patel",
		role: "Paediatrician",
		quote:
			"Parents love getting reminders on WhatsApp. No-shows went from a daily headache to a rare event.",
	},
	{
		name: "Suresh Kumar",
		role: "Clinic manager",
		quote:
			"Revenue reports used to take my evenings. Now today's collections are on my screen before lunch.",
	},
	{
		name: "Dr. Kavita Rao",
		role: "Dermatologist",
		quote:
			"Opening a patient's full history before they even sit down changes the whole consultation.",
	},
	{
		name: "Dr. Arjun Mehta",
		role: "General physician",
		quote:
			"Setup took twenty minutes. No servers, no IT person — it just works.",
	},
	{
		name: "Priya Nair",
		role: "Front desk",
		quote:
			"I stopped juggling three registers. Appointments, walk-ins and payments are all on one screen.",
	},
	{
		name: "Dr. Vikram Shah",
		role: "ENT specialist",
		quote:
			"Patients find us online, book on WhatsApp and arrive with their records ready. It feels like a big-hospital system.",
	},
	{
		name: "Dr. Lakshmi Iyer",
		role: "Gynaecologist",
		quote:
			"Prescriptions are legible, bills look professional, and everything is stored safely.",
	},
	{
		name: "Amit Joshi",
		role: "Owner, 3-clinic group",
		quote:
			"Multi-branch reporting finally makes sense. Each clinic sees only its own data.",
	},
	{
		name: "Dr. Neha Gupta",
		role: "Dentist",
		quote:
			"Follow-ups happen automatically now. Patients actually come back when they're supposed to.",
	},
	{
		name: "Dr. Farhan Ali",
		role: "Physiotherapist",
		quote:
			"Session notes, reports and invoices in one flow — my admin time is nearly zero.",
	},
];

export function TestimonialsSection() {
	return (
		<section aria-label="Testimonials">
			<div className="relative border-b py-12">
				<span
					aria-hidden="true"
					className="absolute inset-x-0 top-0 mx-auto h-12 w-px border-l border-dashed border-border"
				/>
				<h2 className="text-center font-heading font-medium text-4xl text-foreground md:text-5xl">
					Wall of love
				</h2>
			</div>
			<div className="mask-b-from-80% h-105 overflow-hidden">
				<div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
					{testimonials.map((t) => (
						<TestimonialCard key={t.name} testimonial={t} />
					))}
				</div>
			</div>
		</section>
	);
}
