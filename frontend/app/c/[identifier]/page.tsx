import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClinicPublicView } from "@/components/clinic/clinic-public-view";
import type { PublicClinic } from "@/lib/clinic-api";

export const dynamic = "force-dynamic";

function getBackendBase(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ||
    process.env.BACKEND_URL?.replace(/\/+$/, "") ||
    (process.env.NODE_ENV === "production" ? "https://api.myclinic.myenum.in" : "http://localhost:3100")
  );
}

async function fetchPublicClinic(identifier: string): Promise<PublicClinic | null> {
  const base = getBackendBase();
  try {
    const res = await fetch(`${base}/api/public/clinics/${encodeURIComponent(identifier)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicClinic;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ identifier: string }> }): Promise<Metadata> {
  const { identifier } = await params;
  const clinic = await fetchPublicClinic(identifier);
  if (!clinic) return { title: "Clinic not found — MyClinics" };
  const cityState = [clinic.profile?.city, clinic.profile?.state].filter(Boolean).join(", ");
  const title = `${clinic.name}${cityState ? ` — ${cityState}` : ""} | MyClinics`;
  const description =
    clinic.description ||
    `${clinic.name} is a ${clinic.profile?.clinicType ?? "clinic"}${cityState ? ` in ${cityState}` : ""}. View address, contact, timings, services and more on MyClinics.`;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://myclinic.myenum.in";
  const slug = clinic.slug || clinic.clinicId;
  const canonical = `${site}/c/${slug}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      siteName: "MyClinics",
    },
  };
}

export default async function PublicClinicPage({ params }: { params: Promise<{ identifier: string }> }) {
  const { identifier } = await params;
  const clinic = await fetchPublicClinic(identifier);
  if (!clinic) notFound();

  const base = getBackendBase();
  const avatarUrl = `${base}/api/public/clinics/${encodeURIComponent(clinic.clinicId)}/avatar`;

  // Structured data for SEO (MedicalOrganization)
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://myclinic.myenum.in";
  const slug = clinic.slug || clinic.clinicId;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    name: clinic.name,
    description: clinic.description ?? undefined,
    url: `${site}/c/${slug}`,
    telephone: clinic.phone ?? clinic.profile?.whatsapp ?? undefined,
    email: clinic.email ?? undefined,
    address: clinic.profile
      ? {
          "@type": "PostalAddress",
          streetAddress: [clinic.profile.addressLine1, clinic.profile.addressLine2].filter(Boolean).join(", ") || undefined,
          addressLocality: clinic.profile.city ?? undefined,
          addressRegion: clinic.profile.state ?? undefined,
          postalCode: clinic.profile.pincode ?? undefined,
          addressCountry: clinic.profile.country ?? "IN",
        }
      : undefined,
    openingHours: clinic.settings?.weeklySchedule
      ? clinic.settings.weeklySchedule.filter((d) => !d.closed).map((d) => `${d.day.slice(0, 2)} ${d.open}-${d.close}`)
      : undefined,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <ClinicPublicView clinic={clinic} avatarUrl={avatarUrl} />
      </main>
    </>
  );
}
