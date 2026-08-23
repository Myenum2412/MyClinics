import { PlusIcon } from "lucide-react"

export function HairlineDivider({
	crosshairs = false,
	className = "",
}: {
	crosshairs?: boolean;
	className?: string;
}) {
	return (
		<div
			aria-hidden="true"
			className={`relative left-1/2 z-1 h-px w-screen -translate-x-1/2 bg-border ${className}`}
		>
			{crosshairs && (
				<>
					<span className="absolute top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background xl:flex left-[max(1rem,calc(50%-36rem))]">
						<PlusIcon className="size-3.5 stroke-1 text-muted-foreground" />
					</span>
					<span className="absolute top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background xl:flex left-[min(calc(100%-1rem),calc(50%+36rem))]">
						<PlusIcon className="size-3.5 stroke-1 text-muted-foreground" />
					</span>
				</>
			)}
		</div>
	);
}
