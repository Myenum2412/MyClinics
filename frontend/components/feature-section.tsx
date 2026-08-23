import type React from "react";
import { cn } from "@/lib/utils";
import {
	BellIcon,
	CalendarCheckIcon,
	FileTextIcon,
	LockIcon,
	ReceiptTextIcon,
	UsersIcon,
} from "lucide-react";

type FeatureType = {
	title: string;
	subtitle: string;
	icon: React.ReactNode;
	span?: string;
	illustration: React.ReactNode;
};

export function FeatureSection() {
	return (
		<div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-px bg-border md:grid-cols-2 lg:grid-cols-4">
			{features.map((feature) => (
				<FeatureCard feature={feature} key={feature.title} />
			))}
		</div>
	);
}

function FeatureCard({ feature }: { feature: FeatureType }) {
	return (
		<div
			className={cn(
				"bg-background dark:bg-[radial-gradient(80%_100%_at_49%_0%,--theme(--color-foreground/.04),transparent)]",
				feature.span
			)}
		>
			<div className="relative z-10 p-6">
				<div className="[&_svg]:size-5 [&_svg]:text-primary">{feature.icon}</div>
				<h3 className="mt-4 font-heading font-medium text-foreground text-lg tracking-wide">
					{feature.title}
				</h3>
				<p className="mt-2 text-muted-foreground text-sm leading-relaxed">
					{feature.subtitle}
				</p>
			</div>
			<div className="min-h-48 px-6 pb-6">{feature.illustration}</div>
		</div>
	);
}

const bar = "h-1 rounded-full bg-muted-foreground/20";
const barAccent = "h-1 rounded-full bg-primary/40";

function ChatIllustration() {
	return (
		<div className="flex h-full flex-col justify-end gap-3 pt-8">
			<div className="w-fit max-w-[75%] space-y-1.5 rounded-lg rounded-bl-sm border bg-card p-3 shadow-xs">
				<p className="text-[11px] text-muted-foreground">Can I see Dr. Rao tomorrow?</p>
				<div className={cn(bar, "w-24")} />
			</div>
			<div className="ml-auto w-fit max-w-[75%] space-y-1.5 rounded-lg rounded-br-sm border bg-card p-3 shadow-xs">
				<div className={cn(barAccent, "w-32")} />
				<div className={cn(bar, "w-20")} />
				<span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
					Booked · 10:15
				</span>
			</div>
		</div>
	);
}

function RecordIllustration() {
	return (
		<div className="mx-auto h-full w-full max-w-[220px] space-y-2 rounded-lg border bg-card p-4 shadow-xs">
			<div className="flex items-center gap-2 pb-1">
				<LockIcon className="size-3 text-muted-foreground" />
				<div className={cn(bar, "w-20")} />
			</div>
			<div className={cn(bar, "w-full")} />
			<div className={cn(bar, "w-5/6")} />
			<div className={cn(barAccent, "w-2/3")} />
			<div className={cn(bar, "w-3/4")} />
			<div className="flex items-center justify-between pt-1">
				<span className="rounded-sm border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
					PDF
				</span>
				<div className={cn(bar, "w-12")} />
			</div>
		</div>
	);
}

function BillingIllustration() {
	return (
		<div className="flex h-full items-end justify-center gap-2 pt-10">
			{["35%", "55%", "45%", "80%", "65%", "95%"].map((h, i) => (
				<div
					className={cn(
						"w-6 rounded-t-sm",
						i % 2 === 0 ? "bg-muted-foreground/15" : "bg-primary/30"
					)}
					key={`bar-${h}`}
					style={{ height: h }}
				/>
			))}
		</div>
	);
}

function ReminderIllustration() {
	return (
		<div className="relative flex h-full flex-col justify-center gap-3 pl-7">
			<span
				aria-hidden="true"
				className="absolute top-1/2 bottom-1/2 left-2.5 w-px bg-border"
			/>
			{[
				"Tomorrow · 09:30 — Anita S.",
				"Tomorrow · 11:00 — Rahul V.",
				"Fri · 09:30 — Meera P.",
			].map((t) => (
				<div className="relative flex items-center gap-2" key={t}>
					<span className="absolute -left-[18px] size-2 rounded-full bg-primary/50 ring-4 ring-background" />
					<div className="w-fit rounded-md border bg-card px-2.5 py-1.5 text-[11px] text-muted-foreground shadow-xs">
						{t}
					</div>
				</div>
			))}
		</div>
	);
}

function TeamIllustration() {
	const roles = ["Doctor", "Front desk", "Manager"];
	return (
		<div className="flex h-full items-center justify-center gap-3">
			{roles.map((role) => (
				<div
					className="flex flex-col items-center gap-1.5"
					key={role}
				>
					<span className="flex size-10 items-center justify-center rounded-full bg-card shadow-sm ring-1 ring-border">
						<UsersIcon className="size-4 text-muted-foreground" />
					</span>
					<span className="text-[10px] tracking-wide text-muted-foreground">
						{role}
					</span>
				</div>
			))}
		</div>
	);
}

const features: FeatureType[] = [
	{
		title: "Bookings on autopilot",
		subtitle:
			"Patients message your clinic on WhatsApp any time. The AI assistant checks availability and books the visit — even when the front desk is closed.",
		icon: <CalendarCheckIcon />,
		span: "md:col-span-2",
		illustration: <ChatIllustration />,
	},
	{
		title: "Records without paper",
		subtitle:
			"Prescriptions, reports and full patient history live in one encrypted record you can open in seconds.",
		icon: <FileTextIcon />,
		illustration: <RecordIllustration />,
	},
	{
		title: "Billing minus spreadsheets",
		subtitle:
			"Bills as PDFs, payment tracking and revenue at a glance — no ledgers, no manual math.",
		icon: <ReceiptTextIcon />,
		illustration: <BillingIllustration />,
	},
	{
		title: "Reminders that fill chairs",
		subtitle:
			"Automated WhatsApp reminders go out before every appointment, so no-shows become rare.",
		icon: <BellIcon />,
		illustration: <ReminderIllustration />,
	},
	{
		title: "Built for the whole team",
		subtitle:
			"Doctors, front desk and managers each get secure, role-based access to their own clinic.",
		icon: <UsersIcon />,
		illustration: <TeamIllustration />,
	},
];
