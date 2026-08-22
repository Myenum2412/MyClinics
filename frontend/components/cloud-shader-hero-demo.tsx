"use client";

import { CloudShader } from "@/components/ui/cloud-shader";
import { AppointmentBookingForm } from "@/components/appointment-booking-form";
import SiteHeader from "@/components/site-header";

export default function CloudShaderHeroDemo() {
  return (
    <div className="relative min-h-[50rem] w-full overflow-hidden">
      <CloudShader
        className="absolute inset-0"
        skyTopColor="#312E81"
        skyBottomColor="#A5B4FC"
        cloudColor="#E0E7FF"
      />

      {/* navbar */}
      <SiteHeader variant="hero" />

      {/* hero */}
      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-4 pt-12 text-center md:pt-20">
        <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-md md:text-6xl lg:text-7xl">
          Healthcare above the clouds
        </h1>
        <p className="mt-6 max-w-2xl text-base text-black md:text-lg">
          My Clinics gives your clinic one secure home for appointments,
          medical records, prescriptions, billing and reports. One clinic, one
          tenant — your data never mixes with anyone else&apos;s.
        </p>
      </div>

      {/* Appointment form */}
      <div className="relative z-10 mx-auto mt-12 w-full px-4 pb-16">
        <AppointmentBookingForm />
      </div>
    </div>
  );
}