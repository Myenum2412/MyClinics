import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

export default function InvestigationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Investigation</h1>
        <p className="text-sm text-muted-foreground">Manage lab investigations and diagnostic reports.</p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
        <div className="rounded-full bg-muted p-4">
          <MagnifyingGlassIcon className="size-8 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-sm font-semibold">No investigations yet</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Investigations ordered for patients will appear here. This section is available to clinic and doctor portals only.
        </p>
      </div>
    </div>
  );
}
