"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftEndOnRectangleIcon } from "@heroicons/react/24/outline";
import { useRequireRole, sessionCan } from "@/hooks/use-clinic-session";
import { ClinicProfile } from "@/components/clinic/clinic-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logout } from "@/lib/clinic-api";

export default function AccountPage() {
  const session = useRequireRole("staff");
  const clinicId = session?.clinicId ?? "";
  const canEdit = sessionCan(session, "clinic_admin");
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/login");
    router.refresh();
  }

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
      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Sign out of this clinic workspace on this device.
          </p>
          <Button variant="destructive" onClick={handleLogout}>
            <ArrowLeftEndOnRectangleIcon className="size-4" />
            Log out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}