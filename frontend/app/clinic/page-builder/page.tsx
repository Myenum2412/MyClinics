"use client";

import { useRequireRole } from "@/hooks/use-clinic-session";
import { GrapesEditor } from "@/components/clinic/page-builder/grapes-editor";
import { Skeleton } from "@/components/ui/skeleton";

export default function PageBuilderPage() {
  const session = useRequireRole("clinic_admin");

  if (!session?.clinicId) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-[620px] w-full rounded-xl" />
      </div>
    );
  }

  return <GrapesEditor clinicId={session.clinicId} />;
}
