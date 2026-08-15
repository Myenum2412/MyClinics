import { Toaster } from "@/components/ui/sonner";
import { MedicineFormPage } from "@/components/medicine-form-page";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Add Medicine',
  description: 'Add a new medicine to the My Clinics catalog so it is available for prescriptions.',
};

export const dynamic = "force-dynamic";

export default function NewMedicinePage() {
  return (
    <>
      <MedicineFormPage />
      <Toaster />
    </>
  );
}