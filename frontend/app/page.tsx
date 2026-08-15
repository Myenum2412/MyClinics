import CloudShaderHeroDemo from "@/components/cloud-shader-hero-demo";
import FooterBlock from "@/components/footer-block";
import type { DoctorOption } from "@/components/AppointmentForm";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3100";

export const metadata: Metadata = {
  title: "Book an Appointment",
  description:
    "Book an appointment with a doctor at My Clinics — choose your preferred doctor, department, date and time in under a minute.",
};

export default async function Home() {
  let doctorOptions: DoctorOption[] = [];
  try {
    const res = await fetch(`${BACKEND_URL}/api/doctors/public`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json()) as { doctors?: DoctorOption[] };
      doctorOptions = data.doctors ?? [];
    }
  } catch {
    doctorOptions = [];
  }

  return (
    <>
      <CloudShaderHeroDemo doctors={doctorOptions} />
      <FooterBlock />
    </>
  );
}