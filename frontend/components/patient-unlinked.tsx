import { UserRound } from "lucide-react";

export function PatientUnlinked() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <UserRound className="size-6 text-muted-foreground" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-medium">No patient profile found</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Your login email isn&apos;t linked to a patient record yet. Ask the clinic to
          connect your account so your appointments, reports and bills show up here.
        </p>
      </div>
    </div>
  );
}
