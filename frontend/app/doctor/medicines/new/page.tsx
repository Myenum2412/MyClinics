import { Toaster } from "@/components/ui/sonner";
import { MedicineFormPage } from "@/components/medicine-form-page";

export const dynamic = "force-dynamic";

export default function NewMedicinePage() {
  return (
    <>
      <MedicineFormPage />
      <Toaster />
    </>
  );
}