const TRACEWAY_URL = process.env.NEXT_PUBLIC_TRACEWAY_URL || "http://localhost:3001";

export default function TracewayPage() {
  return (
    <div className="flex flex-col gap-4 p-4 h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Traceway Observability</h1>
        <a href={TRACEWAY_URL} target="_blank" rel="noopener noreferrer" className="text-sm underline text-primary">Open Traceway ↗</a>
      </div>
      <p className="text-sm text-muted-foreground">Source: https://github.com/tracewayapp/traceway — self-host via docker compose up -d</p>
      <iframe src={TRACEWAY_URL} className="flex-1 w-full rounded border" title="Traceway" />
    </div>
  );
}
