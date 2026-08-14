import { Toaster } from "@/components/ui/sonner";
import { PatientFormPage } from "@/components/patient-form-page";

export const dynamic = "force-dynamic";

export default function NewPatientPage() {
  return (
    <>
      <PatientFormPage />
      <Toaster />
    </>
  );
}