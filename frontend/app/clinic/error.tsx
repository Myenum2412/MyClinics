"use client";
export default function ClinicError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-lg font-semibold">Couldn’t load clinic dashboard</h2>
      <p className="max-w-md text-sm text-muted-foreground">{error.message || "An unexpected error occurred. Please try again."}</p>
      <button onClick={() => reset()} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Reload</button>
    </div>
  );
}
