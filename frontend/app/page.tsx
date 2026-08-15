import { getDb } from "@/lib/db";
import CloudShaderHeroDemo from "@/components/cloud-shader-hero-demo";
import type { DoctorOption } from "@/components/AppointmentForm";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Book an Appointment",
  description:
    "Book an appointment with a doctor at My Clinics — choose your preferred doctor, department, date and time in under a minute.",
};

export default async function Home() {
  const db = await getDb();
  const doctors = await db
    .collection("users")
    .find({ role: "doctor" }, { projection: { name: 1 } })
    .sort({ name: 1 })
    .toArray();

  const doctorOptions: DoctorOption[] = doctors.map((d) => ({
    id: d._id.toString(),
    name: d.name,
  }));

  return <CloudShaderHeroDemo doctors={doctorOptions} />;
}