import { Toaster } from "@/components/ui/sonner";
import { MedicinesView } from "@/components/medicines-view";
import { getDb } from "@/lib/db";
import { DB_COLLECTIONS } from "@/lib/constants";
import { startOfMonthDate } from "@/lib/stats";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Medicines',
  description: 'Manage the medicine catalog at My Clinics — add, edit and organise medicines for prescriptions.',
};

export const dynamic = "force-dynamic";

export default async function MedicinesPage() {
  const db = await getDb();

  const medicineDocs = await db
    .collection(DB_COLLECTIONS.medicines)
    .find({})
    .sort({ sno: 1, name: 1 })
    .toArray();

  const medicines = medicineDocs.map((m) => ({
    id: m._id.toString(),
    sno: typeof m.sno === "number" ? m.sno : null,
    name: m.name,
    category: m.category ?? null,
    composition: m.composition ?? null,
    dosage: m.dosage ?? null,
    requiresPrescription: m.requiresPrescription === true,
    notes: m.notes ?? null,
    createdAt: m.createdAt,
  }));

  const totalMedicines = medicineDocs.length;
  const monthStart = startOfMonthDate();
  const newThisMonth = medicineDocs.filter(
    (m) => m.createdAt instanceof Date && m.createdAt >= monthStart
  ).length;
  const categories = new Set(
    medicineDocs.map((m) => m.category).filter((c) => typeof c === "string" && c)
  ).size;
  const withNotes = medicineDocs.filter(
    (m) => typeof m.notes === "string" && m.notes
  ).length;

  return (
    <>
      <MedicinesView
        initialMedicines={medicines}
        stats={[
          {
            name: "Total Medicines",
            current: totalMedicines,
            allowed: 30,
            fill: "var(--chart-1)",
          },
          {
            name: "Categories",
            current: categories,
            allowed: 20,
            fill: "var(--chart-2)",
          },
          {
            name: "New This Month",
            current: newThisMonth,
            allowed: Math.max(totalMedicines, 1),
            fill: "var(--chart-3)",
          },
          {
            name: "With Notes",
            current: withNotes,
            allowed: Math.max(totalMedicines, 1),
            fill: "var(--chart-4)",
          },
        ]}
      />
      <Toaster />
    </>
  );
}
