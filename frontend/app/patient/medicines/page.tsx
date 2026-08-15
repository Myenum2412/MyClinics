import { Toaster } from "@/components/ui/sonner";
import {
  PatientMedicines,
  type MedicineCatalogItem,
} from "@/components/patient-medicines";
import { PatientUnlinked } from "@/components/patient-unlinked";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { loadPatientData } from "@/lib/patient";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'My Medicines',
  description: 'View your prescribed medicines and dosage instructions from My Clinics.',
};

export const dynamic = "force-dynamic";

export default async function PatientMedicinesPage() {
  const session = await auth();
  const db = await getDb();
  const data = await loadPatientData(db, session);
  if (!data) return <PatientUnlinked />;

  const medicineDocs = await db
    .collection("medicines")
    .find({})
    .sort({ name: 1 })
    .toArray();

  const catalog: MedicineCatalogItem[] = medicineDocs.map((m) => ({
    id: m._id.toString(),
    name: String(m.name ?? ""),
    category: m.category ? String(m.category) : null,
    notes: m.notes ? String(m.notes) : null,
  }));

  return (
    <>
      <PatientMedicines prescriptions={data.prescriptions} catalog={catalog} />
      <Toaster />
    </>
  );
}
