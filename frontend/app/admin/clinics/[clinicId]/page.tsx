import { redirect } from "next/navigation";

export default async function AdminClinicRedirect({
  params,
}: {
  params: Promise<{ clinicId: string }>;
}) {
  const { clinicId } = await params;
  redirect(`/orgmenu/clinics/${clinicId}`);
}
