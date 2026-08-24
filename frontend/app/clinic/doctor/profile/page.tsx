"use client";

import { useRequireRole } from "@/hooks/use-clinic-session";
import { DoctorProfileView } from "@/components/clinic/doctor-profile-view";
import { Skeleton } from "@/components/ui/skeleton";

export default function DoctorProfilePage() {
  const session = useRequireRole("patient");

  if (!session) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }

  return <DoctorProfileView session={session} />;
}
