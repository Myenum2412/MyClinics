import { redirect } from "next/navigation";

// Canonical public URL is /c/[identifier]. Keep /clinics/[identifier] as alias for SEO/backlinks.
export default async function ClinicAliasPage({ params }: { params: Promise<{ identifier: string }> }) {
  const { identifier } = await params;
  redirect(`/c/${encodeURIComponent(identifier)}`);
}
