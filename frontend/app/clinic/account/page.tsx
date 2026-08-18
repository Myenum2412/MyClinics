"use client";

import { useRequireRole, sessionCan } from "@/hooks/use-clinic-session";
import { ClinicProfile } from "@/components/clinic/clinic-profile";

export default function AccountPage() {
  const session = useRequireRole("staff");
  const clinicId = session?.clinicId ?? "";
  const canEdit = sessionCan(session, "clinic_admin");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">Account</h1>
        <p className="mt-1 text-sm text-gray-500">
          Your clinic profile and contact information
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-1">
        <ClinicProfile clinicId={clinicId} canEdit={canEdit} />
      </div>
    </div>
  );
}