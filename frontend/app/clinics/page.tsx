import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Clinics Directory — MyClinics",
  description: "Browse all active clinics on MyClinics — find by name, city, specialization and book appointments.",
};

function getBackendBase(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ||
    process.env.BACKEND_URL?.replace(/\/+$/, "") ||
    (process.env.NODE_ENV === "production" ? "https://api.myclinic.myenum.in" : "http://localhost:3100")
  );
}

type PublicClinicListItem = {
  clinicId: string;
  slug: string;
  name: string;
  description: string | null;
  website: string | null;
  profile: { city: string | null; state: string | null; clinicType: string | null; specializations: string[] } | null;
};

async function fetchClinics(q?: string): Promise<{ items: PublicClinicListItem[]; total: number }> {
  const base = getBackendBase();
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("limit", "100");
  try {
    const res = await fetch(`${base}/api/public/clinics?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) return { items: [], total: 0 };
    const data = await res.json();
    return { items: data.items ?? [], total: data.total ?? 0 };
  } catch {
    return { items: [], total: 0 };
  }
}

export default async function ClinicsDirectoryPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { items, total } = await fetchClinics(q);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Clinics Directory</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} active {total === 1 ? "clinic" : "clinics"} • every profile is public at <code className="rounded bg-muted px-1 py-0.5 text-xs">/c/[slug]</code>
          </p>
        </div>
        <form action="/clinics" method="get" className="flex w-full max-w-sm items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" defaultValue={q ?? ""} placeholder="Search by name, city, specialization…" className="pl-9" />
          </div>
          <button type="submit" className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
            Search
          </button>
        </form>
      </div>

      {items.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 className="mx-auto size-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">No clinics found{q ? ` for “${q}”` : ""}.</p>
          {q && (
            <Link href="/clinics" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
              Clear search
            </Link>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((clinic) => {
            const cityState = [clinic.profile?.city, clinic.profile?.state].filter(Boolean).join(", ");
            const href = `/c/${encodeURIComponent(clinic.slug || clinic.clinicId)}`;
            return (
              <Link key={clinic.clinicId} href={href} className="group">
                <Card className="h-full overflow-hidden transition hover:shadow-md hover:border-primary/20">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                        {clinic.name.charAt(0).toUpperCase()}
                      </div>
                      {clinic.profile?.clinicType && <Badge variant="outline" className="shrink-0 text-xs">{clinic.profile.clinicType}</Badge>}
                    </div>
                    <h2 className="mt-3 line-clamp-1 text-base font-semibold group-hover:text-primary">{clinic.name}</h2>
                    {cityState && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="size-3.5" /> {cityState}
                      </p>
                    )}
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {clinic.description || "No description provided."}
                    </p>
                    {clinic.profile?.specializations?.length ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {clinic.profile.specializations.slice(0, 3).map((s) => (
                          <Badge key={s} variant="secondary" className="text-[11px]">{s}</Badge>
                        ))}
                        {clinic.profile.specializations.length > 3 && (
                          <Badge variant="secondary" className="text-[11px]">+{clinic.profile.specializations.length - 3}</Badge>
                        )}
                      </div>
                    ) : null}
                    <p className="mt-3 text-xs font-medium text-primary group-hover:underline">View public profile →</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
