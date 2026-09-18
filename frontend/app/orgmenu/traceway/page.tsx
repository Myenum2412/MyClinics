const TRACEWAY_URL = process.env.NEXT_PUBLIC_TRACEWAY_URL || "http://localhost:3001";
export default function TracewayPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[15px] font-semibold tracking-tight">Traceway Observability</h1>
            <p className="mt-1 text-sm text-muted-foreground">Source: https://github.com/tracewayapp/traceway — self-host via docker compose up -d</p>
          </div>
          <a href={TRACEWAY_URL} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center rounded-full bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/90">Open Traceway ↗</a>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <iframe src={TRACEWAY_URL} className="h-[calc(100vh-14rem)] w-full" title="Traceway" />
      </div>
    </div>
  );
}
